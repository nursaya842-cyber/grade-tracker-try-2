import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import TeacherStudentsClient from "./_components/TeacherStudentsClient";

const PAGE_SIZE = 20;

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const search = params.search ?? "";

  // Step 1: Get unique student IDs for this teacher (all of them)
  const { data: enrollments } = await supabase
    .from("lesson_students")
    .select("student_id, lessons!inner(teacher_id, deleted_at)")
    .eq("lessons.teacher_id", effectiveId)
    .is("lessons.deleted_at", null);

  const uniqueStudentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];

  if (uniqueStudentIds.length === 0) {
    return (
      <TeacherStudentsClient
        students={[]}
        total={0}
        page={1}
        pageSize={PAGE_SIZE}
        search={search}
      />
    );
  }

  // Step 2: Paginated + searchable query on users
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("users")
    .select("id, full_name, email, face_photo_url, course_year", { count: "exact" })
    .in("id", uniqueStudentIds)
    .order("full_name")
    .range(from, to);

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }

  const { data: students, count } = await query;

  return (
    <TeacherStudentsClient
      students={students ?? []}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
    />
  );
}
