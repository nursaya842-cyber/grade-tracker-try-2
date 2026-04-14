"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calculateGpa } from "@/lib/utils";

async function getParentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authorized");
  return { supabase, authUser: user };
}

function serviceRole() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function fetchMyChildren() {
  const { supabase, authUser } = await getParentContext();

  // Get linked student IDs (via RLS — parent sees only their own links)
  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", authUser.id);

  if (!links || links.length === 0) return [];

  const studentIds = links.map((l) => l.student_id);
  const svc = serviceRole();

  // Get student profiles
  const { data: students } = await svc
    .from("users")
    .select("id, full_name, email, course_year, face_photo_url")
    .in("id", studentIds)
    .is("deleted_at", null);

  // Get grades for GPA
  const { data: allGrades } = await svc
    .from("grades")
    .select("student_id, score")
    .in("student_id", studentIds)
    .not("score", "is", null);

  const gradesByStudent = new Map<string, number[]>();
  for (const g of allGrades ?? []) {
    if (g.score == null) continue;
    const arr = gradesByStudent.get(g.student_id) ?? [];
    arr.push(g.score);
    gradesByStudent.set(g.student_id, arr);
  }

  // Get attendance stats
  const { data: allAttendance } = await svc
    .from("attendance")
    .select("student_id, status")
    .in("student_id", studentIds);

  const attByStudent = new Map<string, { total: number; present: number }>();
  for (const a of allAttendance ?? []) {
    const stats = attByStudent.get(a.student_id) ?? { total: 0, present: 0 };
    stats.total++;
    if (a.status === "present") stats.present++;
    attByStudent.set(a.student_id, stats);
  }

  return (students ?? []).map((s) => {
    const scores = gradesByStudent.get(s.id) ?? [];
    const att = attByStudent.get(s.id) ?? { total: 0, present: 0 };
    return {
      ...s,
      gpa: calculateGpa(scores),
      attendancePct: att.total > 0 ? Math.round((att.present / att.total) * 100 * 10) / 10 : 0,
    };
  });
}

export async function fetchChildDetail(childId: string) {
  const { supabase, authUser } = await getParentContext();

  // Verify parent-child link (uses RLS — parent can only see their own links)
  const { data: link } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", authUser.id)
    .eq("student_id", childId)
    .maybeSingle();

  if (!link) return null;

  // Use service role for all data reads — avoids cascading RLS issues on JOINs
  const svc = serviceRole();

  // Profile
  const { data: profile } = await svc
    .from("users")
    .select("id, full_name, email, course_year, face_photo_url, created_at")
    .eq("id", childId)
    .single();

  if (!profile) return null;

  // Grades
  const { data: gradeData } = await svc
    .from("grades")
    .select("score, graded_at, lesson_id, lessons!inner(starts_at, subject_id, subjects!inner(name))")
    .eq("student_id", childId)
    .not("score", "is", null)
    .order("graded_at", { ascending: false })
    .limit(50);

  const scores = (gradeData ?? []).map((g) => g.score).filter((s): s is number => s !== null);

  // Attendance
  const { data: attData } = await svc
    .from("attendance")
    .select("status, marked_at, lesson_id, lessons!inner(starts_at, subjects!inner(name))")
    .eq("student_id", childId)
    .order("marked_at", { ascending: false })
    .limit(50);

  const attTotal = attData?.length ?? 0;
  const attPresent = attData?.filter((a) => a.status === "present").length ?? 0;

  // Schedule (upcoming lessons)
  const { data: enrollments } = await svc
    .from("lesson_students")
    .select("lesson_id, lessons!inner(id, starts_at, ends_at, subject_id, subjects!inner(name), teacher:users!lessons_teacher_id_fkey(full_name))")
    .eq("student_id", childId);

  const lessons = (enrollments ?? []).map((e) => e.lessons);

  // Club memberships
  const { data: clubMemberships } = await svc
    .from("club_members")
    .select("club_id, clubs!inner(name)")
    .eq("student_id", childId);

  // Photo signed URL (use regular client for storage)
  let photoSignedUrl: string | null = null;
  if (profile.face_photo_url) {
    const { data: signed } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(profile.face_photo_url, 3600);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  return {
    profile,
    photoSignedUrl,
    gpa: calculateGpa(scores),
    avgGrade: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
    attendancePct: attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0,
    recentGrades: gradeData ?? [],
    recentAttendance: attData ?? [],
    lessons: lessons ?? [],
    clubs: (clubMemberships ?? []).map((m) => {
      const club = m.clubs as unknown as { name: string };
      return { id: m.club_id, name: club?.name ?? "?" };
    }),
  };
}

export async function changeParentPassword(
  currentPassword: string,
  newPassword: string
) {
  const { supabase, authUser } = await getParentContext();
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
