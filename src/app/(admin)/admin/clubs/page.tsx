import { createClient } from "@/lib/supabase/server";
import ClubsPage from "./_components/ClubsPage";

export default async function Page() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, head_student_id, created_at, club_members(student_id), head:users!clubs_head_student_id_fkey(full_name)")
    .is("deleted_at", null)
    .order("name");

  const { data: students } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name");

  const mapped = (clubs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    headStudentId: c.head_student_id,
    headName: (c.head as unknown as { full_name: string } | null)?.full_name ?? "—",
    memberCount: (c.club_members as unknown[])?.length ?? 0,
    memberIds: ((c.club_members as unknown as { student_id: string }[]) ?? []).map((m) => m.student_id),
  }));

  return <ClubsPage clubs={mapped} students={students ?? []} />;
}
