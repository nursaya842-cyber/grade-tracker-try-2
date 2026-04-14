import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import DeanShell from "./DeanShell";

export default async function DeanLayout({
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
  if (role !== "dean" && role !== "admin") {
    redirect("/login");
  }

  const fullName = (user.user_metadata?.full_name as string) ?? "Dean";

  // Fetch faculty name for display
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: deanRow } = await svc
    .from("users")
    .select("faculty_id, faculties(name)")
    .eq("id", user.id)
    .single();

  const facultyName =
    deanRow?.faculties && !Array.isArray(deanRow.faculties)
      ? (deanRow.faculties as { name: string }).name
      : null;

  return <DeanShell userName={fullName} facultyName={facultyName}>{children}</DeanShell>;
}
