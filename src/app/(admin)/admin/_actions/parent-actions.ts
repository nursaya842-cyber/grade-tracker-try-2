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

export async function createParent(formData: {
  email: string;
  password: string;
  fullName: string;
  childrenIds: string[];
}) {
  const serviceClient = getServiceClient();

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      email: formData.email.trim().toLowerCase(),
      full_name: formData.fullName,
      role: "parent",
    },
  });

  if (error) return { error: error.message };

  // Link children
  if (formData.childrenIds.length > 0) {
    const links = formData.childrenIds.map((sid) => ({
      parent_id: data.user.id,
      student_id: sid,
    }));
    await serviceClient.from("parent_students").insert(links);
  }

  revalidatePath("/admin/parents");
  return { error: null, userId: data.user.id };
}

export async function updateParent(
  userId: string,
  formData: { fullName: string; email: string; childrenIds: string[] }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: formData.fullName,
      email: formData.email.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  // Re-sync children: delete old, insert new
  const serviceClient = getServiceClient();
  await serviceClient.from("parent_students").delete().eq("parent_id", userId);
  if (formData.childrenIds.length > 0) {
    const links = formData.childrenIds.map((sid) => ({
      parent_id: userId,
      student_id: sid,
    }));
    await serviceClient.from("parent_students").insert(links);
  }

  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
  return { error: null };
}

export async function deleteParent(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/parents");
  return { error: null };
}

export async function searchStudentsForSelect(query: string) {
  const supabase = await createClient();

  let q = supabase
    .from("users")
    .select("id, full_name, email, course_year")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name")
    .limit(20);

  if (query.trim()) {
    q = q.or(`full_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
  }

  const { data } = await q;
  return data ?? [];
}
