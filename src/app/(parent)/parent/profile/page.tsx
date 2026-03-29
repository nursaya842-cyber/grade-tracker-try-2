import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentProfileClient from "./_components/ParentProfileClient";

export default async function ParentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <ParentProfileClient profile={profile} />;
}
