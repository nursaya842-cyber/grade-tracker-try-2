"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneToAuthEmail } from "@/lib/utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createTeacher(formData: {
  phone: string;
  password: string;
  fullName: string;
  diplomaUrl?: string;
}) {
  const serviceClient = getServiceClient();

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: phoneToAuthEmail(formData.phone),
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      phone: formData.phone,
      full_name: formData.fullName,
      role: "teacher",
    },
  });

  if (error) return { error: error.message };

  // Update diploma_url if provided
  if (formData.diplomaUrl) {
    await serviceClient
      .from("users")
      .update({ diploma_url: formData.diplomaUrl })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin/teachers");
  return { error: null, userId: data.user.id };
}

export async function updateTeacher(
  userId: string,
  formData: { fullName: string; phone: string; diplomaUrl?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: formData.fullName,
      phone: formData.phone,
      diploma_url: formData.diplomaUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/teachers");
  return { error: null };
}

export async function deleteTeacher(userId: string) {
  const supabase = await createClient();

  // Soft delete user
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  // Unassign future lessons
  await supabase
    .from("lessons")
    .update({ teacher_id: null })
    .eq("teacher_id", userId)
    .gt("starts_at", new Date().toISOString())
    .is("deleted_at", null);

  revalidatePath("/admin/teachers");
  return { error: null };
}

export async function resetPassword(userId: string, newPassword: string) {
  const serviceClient = getServiceClient();

  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };
  return { error: null };
}
