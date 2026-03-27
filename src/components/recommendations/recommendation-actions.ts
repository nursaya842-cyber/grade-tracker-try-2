"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";

export async function dismissRecommendation(recId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const { error } = await supabase
    .from("recommendations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", recId)
    .eq("user_id", effectiveId);

  if (error) return { error: error.message };

  revalidatePath("/student/schedule");
  revalidatePath("/student/profile");
  revalidatePath("/teacher/lessons");
  revalidatePath("/admin");
  return { error: null };
}

export async function fetchRecommendations(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("recommendations")
    .select("id, rule_id, category, next_action, priority_score")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("dismissed_at", null)
    .order("priority_score", { ascending: false })
    .limit(3);

  return data ?? [];
}
