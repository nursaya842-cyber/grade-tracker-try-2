"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClub(data: {
  name: string;
  headStudentId: string;
  memberIds: string[];
}) {
  const supabase = await createClient();
  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ name: data.name, head_student_id: data.headStudentId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Insert members (including head)
  const allIds = [...new Set([data.headStudentId, ...data.memberIds])];
  if (allIds.length > 0) {
    await supabase.from("club_members").insert(
      allIds.map((sid) => ({ club_id: club.id, student_id: sid }))
    );
  }
  revalidatePath("/admin/clubs");
  return { error: null };
}

export async function updateClub(
  clubId: string,
  data: { name: string; headStudentId: string; memberIds: string[] }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ name: data.name, head_student_id: data.headStudentId, updated_at: new Date().toISOString() })
    .eq("id", clubId);
  if (error) return { error: error.message };

  // Re-sync members
  await supabase.from("club_members").delete().eq("club_id", clubId);
  const allIds = [...new Set([data.headStudentId, ...data.memberIds])];
  if (allIds.length > 0) {
    await supabase.from("club_members").insert(
      allIds.map((sid) => ({ club_id: clubId, student_id: sid }))
    );
  }
  revalidatePath("/admin/clubs");
  return { error: null };
}

export async function deleteClub(clubId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clubId);
  if (error) return { error: error.message };
  revalidatePath("/admin/clubs");
  return { error: null };
}

export async function createAnnouncement(data: {
  clubId: string;
  title: string;
  description?: string;
  photoUrl?: string;
  venue?: string;
  startsAt: string;
  endsAt: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("club_announcements").insert({
    club_id: data.clubId,
    title: data.title,
    description: data.description,
    photo_url: data.photoUrl,
    venue: data.venue,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/clubs");
  return { error: null };
}

export async function getAnnouncementsForClub(clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_announcements")
    .select("*, event_signups(student_id, signed_up_at, users:users!event_signups_student_id_fkey(full_name))")
    .eq("club_id", clubId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });
  return data ?? [];
}
