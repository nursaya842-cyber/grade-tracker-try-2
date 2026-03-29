"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFaculty(name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("faculties")
    .insert({ name: name.trim() });

  if (error) return { error: error.message };

  revalidatePath("/admin/faculties");
  return { error: null };
}

export async function updateFaculty(id: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("faculties")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/faculties");
  return { error: null };
}

export async function deleteFaculty(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("faculties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  // Unlink students from deleted faculty
  await supabase
    .from("users")
    .update({ faculty_id: null })
    .eq("faculty_id", id);

  revalidatePath("/admin/faculties");
  revalidatePath("/admin/students");
  return { error: null };
}

export async function fetchFaculties() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("faculties")
    .select("id, name, created_at")
    .is("deleted_at", null)
    .order("name");

  return data ?? [];
}
