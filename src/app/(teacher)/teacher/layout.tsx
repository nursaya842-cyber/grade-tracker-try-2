import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getImpersonatedIdFromCookies } from "@/lib/impersonation";
import TeacherShell from "./TeacherShell";
import ImpersonationBanner from "@/lib/components/ImpersonationBanner";

export default async function TeacherLayout({
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
  const fullName = (user.user_metadata?.full_name as string) ?? "Teacher";

  if (role !== "teacher" && role !== "admin") {
    redirect("/student/schedule");
  }

  // Check impersonation
  const impersonatedId = await getImpersonatedIdFromCookies();
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

  return (
    <>
      {isImpersonating && <ImpersonationBanner userName={displayName} />}
      <TeacherShell userName={displayName}>{children}</TeacherShell>
    </>
  );
}
