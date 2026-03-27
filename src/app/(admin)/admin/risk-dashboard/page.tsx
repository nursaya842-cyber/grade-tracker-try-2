import { createClient } from "@/lib/supabase/server";
import RiskDashboardClient from "./_components/RiskDashboardClient";

export default async function RiskDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // ── KPI: Total active students ────────────────────────────
  const { count: totalStudents } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  // ── KPI: At-risk students (attendance < 70%) ──────────────
  const { data: attSummary } = await supabase
    .from("v_student_attendance_summary")
    .select("student_id, attendance_pct");

  const atRiskIds = new Set<string>();
  for (const row of attSummary ?? []) {
    if (row.attendance_pct !== null && row.attendance_pct < 70) {
      atRiskIds.add(row.student_id);
    }
  }

  // ── KPI: Teachers with overdue reports ────────────────────
  const { data: overdueTeachers } = await supabase
    .from("v_teacher_report_status")
    .select("teacher_id, unsubmitted_count, oldest_pending")
    .gt("unsubmitted_count", 0);

  // ── KPI: University avg attendance (30d) ──────────────────
  const { data: recentAtt } = await supabase
    .from("attendance")
    .select("status, lessons!inner(starts_at, deleted_at)")
    .is("lessons.deleted_at", null)
    .gte("lessons.starts_at", thirtyDaysAgo);

  const totalAtt = recentAtt?.length ?? 0;
  const presentAtt = recentAtt?.filter((a) => a.status === "present").length ?? 0;
  const avgAttendance = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100 * 10) / 10 : 0;

  // ── KPI: Club participation rate ──────────────────────────
  const { data: signupStudents } = await supabase
    .from("event_signups")
    .select("student_id");

  const uniqueSignupStudents = new Set((signupStudents ?? []).map((s) => s.student_id)).size;
  const participationRate =
    (totalStudents ?? 0) > 0
      ? Math.round((uniqueSignupStudents / (totalStudents ?? 1)) * 100 * 10) / 10
      : 0;

  // ── Risk heatmap data: per student ────────────────────────
  const { data: allStudents } = await supabase
    .from("users")
    .select("id, full_name, course_year")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name");

  // Grades by student (average)
  const { data: gradesData } = await supabase
    .from("grades")
    .select("student_id, score")
    .not("score", "is", null);

  const gradesByStudent = new Map<string, number[]>();
  for (const g of gradesData ?? []) {
    const arr = gradesByStudent.get(g.student_id) ?? [];
    arr.push(g.score as number);
    gradesByStudent.set(g.student_id, arr);
  }

  // Attendance percentage per student
  const attByStudent = new Map<string, number>();
  for (const row of attSummary ?? []) {
    const existing = attByStudent.get(row.student_id);
    // Use min attendance across subjects (worst case)
    if (existing === undefined || (row.attendance_pct ?? 100) < existing) {
      attByStudent.set(row.student_id, row.attendance_pct ?? 100);
    }
  }

  // Event signups per student
  const signupsByStudent = new Map<string, number>();
  for (const s of signupStudents ?? []) {
    signupsByStudent.set(s.student_id, (signupsByStudent.get(s.student_id) ?? 0) + 1);
  }

  const heatmapData = (allStudents ?? []).map((s) => {
    const scores = gradesByStudent.get(s.id) ?? [];
    const avgGrade = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const attPct = attByStudent.get(s.id) ?? null;
    const signups = signupsByStudent.get(s.id) ?? 0;

    return {
      id: s.id,
      fullName: s.full_name,
      courseYear: s.course_year,
      attendancePct: attPct,
      avgGrade,
      signupCount: signups,
    };
  });

  // ── Pending reports table ─────────────────────────────────
  const pendingReportsData: Array<{
    teacherId: string;
    teacherName: string;
    unsubmittedCount: number;
    oldestPending: string | null;
  }> = [];

  for (const t of overdueTeachers ?? []) {
    const { data: teacher } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", t.teacher_id)
      .single();

    pendingReportsData.push({
      teacherId: t.teacher_id,
      teacherName: teacher?.full_name ?? "—",
      unsubmittedCount: t.unsubmitted_count,
      oldestPending: t.oldest_pending,
    });
  }

  // ── Unassigned lessons ────────────────────────────────────
  const { data: unassignedLessons } = await supabase
    .from("lessons")
    .select("id, starts_at, ends_at, subjects(name)")
    .is("teacher_id", null)
    .is("deleted_at", null)
    .gt("starts_at", now.toISOString())
    .order("starts_at")
    .limit(20);

  // Teachers list for assignment
  const { data: teachers } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "teacher")
    .is("deleted_at", null)
    .order("full_name");

  return (
    <RiskDashboardClient
      kpi={{
        atRiskStudents: atRiskIds.size,
        overdueTeachers: overdueTeachers?.length ?? 0,
        avgAttendance,
        participationRate,
      }}
      heatmapData={heatmapData}
      pendingReports={pendingReportsData}
      unassignedLessons={(unassignedLessons ?? []).map((l) => ({
        id: l.id,
        subjectName: (l.subjects as unknown as { name: string })?.name ?? "—",
        startsAt: l.starts_at,
        endsAt: l.ends_at,
      }))}
      teachers={(teachers ?? []).map((t) => ({ id: t.id, fullName: t.full_name }))}
    />
  );
}
