import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies, getImpersonatedIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import LessonReportForm from "./_components/LessonReportForm";
import LessonViewMode from "./_components/LessonViewMode";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonDetailPage({ params }: Props) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const effectiveId = await getEffectiveUserIdFromCookies(user.id);
  const impersonatedId = await getImpersonatedIdFromCookies();
  const isAdmin = user.user_metadata?.role === "admin";
  const isImpersonating = !!impersonatedId && isAdmin;

  // Fetch lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "*, subjects(name), teacher:users!lessons_teacher_id_fkey(full_name)"
    )
    .eq("id", lessonId)
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null)
    .single();

  if (!lesson) redirect("/teacher/lessons");

  // Fetch enrolled students
  const { data: students } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(full_name, face_photo_url)")
    .eq("lesson_id", lessonId);

  // Fetch existing attendance
  const { data: attendance } = await supabase
    .from("attendance")
    .select("student_id, status, method")
    .eq("lesson_id", lessonId);

  // Fetch existing grades
  const { data: grades } = await supabase
    .from("grades")
    .select("student_id, score")
    .eq("lesson_id", lessonId);

  const isLocked = !!lesson.report_submitted_at;

  const studentList = (students ?? []).map((s) => {
    const u = s.users as unknown as {
      full_name: string;
      face_photo_url: string | null;
    };
    const att = (attendance ?? []).find((a) => a.student_id === s.student_id);
    const gr = (grades ?? []).find((g) => g.student_id === s.student_id);
    return {
      studentId: s.student_id,
      fullName: u.full_name,
      facePhotoUrl: u.face_photo_url,
      status: (att?.status ?? null) as "present" | "absent" | null,
      method: (att?.method ?? null) as "manual" | "face_id" | null,
      score: gr?.score ?? null,
    };
  });

  const subjectName =
    (lesson.subjects as unknown as { name: string })?.name ?? "—";
  const teacherName =
    (lesson.teacher as unknown as { full_name: string })?.full_name ?? "—";

  if (isLocked) {
    return (
      <LessonViewMode
        lessonId={lessonId}
        subjectName={subjectName}
        teacherName={teacherName}
        startsAt={lesson.starts_at}
        endsAt={lesson.ends_at}
        students={studentList}
        canUnlock={isImpersonating}
      />
    );
  }

  return (
    <LessonReportForm
      lessonId={lessonId}
      subjectName={subjectName}
      teacherName={teacherName}
      startsAt={lesson.starts_at}
      endsAt={lesson.ends_at}
      students={studentList}
    />
  );
}
