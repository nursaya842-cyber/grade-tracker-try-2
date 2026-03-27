import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import MyClubClient from "./_components/MyClubClient";

export default async function MyClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  // Check if user is club head
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("head_student_id", effectiveId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!club) redirect("/student/schedule");

  // Members
  const { data: members } = await supabase
    .from("club_members")
    .select("student_id, users!inner(id, full_name, email)")
    .eq("club_id", club.id);

  // Announcements with signups
  const { data: announcements } = await supabase
    .from("club_announcements")
    .select(
      "id, title, description, venue, starts_at, ends_at, photo_url, signups:event_signups(student_id, users!inner(full_name))"
    )
    .eq("club_id", club.id)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });

  const membersList = (members ?? []).map((m) => {
    const u = m.users as unknown as {
      id: string;
      full_name: string;
      email: string;
    };
    return { id: u.id, fullName: u.full_name, email: u.email };
  });

  const announcementsList = (announcements ?? []).map((a) => {
    const signups = (
      a.signups as unknown as Array<{
        student_id: string;
        users: { full_name: string };
      }>
    ) ?? [];
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      venue: a.venue,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      signups: signups.map((s) => ({
        studentId: s.student_id,
        fullName: s.users?.full_name ?? "—",
      })),
    };
  });

  return (
    <MyClubClient
      clubId={club.id}
      clubName={club.name}
      members={membersList}
      announcements={announcementsList}
    />
  );
}
