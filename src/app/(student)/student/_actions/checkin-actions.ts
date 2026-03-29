"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export async function fetchCurrentCheckin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const weekStart = getWeekStart();
  const { data } = await supabase
    .from("student_checkins")
    .select("*")
    .eq("student_id", effectiveId)
    .eq("week_start", weekStart)
    .maybeSingle();

  return data;
}

export async function submitCheckin(values: {
  stressLevel: number;
  motivationLevel: number;
  workloadFeeling: number;
  understanding: number;
  satisfaction: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  const weekStart = getWeekStart();

  const { error } = await supabase.from("student_checkins").upsert(
    {
      student_id: effectiveId,
      week_start: weekStart,
      stress_level: values.stressLevel,
      motivation_level: values.motivationLevel,
      workload_feeling: values.workloadFeeling,
      understanding: values.understanding,
      satisfaction: values.satisfaction,
      notes: values.notes ?? null,
    },
    { onConflict: "student_id,week_start" }
  );

  if (error) return { error: error.message };

  revalidatePath("/student/schedule");
  return { error: null };
}

export async function fetchCheckinAverage(studentId: string): Promise<number | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_checkins")
    .select("stress_level, motivation_level, workload_feeling, understanding, satisfaction")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(4);

  if (!data || data.length === 0) return null;

  let total = 0;
  let count = 0;
  for (const row of data) {
    // Invert stress (high stress = low wellbeing)
    const wellbeing = (
      (10 - row.stress_level) +
      row.motivation_level +
      (10 - row.workload_feeling) +
      row.understanding +
      row.satisfaction
    ) / 5;
    total += wellbeing;
    count++;
  }

  return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}
