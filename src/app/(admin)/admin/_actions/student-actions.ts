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

export async function createStudent(formData: {
  email: string;
  password: string;
  fullName: string;
  courseYear: number;
  facultyId?: string;
  facePhotoUrl?: string;
}) {
  const serviceClient = getServiceClient();

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      email: formData.email.trim().toLowerCase(),
      full_name: formData.fullName,
      role: "student",
      course_year: formData.courseYear,
    },
  });

  if (error) return { error: error.message };

  // Update student-specific fields
  await serviceClient
    .from("users")
    .update({
      course_year: formData.courseYear,
      faculty_id: formData.facultyId ?? null,
      face_photo_url: formData.facePhotoUrl ?? null,
    })
    .eq("id", data.user.id);

  revalidatePath("/admin/students");
  return { error: null, userId: data.user.id };
}

export async function updateStudent(
  userId: string,
  formData: {
    fullName: string;
    email: string;
    courseYear: number;
    facultyId?: string;
    facePhotoUrl?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: formData.fullName,
      email: formData.email.trim().toLowerCase(),
      course_year: formData.courseYear,
      faculty_id: formData.facultyId ?? null,
      face_photo_url: formData.facePhotoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  return { error: null };
}

export async function deleteStudent(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/students");
  return { error: null };
}

export async function getStudentGrades(studentId: string, subjectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grades")
    .select("score, graded_at, lesson_id, lessons!inner(starts_at, subject_id)")
    .eq("student_id", studentId)
    .eq("lessons.subject_id", subjectId)
    .order("graded_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { error: null, data };
}

export async function getStudentSubjects(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_students")
    .select("lessons!inner(subject_id, subjects!inner(id, name))")
    .eq("student_id", studentId);

  if (error) return { error: error.message, data: null };

  // Deduplicate subjects
  const seen = new Set<string>();
  const subjects: { id: string; name: string }[] = [];
  for (const row of data ?? []) {
    const lessons = row.lessons as unknown as { subject_id: string; subjects: { id: string; name: string } };
    const subj = lessons.subjects;
    if (subj && !seen.has(subj.id)) {
      seen.add(subj.id);
      subjects.push(subj);
    }
  }

  return { error: null, data: subjects };
}

export async function getStudentSocialActivity(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_signups")
    .select("signed_up_at")
    .eq("student_id", studentId)
    .order("signed_up_at", { ascending: true });

  if (error) return { error: error.message, data: null };
  return { error: null, data };
}
