import { createClient } from "@/lib/supabase/server";
import TeachersTable from "./_components/TeachersTable";

export default async function TeachersPage() {
  const supabase = await createClient();

  const { data: teachers } = await supabase
    .from("users")
    .select("id, phone, full_name, diploma_url, created_at")
    .eq("role", "teacher")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return <TeachersTable teachers={teachers ?? []} />;
}
