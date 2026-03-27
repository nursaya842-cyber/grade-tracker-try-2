import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getImpersonatedIdFromCookies, getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import StudentShell from "./StudentShell";
import ImpersonationBanner from "@/lib/components/ImpersonationBanner";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use JWT metadata for role check — avoids RLS issues
  const role = (user.user_metadata?.role as string) ?? null;
  const fullName = (user.user_metadata?.full_name as string) ?? "Student";

  if (role !== "student" && role !== "admin") {
    redirect(role === "teacher" ? "/teacher/lessons" : "/admin");
  }

  // Check impersonation
  const impersonatedId = await getImpersonatedIdFromCookies();
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);
  let displayName = fullName;
  let isImpersonating = false;

  if (impersonatedId && role === "admin") {
    const { data: impersonated } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", impersonatedId)
      .single();
    if (impersonated) {
      displayName = impersonated.full_name;
      isImpersonating = true;
    }
  }

  // Check if effective user is a club head
  const { data: headClub } = await supabase
    .from("clubs")
    .select("id")
    .eq("head_student_id", effectiveId)
    .is("deleted_at", null)
    .maybeSingle();

  return (
    <>
      {isImpersonating && <ImpersonationBanner userName={displayName} />}
      <StudentShell userName={displayName} isClubHead={!!headClub}>
        {children}
      </StudentShell>
    </>
  );
}
