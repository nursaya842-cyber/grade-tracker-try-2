import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import TeacherProfileClient from "./_components/TeacherProfileClient";

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, diploma_url, created_at")
    .eq("id", effectiveId)
    .single();

  if (!profile) redirect("/login");

  // Signed URL for diploma
  let diplomaSignedUrl: string | null = null;
  if (profile.diploma_url) {
    const { data: signed } = await supabase.storage
      .from("diplomas")
      .createSignedUrl(profile.diploma_url, 3600);
    diplomaSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <TeacherProfileClient
      profile={profile}
      diplomaSignedUrl={diplomaSignedUrl}
    />
  );
}
