"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignTeacherToLesson(
  lessonId: string,
  teacherId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .update({ teacher_id: teacherId })
    .eq("id", lessonId)
    .is("teacher_id", null);

  if (error) return { error: error.message };

  revalidatePath("/admin/risk-dashboard");
  revalidatePath("/admin/schedule");
  return { error: null };
}
