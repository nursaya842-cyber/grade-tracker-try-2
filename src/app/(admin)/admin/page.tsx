import { createClient } from "@/lib/supabase/server";
import DashboardContent from "./DashboardContent";
import RecommendationList from "@/components/recommendations/RecommendationList";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Total active students
  const { count: studentCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  // Total active teachers
  const { count: teacherCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher")
    .is("deleted_at", null);

  // Lessons this week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const { count: lessonsThisWeek } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("starts_at", startOfWeek.toISOString())
    .lt("starts_at", endOfWeek.toISOString());

  // Pending (unsubmitted) reports
  const { count: pendingReports } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("report_submitted_at", null)
    .lt("ends_at", now.toISOString());

  // Last 5 created users
  const { data: recentUsers } = await supabase
    .from("users")
    .select("id, full_name, role, email, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div>
      {user && <RecommendationList userId={user.id} />}
      <DashboardContent
        stats={{
        students: studentCount ?? 0,
        teachers: teacherCount ?? 0,
        lessonsThisWeek: lessonsThisWeek ?? 0,
        pendingReports: pendingReports ?? 0,
      }}
      recentUsers={recentUsers ?? []}
    />
    </div>
  );
}
