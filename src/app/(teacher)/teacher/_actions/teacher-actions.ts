"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";
import { calculateGpa, scoreToLetter } from "@/lib/utils";
import { calculateEngagement } from "@/lib/engagement";

function serviceRole() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Helpers ───────────────────────────────────────────────
async function getTeacherId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);
  return { supabase, effectiveId, authUser: user };
}

// ─── Fetch teacher's lessons for calendar ──────────────────
export async function fetchTeacherLessons(start: string, end: string) {
  const { supabase, effectiveId } = await getTeacherId();

  const { data } = await supabase
    .from("lessons")
    .select(
      "id, subject_id, starts_at, ends_at, report_submitted_at, series_id, subjects(name, id)"
    )
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .order("starts_at");

  return data ?? [];
}

// ─── Fetch lesson detail with students, attendance, grades ─
export async function fetchLessonDetail(lessonId: string) {
  const { supabase, effectiveId } = await getTeacherId();

  // Lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "*, subjects(name), teacher:users!lessons_teacher_id_fkey(full_name)"
    )
    .eq("id", lessonId)
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null)
    .single();

  if (!lesson) return { lesson: null, students: [], attendance: [], grades: [] };

  // Enrolled students
  const { data: students } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(full_name, face_photo_url)")
    .eq("lesson_id", lessonId);

  // Existing attendance
  const { data: attendance } = await supabase
    .from("attendance")
    .select("student_id, status, method")
    .eq("lesson_id", lessonId);

  // Existing grades
  const { data: grades } = await supabase
    .from("grades")
    .select("student_id, score")
    .eq("lesson_id", lessonId);

  return {
    lesson,
    students: students ?? [],
    attendance: attendance ?? [],
    grades: grades ?? [],
  };
}

// ─── Submit lesson report (attendance + grades + lock) ─────
interface ReportEntry {
  studentId: string;
  status: "present" | "absent";
  method?: "manual" | "face_id";
  score: number | null; // null = N/A
}

export async function submitLessonReport(
  lessonId: string,
  entries: ReportEntry[]
) {
  const { supabase, effectiveId } = await getTeacherId();

  // Verify teacher owns this lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, teacher_id, report_submitted_at")
    .eq("id", lessonId)
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null)
    .single();

  if (!lesson) return { error: "Lesson not found or access denied" };
  if (lesson.report_submitted_at) return { error: "Report already locked" };

  // Upsert attendance
  const attendanceRows = entries.map((e) => ({
    lesson_id: lessonId,
    student_id: e.studentId,
    status: e.status,
    method: e.method ?? "manual",
    marked_at: new Date().toISOString(),
  }));

  for (const row of attendanceRows) {
    const { error } = await supabase.from("attendance").upsert(row, {
      onConflict: "lesson_id,student_id",
    });
    if (error) return { error: `Attendance error: ${error.message}` };
  }

  // Upsert grades
  const gradeRows = entries.map((e) => ({
    lesson_id: lessonId,
    student_id: e.studentId,
    score: e.score,
    graded_at: new Date().toISOString(),
  }));

  for (const row of gradeRows) {
    const { error } = await supabase.from("grades").upsert(row, {
      onConflict: "lesson_id,student_id",
    });
    if (error) return { error: `Grades error: ${error.message}` };
  }

  // Lock the report
  const { error: lockErr } = await supabase
    .from("lessons")
    .update({ report_submitted_at: new Date().toISOString() })
    .eq("id", lessonId);

  if (lockErr) return { error: `Lock error: ${lockErr.message}` };

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${lessonId}`);
  return { error: null };
}

// ─── Unlock report (admin impersonation only) ──────────────
export async function unlockLessonReport(lessonId: string) {
  const { supabase, authUser } = await getTeacherId();

  // Only real admin can unlock
  const realRole = authUser.user_metadata?.role;
  if (realRole !== "admin") return { error: "Only admin can unlock the report" };

  const { error } = await supabase
    .from("lessons")
    .update({ report_submitted_at: null })
    .eq("id", lessonId);

  if (error) return { error: error.message };

  // Audit log
  await supabase.from("audit_log").insert({
    actor_id: authUser.id,
    action: "UPDATE",
    table_name: "lessons",
    record_id: lessonId,
    payload: { action: "unlock_report", lesson_id: lessonId },
  });

  revalidatePath(`/teacher/lessons/${lessonId}`);
  return { error: null };
}

// ─── Fetch teacher's distinct students ─────────────────────
export async function fetchTeacherStudents() {
  const { supabase, effectiveId } = await getTeacherId();

  // Get all lessons for this teacher
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  // Get distinct students from lesson_students
  const { data: enrollments } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(id, full_name, email, face_photo_url, course_year)")
    .in("lesson_id", lessonIds);

  if (!enrollments) return [];

  // Deduplicate by student_id
  const seen = new Set<string>();
  const students: Array<{
    id: string;
    full_name: string;
    email: string;
    face_photo_url: string | null;
    course_year: number | null;
  }> = [];

  for (const e of enrollments) {
    if (!seen.has(e.student_id)) {
      seen.add(e.student_id);
      const u = e.users as unknown as {
        id: string;
        full_name: string;
        email: string;
        face_photo_url: string | null;
        course_year: number | null;
      };
      students.push(u);
    }
  }

  return students;
}

// ─── Student performance for teacher (grades over time) ────
export async function fetchStudentPerformance(studentId: string) {
  const { supabase, effectiveId } = await getTeacherId();

  // Subjects this teacher teaches to this student
  const { data: rawSubjects } = await supabase
    .from("lessons")
    .select("subject_id, subjects(id, name)")
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null);

  if (!rawSubjects) return { subjects: [], grades: [] };

  const subjectMap = new Map<string, string>();
  for (const l of rawSubjects) {
    const s = l.subjects as unknown as { id: string; name: string };
    if (s && !subjectMap.has(s.id)) subjectMap.set(s.id, s.name);
  }

  const subjects = Array.from(subjectMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Grades for this student across teacher's lessons
  const { data: grades } = await supabase
    .from("grades")
    .select("score, graded_at, lesson_id, lessons!inner(subject_id, teacher_id, starts_at)")
    .eq("student_id", studentId)
    .eq("lessons.teacher_id", effectiveId)
    .order("graded_at", { ascending: true });

  return { subjects, grades: grades ?? [] };
}

// ─── Student attendance for teacher's lessons ──────────────
export async function fetchStudentAttendance(studentId: string) {
  const { supabase, effectiveId } = await getTeacherId();

  const { data } = await supabase
    .from("attendance")
    .select(
      "status, method, marked_at, lesson_id, lessons!inner(subject_id, teacher_id, starts_at, subjects(name))"
    )
    .eq("student_id", studentId)
    .eq("lessons.teacher_id", effectiveId)
    .order("marked_at", { ascending: false });

  const records = data ?? [];
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const pct = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;

  return { records, total, present, pct };
}

// ─── Teacher profile data ──────────────────────────────────
export async function fetchTeacherProfile() {
  const { supabase, effectiveId } = await getTeacherId();

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, diploma_url, created_at")
    .eq("id", effectiveId)
    .single();

  // Get signed URL for diploma if exists
  let diplomaSignedUrl: string | null = null;
  if (data?.diploma_url) {
    const { data: signed } = await supabase.storage
      .from("diplomas")
      .createSignedUrl(data.diploma_url, 3600);
    diplomaSignedUrl = signed?.signedUrl ?? null;
  }

  return { profile: data, diplomaSignedUrl };
}

// ─── Change password ───────────────────────────────────────
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const { supabase, authUser } = await getTeacherId();

  // Re-authenticate
  const email = authUser.email;
  if (!email) return { error: "Email not found" };

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInErr) return { error: "Incorrect current password" };

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) return { error: updateErr.message };

  return { error: null };
}

// ─── Face-ID: get signed URLs + threshold for lesson ───────
export async function fetchFaceIdData(lessonId: string) {
  const { supabase } = await getTeacherId();

  // Get enrolled students with photos
  const { data: students } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(id, full_name, face_photo_url)")
    .eq("lesson_id", lessonId);

  const signedUrls: Record<string, string> = {};
  const studentList: Array<{
    studentId: string;
    fullName: string;
    facePhotoUrl: string | null;
  }> = [];

  for (const s of students ?? []) {
    const u = s.users as unknown as {
      id: string;
      full_name: string;
      face_photo_url: string | null;
    };
    studentList.push({
      studentId: s.student_id,
      fullName: u.full_name,
      facePhotoUrl: u.face_photo_url,
    });

    if (u.face_photo_url) {
      const { data: signed } = await supabase.storage
        .from("student-photos")
        .createSignedUrl(u.face_photo_url, 3600);
      if (signed?.signedUrl) {
        signedUrls[s.student_id] = signed.signedUrl;
      }
    }
  }

  // Threshold from app_config
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "face_match_threshold")
    .maybeSingle();

  const threshold = config?.value ? parseFloat(config.value) : 0.6;

  return { students: studentList, signedUrls, threshold };
}

// ─── Full student profile for teacher drawer ───────────────
export async function fetchStudentFullProfile(studentId: string) {
  const { supabase, effectiveId } = await getTeacherId();
  const svc = serviceRole();

  // Profile
  const { data: profile } = await svc
    .from("users")
    .select("id, full_name, email, course_year, face_photo_url, created_at")
    .eq("id", studentId)
    .single();

  if (!profile) return null;

  // Signed photo URL
  let photoSignedUrl: string | null = null;
  if (profile.face_photo_url) {
    const { data: signed } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(profile.face_photo_url, 3600);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  // All grades for this student in teacher's lessons
  const { data: gradesRaw } = await supabase
    .from("grades")
    .select("score, graded_at, lessons!inner(subject_id, teacher_id, starts_at, subjects(name))")
    .eq("student_id", studentId)
    .eq("lessons.teacher_id", effectiveId)
    .not("score", "is", null)
    .order("graded_at", { ascending: true });

  const grades = (gradesRaw ?? []).map((g) => {
    const lesson = g.lessons as unknown as {
      subject_id: string;
      starts_at: string;
      subjects: { name: string } | null;
    };
    return {
      score: g.score as number,
      graded_at: g.graded_at as string,
      subjectId: lesson.subject_id,
      subjectName: lesson.subjects?.name ?? "—",
      starts_at: lesson.starts_at,
    };
  });

  // Attendance in teacher's lessons
  const { data: attRaw } = await supabase
    .from("attendance")
    .select("status, marked_at, lessons!inner(subject_id, teacher_id, starts_at, subjects(name))")
    .eq("student_id", studentId)
    .eq("lessons.teacher_id", effectiveId)
    .order("marked_at", { ascending: false });

  const attendance = (attRaw ?? []).map((a) => {
    const lesson = a.lessons as unknown as {
      subject_id: string;
      starts_at: string;
      subjects: { name: string } | null;
    };
    return {
      status: a.status as "present" | "absent",
      marked_at: a.marked_at as string,
      subjectId: lesson.subject_id,
      subjectName: lesson.subjects?.name ?? "—",
      starts_at: lesson.starts_at,
    };
  });

  const attTotal = attendance.length;
  const attPresent = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0;

  // GPA & avg
  const scores = grades.map((g) => g.score);
  const gpa = calculateGpa(scores);
  const avgGrade = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  // Grade by subject (for chart)
  const subjectGradeMap = new Map<string, { name: string; scores: { score: number; date: string }[] }>();
  for (const g of grades) {
    const entry = subjectGradeMap.get(g.subjectId) ?? { name: g.subjectName, scores: [] };
    entry.scores.push({ score: g.score, date: g.graded_at });
    subjectGradeMap.set(g.subjectId, entry);
  }
  const subjectGrades = Array.from(subjectGradeMap.entries()).map(([id, v]) => ({ id, name: v.name, scores: v.scores }));

  // Attendance by subject
  const subjectAttMap = new Map<string, { name: string; total: number; present: number }>();
  for (const a of attendance) {
    const entry = subjectAttMap.get(a.subjectId) ?? { name: a.subjectName, total: 0, present: 0 };
    entry.total++;
    if (a.status === "present") entry.present++;
    subjectAttMap.set(a.subjectId, entry);
  }
  const subjectAttendance = Array.from(subjectAttMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    total: v.total,
    present: v.present,
    pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  // Event signups count (global, not filtered by teacher)
  const { count: signupCount } = await svc
    .from("event_signups")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Latest check-in
  const { data: checkins } = await svc
    .from("student_checkins")
    .select("week_start, stress_level, motivation_level, workload_feeling, understanding, satisfaction, notes, ai_summary")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(4);

  let checkinAvg: number | null = null;
  if (checkins && checkins.length > 0) {
    let total = 0;
    for (const c of checkins) {
      total += ((10 - c.stress_level) + c.motivation_level + (10 - c.workload_feeling) + c.understanding + c.satisfaction) / 5;
    }
    checkinAvg = Math.round((total / checkins.length) * 10) / 10;
  }

  // Engagement
  const engagement = calculateEngagement({
    attendancePct,
    gpa,
    eventSignups: signupCount ?? 0,
    checkinAvg,
  });

  // Academic health score
  const academicHealth = Math.round(
    attendancePct * 0.4 + (gpa / 4.0) * 100 * 0.4 + Math.min((signupCount ?? 0) / 5, 1) * 100 * 0.2
  );

  // Active recommendations (service role bypasses RLS)
  const { data: recsRaw } = await svc
    .from("recommendations")
    .select("id, rule_id, category, next_action, priority_score, title, action, expected_effect, deadline")
    .eq("user_id", studentId)
    .is("resolved_at", null)
    .is("dismissed_at", null)
    .order("priority_score", { ascending: false })
    .limit(3);

  // Latest grade with letter
  const latestGrade = grades.length > 0 ? grades[grades.length - 1].score : null;
  const latestGradeLetter = latestGrade !== null ? scoreToLetter(latestGrade) : null;

  return {
    profile,
    photoSignedUrl,
    stats: {
      avgGrade,
      gpa,
      attendancePct,
      signupCount: signupCount ?? 0,
      engagement,
      academicHealth,
      latestGrade,
      latestGradeLetter,
    },
    subjectGrades,
    subjectAttendance,
    checkins: checkins ?? [],
    checkinAvg,
    recommendations: (recsRaw ?? []) as Array<{
      id: string;
      rule_id: string;
      category: "academic" | "social" | "admin";
      next_action: string;
      priority_score: number;
      title: string | null;
      action: string | null;
      expected_effect: string | null;
      deadline: string | null;
    }>,
  };
}
