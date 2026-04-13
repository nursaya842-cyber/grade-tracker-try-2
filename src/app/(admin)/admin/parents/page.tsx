import { createClient } from "@/lib/supabase/server";
import ParentsTable from "./_components/ParentsTable";

const PAGE_SIZE = 20;

interface SearchParams {
  page?: string;
  search?: string;
}

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim() ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select("id, email, full_name, created_at", { count: "exact" })
    .eq("role", "parent")
    .is("deleted_at", null);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: parents, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;

  // Children for current page only
  const parentIds = (parents ?? []).map((p) => p.id);
  const { data: links } = parentIds.length > 0
    ? await supabase
        .from("parent_students")
        .select("parent_id, student_id, users!parent_students_student_id_fkey(full_name)")
        .in("parent_id", parentIds)
    : { data: [] };

  const childrenMap = new Map<string, { id: string; name: string }[]>();
  for (const link of links ?? []) {
    const children = childrenMap.get(link.parent_id) ?? [];
    const student = link.users as unknown as { full_name: string } | null;
    children.push({ id: link.student_id, name: student?.full_name ?? "?" });
    childrenMap.set(link.parent_id, children);
  }

  const parentsWithChildren = (parents ?? []).map((p) => ({
    ...p,
    children: childrenMap.get(p.id) ?? [],
  }));

  return (
    <ParentsTable
      parents={parentsWithChildren}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
    />
  );
}
