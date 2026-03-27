"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function startImpersonation(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Verify caller is admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return;

  // Fetch target user role
  const { data: target } = await supabase
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (!target) return;

  const cookieStore = await cookies();
  cookieStore.set("impersonate_id", targetUserId, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  if (target.role === "teacher") redirect("/teacher/lessons");
  else redirect("/student/schedule");
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_id");
  redirect("/admin");
}
