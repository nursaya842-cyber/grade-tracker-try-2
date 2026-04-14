import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import DeansTable from "./_components/DeansTable";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function DeansPage() {
  const supabase = await createClient();
  const service = svc();

  const [{ data: deans }, { data: faculties }] = await Promise.all([
    service
      .from("users")
      .select("id, email, full_name, faculty_id, created_at")
      .eq("role", "dean")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("faculties")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const facultyMap = new Map((faculties ?? []).map((f) => [f.id, f.name]));

  const deansWithFaculty = (deans ?? []).map((d) => ({
    ...d,
    faculty_name: d.faculty_id ? (facultyMap.get(d.faculty_id) ?? null) : null,
  }));

  return (
    <DeansTable
      deans={deansWithFaculty}
      faculties={faculties ?? []}
    />
  );
}
