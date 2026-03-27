import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "./_components/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  // ── KPI: Total Students ───────────────────────────────────
  const { count: totalStudents } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  // ── KPI: Avg Attendance (30d) ─────────────────────────────
  const { data: recentAtt } = await supabase
    .from("attendance")
    .select("status, lessons!inner(starts_at, deleted_at)")
    .is("lessons.deleted_at", null)
    .gte("lessons.starts_at", thirtyDaysAgo);

  const attTotal = recentAtt?.length ?? 0;
  const attPresent = recentAtt?.filter((a) => a.status === "present").length ?? 0;
  const avgAttendance = attTotal > 0 ? Math.round((attPresent / attTotal) * 100 * 10) / 10 : 0;

  // ── KPI: Avg Grade (30d) ──────────────────────────────────
  const { data: recentGrades } = await supabase
    .from("grades")
    .select("score")
    .not("score", "is", null)
    .gte("graded_at", thirtyDaysAgo);

  const scores = (recentGrades ?? []).map((g) => g.score as number);
  const avgGrade = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;

  // ── KPI: Club Events This Month ───────────────────────────
  const { count: eventsThisMonth } = await supabase
    .from("club_announcements")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("starts_at", monthStart.toISOString())
    .lt("starts_at", monthEnd.toISOString());

  // ── Chart: Attendance by Subject ──────────────────────────
  const { data: attBySubject } = await supabase
    .from("v_student_attendance_summary")
    .select("subject_id, attendance_pct");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .is("deleted_at", null);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  // Average attendance per subject
  const subjectAttMap = new Map<string, { total: number; sum: number }>();
  for (const row of attBySubject ?? []) {
    const entry = subjectAttMap.get(row.subject_id) ?? { total: 0, sum: 0 };
    entry.total++;
    entry.sum += row.attendance_pct ?? 0;
    subjectAttMap.set(row.subject_id, entry);
  }

  const attendanceBySubject = Array.from(subjectAttMap.entries()).map(([id, val]) => ({
    subject: subjectMap.get(id) ?? "—",
    attendance: Math.round((val.sum / val.total) * 10) / 10,
  }));

  // ── Chart: Grade Distribution ─────────────────────────────
  const { data: allGrades } = await supabase
    .from("grades")
    .select("score")
    .not("score", "is", null);

  const buckets = [
    { label: "0–20", min: 0, max: 20, count: 0 },
    { label: "21–40", min: 21, max: 40, count: 0 },
    { label: "41–60", min: 41, max: 60, count: 0 },
    { label: "61–80", min: 61, max: 80, count: 0 },
    { label: "81–100", min: 81, max: 100, count: 0 },
  ];

  for (const g of allGrades ?? []) {
    const s = g.score as number;
    const b = buckets.find((b) => s >= b.min && s <= b.max);
    if (b) b.count++;
  }

  const gradeDistribution = buckets.map((b) => ({
    range: b.label,
    count: b.count,
  }));

  // ── Chart: Social Participation Over Time ─────────────────
  const { data: allSignups } = await supabase
    .from("event_signups")
    .select("signed_up_at");

  const monthlySignups = new Map<string, number>();
  for (const s of allSignups ?? []) {
    const d = new Date(s.signed_up_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlySignups.set(key, (monthlySignups.get(key) ?? 0) + 1);
  }

  const socialParticipation = Array.from(monthlySignups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // ── Table: Unsubmitted Reports ────────────────────────────
  const { data: pendingReports } = await supabase
    .from("v_teacher_report_status")
    .select("teacher_id, unsubmitted_count, oldest_pending")
    .gt("unsubmitted_count", 0);

  const pendingWithNames: Array<{
    teacherName: string;
    unsubmittedCount: number;
    oldestPending: string | null;
  }> = [];

  for (const p of pendingReports ?? []) {
    const { data: t } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", p.teacher_id)
      .single();
    pendingWithNames.push({
      teacherName: t?.full_name ?? "—",
      unsubmittedCount: p.unsubmitted_count,
      oldestPending: p.oldest_pending,
    });
  }

  return (
    <AnalyticsClient
      kpi={{
        totalStudents: totalStudents ?? 0,
        avgAttendance,
        avgGrade,
        eventsThisMonth: eventsThisMonth ?? 0,
      }}
      attendanceBySubject={attendanceBySubject}
      gradeDistribution={gradeDistribution}
      socialParticipation={socialParticipation}
      pendingReports={pendingWithNames}
    />
  );
}
