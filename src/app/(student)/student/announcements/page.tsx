import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import AnnouncementsClient from "./_components/AnnouncementsClient";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const { data: announcements } = await supabase
    .from("club_announcements")
    .select(
      "id, title, description, venue, starts_at, ends_at, photo_url, club_id, clubs(name), signups:event_signups(student_id)"
    )
    .is("deleted_at", null)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const list = (announcements ?? []).map((a) => {
    const club = a.clubs as unknown as { name: string };
    const signups = (a.signups as unknown as { student_id: string }[]) ?? [];
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      venue: a.venue,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      clubName: club?.name ?? "—",
      signupCount: signups.length,
      isSignedUp: signups.some((s) => s.student_id === effectiveId),
    };
  });

  return <AnnouncementsClient announcements={list} />;
}
