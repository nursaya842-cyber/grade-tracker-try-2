"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSubject(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({ name });
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return { error: null };
}

export async function updateSubject(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return { error: null };
}

export async function deleteSubject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return { error: null };
}
