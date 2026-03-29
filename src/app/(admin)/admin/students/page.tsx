import { createClient } from "@/lib/supabase/server";
import StudentsTable from "./_components/StudentsTable";
import { calculateGpa } from "@/lib/utils";

export default async function StudentsPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("users")
    .select("id, email, full_name, course_year, faculty_id, face_photo_url, created_at")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Fetch faculties
  const { data: faculties } = await supabase
    .from("faculties")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  const facultyMap = new Map((faculties ?? []).map((f) => [f.id, f.name]));

  // Fetch all grades in one query for GPA calculation
  const studentIds = (students ?? []).map((s) => s.id);
  const { data: allGrades } = studentIds.length > 0
    ? await supabase
        .from("grades")
        .select("student_id, score")
        .in("student_id", studentIds)
        .not("score", "is", null)
    : { data: [] };

  // Build GPA map
  const gradesByStudent = new Map<string, number[]>();
  for (const g of allGrades ?? []) {
    if (g.score == null) continue;
    const arr = gradesByStudent.get(g.student_id) ?? [];
    arr.push(g.score);
    gradesByStudent.set(g.student_id, arr);
  }

  const studentsWithData = (students ?? []).map((s) => ({
    ...s,
    faculty_name: s.faculty_id ? facultyMap.get(s.faculty_id) ?? null : null,
    gpa: calculateGpa(gradesByStudent.get(s.id) ?? []),
  }));

  return <StudentsTable students={studentsWithData} faculties={faculties ?? []} />;
}
