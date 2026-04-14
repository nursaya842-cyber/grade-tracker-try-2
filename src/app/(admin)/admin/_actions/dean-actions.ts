"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createDean(formData: {
  email: string;
  password: string;
  fullName: string;
  facultyId: string;
}) {
  const svc = getServiceClient();

  // Enforce one dean per faculty
  const { data: existing } = await svc
    .from("users")
    .select("id")
    .eq("role", "dean")
    .eq("faculty_id", formData.facultyId)
    .is("deleted_at", null)
    .single();

  if (existing) return { error: "This faculty already has a dean." };

  const { data, error } = await svc.auth.admin.createUser({
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      email: formData.email.trim().toLowerCase(),
      full_name: formData.fullName,
      role: "dean",
    },
  });

  if (error) return { error: error.message };

  await svc
    .from("users")
    .update({
      email: formData.email.trim().toLowerCase(),
      full_name: formData.fullName,
      faculty_id: formData.facultyId,
    })
    .eq("id", data.user.id);

  revalidatePath("/admin/deans");
  return { error: null, userId: data.user.id };
}

export async function updateDean(
  userId: string,
  formData: { fullName: string; email: string; facultyId: string }
) {
  const svc = getServiceClient();

  // Enforce one dean per faculty (exclude self)
  const { data: existing } = await svc
    .from("users")
    .select("id")
    .eq("role", "dean")
    .eq("faculty_id", formData.facultyId)
    .is("deleted_at", null)
    .neq("id", userId)
    .single();

  if (existing) return { error: "This faculty already has a dean." };

  const { error } = await svc
    .from("users")
    .update({
      full_name: formData.fullName,
      email: formData.email.trim().toLowerCase(),
      faculty_id: formData.facultyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/deans");
  return { error: null };
}

export async function deleteDean(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/deans");
  return { error: null };
}

export async function resetDeanPassword(userId: string, newPassword: string) {
  const svc = getServiceClient();

  const { error } = await svc.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };
  return { error: null };
}
