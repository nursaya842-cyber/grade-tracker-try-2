import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import DeanStudentsClient from "./_components/DeanStudentsClient";

const PAGE_SIZE = 20;

export default async function DeanStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get dean's faculty
  const { data: deanRow } = await svc
    .from("users")
    .select("faculty_id, faculties(name)")
    .eq("id", user.id)
    .single();

  const facultyId = deanRow?.faculty_id as string | null;
  const facultyName =
    deanRow?.faculties && !Array.isArray(deanRow.faculties)
      ? (deanRow.faculties as { name: string }).name
      : null;

  if (!facultyId) {
    return (
      <DeanStudentsClient
        students={[]}
        total={0}
        page={1}
        pageSize={PAGE_SIZE}
        search=""
        facultyName={null}
      />
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const search = params.search ?? "";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = svc
    .from("users")
    .select("id, full_name, email, face_photo_url, course_year", { count: "exact" })
    .eq("role", "student")
    .eq("faculty_id", facultyId)
    .is("deleted_at", null)
    .order("full_name")
    .range(from, to);

  if (search.trim()) {
    query = query.or(
      `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    );
  }

  const { data: students, count } = await query;

  // Generate signed URLs for student photos
  const studentsWithPhotos = await Promise.all(
    (students ?? []).map(async (s) => {
      if (!s.face_photo_url) return { ...s, photo_signed_url: null };
      const { data: signed } = await svc
        .storage
        .from("student-photos")
        .createSignedUrl(s.face_photo_url, 3600);
      return { ...s, photo_signed_url: signed?.signedUrl ?? null };
    })
  );

  return (
    <DeanStudentsClient
      students={studentsWithPhotos}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
      facultyName={facultyName}
    />
  );
}
