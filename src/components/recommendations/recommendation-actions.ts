"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";

/**
 * Triggers recommendation generation for a single student via Edge Function.
 * Called on profile view. Skips if fresh recs already exist (handled by Edge Function).
 */
export async function triggerStudentRecommendations(studentId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/functions/v1/recommendations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId }),
    });
  } catch {
    // Non-critical — silently ignore errors
  }
}

export async function acceptRecommendation(recId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authorized" };

  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const { error } = await supabase
    .from("recommendations")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", recId)
    .eq("user_id", effectiveId);

  if (error) return { error: error.message };

  revalidatePath("/student/schedule");
  revalidatePath("/student/profile");
  return { error: null };
}

export async function dismissRecommendation(recId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authorized" };

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
    .select("id, rule_id, category, next_action, priority_score, title, action, expected_effect, deadline")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("dismissed_at", null)
    .order("priority_score", { ascending: false })
    .limit(3);

  return data ?? [];
}
