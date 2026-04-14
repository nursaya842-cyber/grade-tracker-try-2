import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentShell from "./ParentShell";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.user_metadata?.role as string) ?? null;
  const fullName = (user.user_metadata?.full_name as string) ?? "Parent";

  if (role !== "parent" && role !== "admin") {
    redirect(role === "teacher" ? "/teacher/lessons" : "/student/schedule");
  }

  return <ParentShell userName={fullName}>{children}</ParentShell>;
}
