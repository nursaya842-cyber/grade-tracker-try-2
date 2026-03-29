import { createClient } from "@/lib/supabase/server";
import FacultiesTable from "./_components/FacultiesTable";

export default async function FacultiesPage() {
  const supabase = await createClient();

  const { data: faculties } = await supabase
    .from("faculties")
    .select("id, name, created_at")
    .is("deleted_at", null)
    .order("name");

  // Count students per faculty
  const { data: students } = await supabase
    .from("users")
    .select("faculty_id")
    .eq("role", "student")
    .is("deleted_at", null)
    .not("faculty_id", "is", null);

  const countMap = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.faculty_id) {
      countMap.set(s.faculty_id, (countMap.get(s.faculty_id) ?? 0) + 1);
    }
  }

  const facultiesWithCount = (faculties ?? []).map((f) => ({
    ...f,
    studentCount: countMap.get(f.id) ?? 0,
  }));

  return <FacultiesTable faculties={facultiesWithCount} />;
}
