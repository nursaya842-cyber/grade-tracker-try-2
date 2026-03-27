import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use JWT metadata for role check — avoids RLS circular dependency
  const role = (user.user_metadata?.role as string) ?? null;
  const fullName = (user.user_metadata?.full_name as string) ?? "Admin";

  if (role !== "admin") {
    redirect(role === "teacher" ? "/teacher/lessons" : "/student/schedule");
  }

  return <AdminShell userName={fullName}>{children}</AdminShell>;
}
