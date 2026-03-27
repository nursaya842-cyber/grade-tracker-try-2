import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import StudentProfileClient from "./_components/StudentProfileClient";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const effectiveId = await getEffectiveUserIdFromCookies(user.id);

  // Profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, course_year, face_photo_url, created_at")
    .eq("id", effectiveId)
    .single();

  if (!profile) redirect("/login");

  // Average grade
  const { data: gradeData } = await supabase
    .from("grades")
    .select("score")
    .eq("student_id", effectiveId)
    .not("score", "is", null);

  const scores = (gradeData ?? [])
    .map((g) => g.score)
    .filter((s): s is number => s !== null);
  const avgGrade =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  // Attendance rate
  const { data: attData } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", effectiveId);

  const attTotal = attData?.length ?? 0;
  const attPresent = attData?.filter((a) => a.status === "present").length ?? 0;
  const attendancePct =
    attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0;

  // Event signups count
  const { count: signupCount } = await supabase
    .from("event_signups")
    .select("*", { count: "exact", head: true })
    .eq("student_id", effectiveId);

  // Photo signed URL
  let photoSignedUrl: string | null = null;
  if (profile.face_photo_url) {
    const { data: signed } = await supabase.storage
      .from("student-photos")
      .createSignedUrl(profile.face_photo_url, 3600);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <StudentProfileClient
      profile={profile}
      photoSignedUrl={photoSignedUrl}
      stats={{
        avgGrade,
        attendancePct,
        signupCount: signupCount ?? 0,
      }}
    />
  );
}
