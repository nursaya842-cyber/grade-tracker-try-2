import { createClient } from "@/lib/supabase/server";
import ParentsTable from "./_components/ParentsTable";

export default async function ParentsPage() {
  const supabase = await createClient();

  const { data: parents } = await supabase
    .from("users")
    .select("id, email, full_name, created_at")
    .eq("role", "parent")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Fetch parent-student links
  const parentIds = (parents ?? []).map((p) => p.id);
  const { data: links } = parentIds.length > 0
    ? await supabase
        .from("parent_students")
        .select("parent_id, student_id, users!parent_students_student_id_fkey(full_name)")
        .in("parent_id", parentIds)
    : { data: [] };

  // Build children map
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

  // Fetch students for select
  const { data: students } = await supabase
    .from("users")
    .select("id, full_name, email, course_year")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name")
    .limit(500);

  return (
    <ParentsTable
      parents={parentsWithChildren}
      students={students ?? []}
    />
  );
}
