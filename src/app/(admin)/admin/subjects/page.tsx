import { createClient } from "@/lib/supabase/server";
import SubjectsPage from "./_components/SubjectsPage";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, name, created_at")
    .is("deleted_at", null)
    .order("name");

  return <SubjectsPage subjects={data ?? []} />;
}
