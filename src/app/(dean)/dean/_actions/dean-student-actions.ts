"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calculateGpa, scoreToLetter } from "@/lib/utils";
import { calculateEngagement } from "@/lib/engagement";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function fetchStudentFullProfileForDean(studentId: string) {
  const service = svc();

  // Profile
  const { data: profile } = await service
    .from("users")
    .select("id, full_name, email, course_year, face_photo_url, created_at")
    .eq("id", studentId)
    .single();

  if (!profile) return null;

  // Signed photo URL
  let photoSignedUrl: string | null = null;
  if (profile.face_photo_url) {
    const { data: signed } = await service.storage
      .from("student-photos")
      .createSignedUrl(profile.face_photo_url as string, 3600);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  // All grades across all lessons/subjects
  const { data: gradesRaw } = await service
    .from("grades")
    .select("score, graded_at, lessons!inner(subject_id, starts_at, subjects(name))")
    .eq("student_id", studentId)
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

  // All attendance across all lessons
  const { data: attRaw } = await service
    .from("attendance")
    .select("status, marked_at, lessons!inner(subject_id, starts_at, subjects(name), deleted_at)")
    .eq("student_id", studentId)
    .is("lessons.deleted_at", null)
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
  const avgGrade =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  // Grade by subject (for chart)
  const subjectGradeMap = new Map<
    string,
    { name: string; scores: { score: number; date: string }[] }
  >();
  for (const g of grades) {
    const entry = subjectGradeMap.get(g.subjectId) ?? { name: g.subjectName, scores: [] };
    entry.scores.push({ score: g.score, date: g.graded_at });
    subjectGradeMap.set(g.subjectId, entry);
  }
  const subjectGrades = Array.from(subjectGradeMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    scores: v.scores,
  }));

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

  // Event signups
  const { count: signupCount } = await service
    .from("event_signups")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Check-ins
  const { data: checkins } = await service
    .from("student_checkins")
    .select(
      "week_start, stress_level, motivation_level, workload_feeling, understanding, satisfaction, notes, ai_summary"
    )
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(4);

  let checkinAvg: number | null = null;
  if (checkins && checkins.length > 0) {
    let total = 0;
    for (const c of checkins) {
      total +=
        ((10 - c.stress_level) +
          c.motivation_level +
          (10 - c.workload_feeling) +
          c.understanding +
          c.satisfaction) /
        5;
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
    attendancePct * 0.4 +
      (gpa / 4.0) * 100 * 0.4 +
      Math.min((signupCount ?? 0) / 5, 1) * 100 * 0.2
  );

  // Recommendations
  const { data: recsRaw } = await service
    .from("recommendations")
    .select(
      "id, rule_id, category, next_action, priority_score, title, action, expected_effect, deadline"
    )
    .eq("user_id", studentId)
    .is("resolved_at", null)
    .is("dismissed_at", null)
    .order("priority_score", { ascending: false })
    .limit(3);

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
