import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import TeacherStudentsClient from "./_components/TeacherStudentsClient";

export default async function TeacherStudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  // Get all lessons for this teacher
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null);

  if (!lessons || lessons.length === 0) {
    return <TeacherStudentsClient students={[]} />;
  }

  const lessonIds = lessons.map((l) => l.id);

  // Get distinct students
  const { data: enrollments } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(id, full_name, email, face_photo_url, course_year)")
    .in("lesson_id", lessonIds);

  const seen = new Set<string>();
  const students: Array<{
    id: string;
    full_name: string;
    email: string;
    face_photo_url: string | null;
    course_year: number | null;
  }> = [];

  for (const e of enrollments ?? []) {
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

  return <TeacherStudentsClient students={students} />;
}
