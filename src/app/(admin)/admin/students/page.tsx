import { createClient } from "@/lib/supabase/server";
import StudentsTable from "./_components/StudentsTable";
import { calculateGpa } from "@/lib/utils";

const PAGE_SIZE = 20;

interface SearchParams {
  page?: string;
  search?: string;
  course?: string;
  faculty?: string;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim() ?? "";
  const course = params.course ? parseInt(params.course, 10) : null;
  const facultyId = params.faculty ?? null;

  const supabase = await createClient();

  // Build query with filters
  let query = supabase
    .from("users")
    .select("id, email, full_name, course_year, faculty_id, face_photo_url, created_at", {
      count: "exact",
    })
    .eq("role", "student")
    .is("deleted_at", null);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (course) {
    query = query.eq("course_year", course);
  }
  if (facultyId) {
    query = query.eq("faculty_id", facultyId);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: students, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = count ?? 0;

  // Faculties for filter dropdown
  const { data: faculties } = await supabase
    .from("faculties")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  const facultyMap = new Map((faculties ?? []).map((f) => [f.id, f.name]));

  // GPA for current page only
  const studentIds = (students ?? []).map((s) => s.id);
  const { data: allGrades } = studentIds.length > 0
    ? await supabase
        .from("grades")
        .select("student_id, score")
        .in("student_id", studentIds)
        .not("score", "is", null)
    : { data: [] };

  const gradesByStudent = new Map<string, number[]>();
  for (const g of allGrades ?? []) {
    if (g.score == null) continue;
    const arr = gradesByStudent.get(g.student_id) ?? [];
    arr.push(g.score);
    gradesByStudent.set(g.student_id, arr);
  }

  const studentsWithData = (students ?? []).map((s) => ({
    ...s,
    faculty_name: s.faculty_id ? (facultyMap.get(s.faculty_id) ?? null) : null,
    gpa: calculateGpa(gradesByStudent.get(s.id) ?? []),
  }));

  return (
    <StudentsTable
      students={studentsWithData}
      faculties={faculties ?? []}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
      course={course}
      facultyId={facultyId}
    />
  );
}
