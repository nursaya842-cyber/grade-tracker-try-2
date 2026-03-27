import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import MyClubsClient from "./_components/MyClubsClient";

export default async function MyClubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const { data: memberships } = await supabase
    .from("club_members")
    .select(
      "club_id, clubs!inner(id, name, deleted_at, head_student_id, head:users!clubs_head_student_id_fkey(full_name))"
    )
    .eq("student_id", effectiveId)
    .is("clubs.deleted_at", null);

  // Count members per club
  const clubs = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const c = m.clubs as unknown as {
        id: string;
        name: string;
        head_student_id: string | null;
        head: { full_name: string } | null;
      };

      const { count } = await supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", c.id);

      return {
        id: c.id,
        name: c.name,
        headName: c.head?.full_name ?? "—",
        memberCount: count ?? 0,
      };
    })
  );

  return <MyClubsClient clubs={clubs} />;
}
