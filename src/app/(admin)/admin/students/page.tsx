import { createClient } from "@/lib/supabase/server";
import StudentsTable from "./_components/StudentsTable";

export default async function StudentsPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("users")
    .select("id, phone, full_name, course_year, face_photo_url, created_at")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return <StudentsTable students={students ?? []} />;
}
