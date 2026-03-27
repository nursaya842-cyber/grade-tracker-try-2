"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";

// ─── Helper ────────────────────────────────────────────────
async function getStudentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);
  return { supabase, effectiveId, authUser: user };
}

// ─── Schedule: fetch lessons + events ──────────────────────
export async function fetchStudentSchedule(start: string, end: string) {
  const { supabase, effectiveId } = await getStudentContext();

  // Lessons via lesson_students
  const { data: enrollments } = await supabase
    .from("lesson_students")
    .select(
      "lesson_id, lessons!inner(id, subject_id, teacher_id, starts_at, ends_at, report_submitted_at, deleted_at, subjects(name), teacher:users!lessons_teacher_id_fkey(full_name))"
    )
    .eq("student_id", effectiveId)
    .is("lessons.deleted_at", null)
    .gte("lessons.starts_at", start)
    .lte("lessons.starts_at", end);

  const lessons = (enrollments ?? []).map((e) => {
    const l = e.lessons as unknown as {
      id: string;
      subject_id: string;
      teacher_id: string;
      starts_at: string;
      ends_at: string;
      report_submitted_at: string | null;
      subjects: { name: string };
      teacher: { full_name: string } | null;
    };
    return {
      id: l.id,
      type: "lesson" as const,
      title: l.subjects?.name ?? "Урок",
      teacherName: l.teacher?.full_name ?? "—",
      startsAt: l.starts_at,
      endsAt: l.ends_at,
      reportSubmitted: !!l.report_submitted_at,
    };
  });

  // Events via event_signups
  const { data: signups } = await supabase
    .from("event_signups")
    .select(
      "announcement_id, club_announcements!inner(id, title, venue, starts_at, ends_at, deleted_at, club_id, clubs(name))"
    )
    .eq("student_id", effectiveId)
    .is("club_announcements.deleted_at", null)
    .gte("club_announcements.starts_at", start)
    .lte("club_announcements.starts_at", end);

  const events = (signups ?? []).map((s) => {
    const a = s.club_announcements as unknown as {
      id: string;
      title: string;
      venue: string | null;
      starts_at: string;
      ends_at: string;
      club_id: string;
      clubs: { name: string };
    };
    return {
      id: a.id,
      type: "event" as const,
      title: `${a.clubs?.name ?? "Клуб"}: ${a.title}`,
      venue: a.venue,
      clubName: a.clubs?.name ?? "—",
      startsAt: a.starts_at,
      endsAt: a.ends_at,
    };
  });

  return { lessons, events };
}

// ─── Lesson detail for student (read-only) ─────────────────
export async function fetchStudentLessonDetail(lessonId: string) {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, starts_at, ends_at, report_submitted_at, subjects(name), teacher:users!lessons_teacher_id_fkey(full_name)"
    )
    .eq("id", lessonId)
    .is("deleted_at", null)
    .single();

  if (!lesson) return null;

  // Only show grade/attendance if report submitted
  let attendance: { status: string; method: string | null } | null = null;
  let grade: { score: number | null } | null = null;

  if (lesson.report_submitted_at) {
    const { data: att } = await supabase
      .from("attendance")
      .select("status, method")
      .eq("lesson_id", lessonId)
      .eq("student_id", effectiveId)
      .maybeSingle();
    attendance = att;

    const { data: gr } = await supabase
      .from("grades")
      .select("score")
      .eq("lesson_id", lessonId)
      .eq("student_id", effectiveId)
      .maybeSingle();
    grade = gr;
  }

  return {
    lesson,
    attendance,
    grade,
  };
}

// ─── Cancel event signup ───────────────────────────────────
export async function cancelEventSignup(announcementId: string) {
  const { supabase, effectiveId } = await getStudentContext();

  const { error } = await supabase
    .from("event_signups")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("student_id", effectiveId);

  if (error) return { error: error.message };

  revalidatePath("/student/schedule");
  revalidatePath("/student/announcements");
  return { error: null };
}

// ─── Toggle signup for announcement ────────────────────────
export async function toggleSignup(announcementId: string) {
  const { supabase, effectiveId } = await getStudentContext();

  // Check if already signed up
  const { data: existing } = await supabase
    .from("event_signups")
    .select("announcement_id")
    .eq("announcement_id", announcementId)
    .eq("student_id", effectiveId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("event_signups")
      .delete()
      .eq("announcement_id", announcementId)
      .eq("student_id", effectiveId);
    if (error) return { error: error.message, signedUp: true };
    revalidatePath("/student/schedule");
    revalidatePath("/student/announcements");
    return { error: null, signedUp: false };
  } else {
    const { error } = await supabase.from("event_signups").insert({
      announcement_id: announcementId,
      student_id: effectiveId,
    });
    if (error) return { error: error.message, signedUp: false };
    revalidatePath("/student/schedule");
    revalidatePath("/student/announcements");
    return { error: null, signedUp: true };
  }
}

// ─── My Clubs ──────────────────────────────────────────────
export async function fetchMyClubs() {
  const { supabase, effectiveId } = await getStudentContext();

  const { data } = await supabase
    .from("club_members")
    .select(
      "club_id, clubs!inner(id, name, head_student_id, deleted_at, head:users!clubs_head_student_id_fkey(full_name))"
    )
    .eq("student_id", effectiveId)
    .is("clubs.deleted_at", null);

  return (data ?? []).map((m) => {
    const c = m.clubs as unknown as {
      id: string;
      name: string;
      head_student_id: string | null;
      head: { full_name: string } | null;
    };
    return {
      id: c.id,
      name: c.name,
      headName: c.head?.full_name ?? "—",
    };
  });
}

// ─── My Club (head) ────────────────────────────────────────
export async function fetchMyClubHead() {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("head_student_id", effectiveId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!club) return null;

  // Members
  const { data: members } = await supabase
    .from("club_members")
    .select("student_id, users!inner(id, full_name, phone, face_photo_url)")
    .eq("club_id", club.id);

  // Announcements
  const { data: announcements } = await supabase
    .from("club_announcements")
    .select("*, signups:event_signups(student_id, users!inner(full_name))")
    .eq("club_id", club.id)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });

  return {
    club,
    members: (members ?? []).map((m) => {
      const u = m.users as unknown as {
        id: string;
        full_name: string;
        phone: string;
        face_photo_url: string | null;
      };
      return { ...u, studentId: m.student_id };
    }),
    announcements: announcements ?? [],
  };
}

// ─── Club head: add/remove member ──────────────────────────
export async function addClubMember(clubId: string, studentId: string) {
  const { supabase, effectiveId } = await getStudentContext();

  // Verify caller is head
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("head_student_id", effectiveId)
    .single();

  if (!club) return { error: "Нет доступа" };

  const { error } = await supabase
    .from("club_members")
    .insert({ club_id: clubId, student_id: studentId });

  if (error) return { error: error.message };
  revalidatePath("/student/my-club");
  return { error: null };
}

export async function removeClubMember(clubId: string, studentId: string) {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("head_student_id", effectiveId)
    .single();

  if (!club) return { error: "Нет доступа" };

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("student_id", studentId);

  if (error) return { error: error.message };
  revalidatePath("/student/my-club");
  return { error: null };
}

// ─── Club head: CRUD announcements ─────────────────────────
interface AnnouncementInput {
  title: string;
  description: string | null;
  photoUrl: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string;
}

export async function createClubAnnouncement(
  clubId: string,
  input: AnnouncementInput
) {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("head_student_id", effectiveId)
    .single();

  if (!club) return { error: "Нет доступа" };

  const { error } = await supabase.from("club_announcements").insert({
    club_id: clubId,
    title: input.title,
    description: input.description,
    photo_url: input.photoUrl,
    venue: input.venue,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  });

  if (error) return { error: error.message };
  revalidatePath("/student/my-club");
  revalidatePath("/student/announcements");
  return { error: null };
}

export async function deleteClubAnnouncement(announcementId: string) {
  const { supabase } = await getStudentContext();

  const { error } = await supabase
    .from("club_announcements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) return { error: error.message };
  revalidatePath("/student/my-club");
  revalidatePath("/student/announcements");
  return { error: null };
}

// ─── Announcements list (all clubs) ────────────────────────
export async function fetchAllAnnouncements() {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: announcements } = await supabase
    .from("club_announcements")
    .select(
      "id, title, description, venue, starts_at, ends_at, photo_url, club_id, clubs(name), signups:event_signups(student_id)"
    )
    .is("deleted_at", null)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  return (announcements ?? []).map((a) => {
    const club = a.clubs as unknown as { name: string };
    const signups = a.signups as unknown as { student_id: string }[];
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      venue: a.venue,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      photoUrl: a.photo_url,
      clubName: club?.name ?? "—",
      signupCount: signups?.length ?? 0,
      isSignedUp: signups?.some((s) => s.student_id === effectiveId) ?? false,
    };
  });
}

// ─── Student profile data + mini-stats ─────────────────────
export async function fetchStudentProfile() {
  const { supabase, effectiveId } = await getStudentContext();

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, phone, course_year, face_photo_url, created_at")
    .eq("id", effectiveId)
    .single();

  // Average grade
  const { data: gradeData } = await supabase
    .from("grades")
    .select("score")
    .eq("student_id", effectiveId)
    .not("score", "is", null);

  const scores = (gradeData ?? [])
    .map((g) => g.score)
    .filter((s): s is number => s !== null);
  const avgGrade =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
        10
      : 0;

  // Attendance rate
  const { data: attData } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", effectiveId);

  const attTotal = attData?.length ?? 0;
  const attPresent =
    attData?.filter((a) => a.status === "present").length ?? 0;
  const attendancePct =
    attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0;

  // Event signups count
  const { count: signupCount } = await supabase
    .from("event_signups")
    .select("*", { count: "exact", head: true })
    .eq("student_id", effectiveId);

  // Photo signed URL
  let photoSignedUrl: string | null = null;
  if (profile?.face_photo_url) {
    const { data: signed } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(profile.face_photo_url, 3600);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  return {
    profile,
    photoSignedUrl,
    stats: {
      avgGrade,
      attendancePct,
      signupCount: signupCount ?? 0,
    },
  };
}

// ─── Change password (shared pattern) ──────────────────────
export async function changeStudentPassword(
  currentPassword: string,
  newPassword: string
) {
  const { supabase, authUser } = await getStudentContext();

  const email = authUser.email;
  if (!email) return { error: "Email не найден" };

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInErr) return { error: "Неверный текущий пароль" };

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) return { error: updateErr.message };

  return { error: null };
}

// ─── Fetch all students (for club head "add member" select) ─
export async function fetchAvailableStudents(clubId: string) {
  const { supabase } = await getStudentContext();

  // Get current members
  const { data: members } = await supabase
    .from("club_members")
    .select("student_id")
    .eq("club_id", clubId);

  const memberIds = new Set((members ?? []).map((m) => m.student_id));

  // All active students
  const { data: students } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name");

  return (students ?? []).filter((s) => !memberIds.has(s.id));
}
