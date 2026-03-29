import { createClient } from "@/lib/supabase/server";
import EffectivenessClient from "./_components/EffectivenessClient";

export default async function EffectivenessPage() {
  const supabase = await createClient();

  // 1. Avg grade entry time (report_submitted_at - ends_at)
  const { data: reportedLessons } = await supabase
    .from("lessons")
    .select("ends_at, report_submitted_at")
    .is("deleted_at", null)
    .not("report_submitted_at", "is", null)
    .limit(500);

  let avgGradeEntryHours = 0;
  if (reportedLessons && reportedLessons.length > 0) {
    const totalHours = reportedLessons.reduce((sum, l) => {
      const diff = new Date(l.report_submitted_at!).getTime() - new Date(l.ends_at).getTime();
      return sum + diff / 3600000;
    }, 0);
    avgGradeEntryHours = Math.round((totalHours / reportedLessons.length) * 10) / 10;
  }

  // 2. Report completion rate
  const { count: totalPastLessons } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .lt("ends_at", new Date().toISOString());

  const { count: reportedCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .not("report_submitted_at", "is", null);

  const reportCompletionPct = totalPastLessons && totalPastLessons > 0
    ? Math.round(((reportedCount ?? 0) / totalPastLessons) * 100)
    : 0;

  // 3. At-risk students detected
  const { data: attSummary } = await supabase
    .from("v_student_attendance_summary")
    .select("student_id, attendance_pct");

  const atRiskCount = new Set(
    (attSummary ?? []).filter((s) => (s.attendance_pct ?? 100) < 70).map((s) => s.student_id)
  ).size;

  // 4. Total students
  const { count: totalStudents } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  // 5. Recommendations generated
  const { count: totalRecs } = await supabase
    .from("recommendations")
    .select("*", { count: "exact", head: true });

  const { count: activeRecs } = await supabase
    .from("recommendations")
    .select("*", { count: "exact", head: true })
    .is("resolved_at", null)
    .is("dismissed_at", null);

  // 6. Check-in completion
  const { count: checkinCount } = await supabase
    .from("student_checkins")
    .select("*", { count: "exact", head: true });

  // 7. Attendance records
  const { count: attendanceRecords } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true });

  // 8. Grades recorded
  const { count: gradeRecords } = await supabase
    .from("grades")
    .select("*", { count: "exact", head: true });

  return (
    <EffectivenessClient
      metrics={{
        avgGradeEntryHours,
        reportCompletionPct,
        atRiskCount,
        totalStudents: totalStudents ?? 0,
        totalRecs: totalRecs ?? 0,
        activeRecs: activeRecs ?? 0,
        checkinCount: checkinCount ?? 0,
        attendanceRecords: attendanceRecords ?? 0,
        gradeRecords: gradeRecords ?? 0,
        reportedLessons: reportedCount ?? 0,
        totalPastLessons: totalPastLessons ?? 0,
      }}
    />
  );
}
