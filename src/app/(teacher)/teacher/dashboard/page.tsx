import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getEffectiveUserIdFromCookies } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { scoreToGpa } from "@/lib/utils";
import { calculateEngagement } from "@/lib/engagement";
import TeacherDashboardClient from "./_components/TeacherDashboardClient";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const effectiveId = await getEffectiveUserIdFromCookies(user.id);
  const service = svc();

  // 1. Unique student IDs enrolled in this teacher's lessons
  const { data: enrollments } = await supabase
    .from("lesson_students")
    .select("student_id, lessons!inner(teacher_id, deleted_at)")
    .eq("lessons.teacher_id", effectiveId)
    .is("lessons.deleted_at", null);

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id as string))];
  const totalStudents = studentIds.length;

  const emptyResult = {
    kpi: { totalStudents: 0, avgGpa: 0, avgAttendance: 0, atRiskCount: 0 },
    gradeDistribution: [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ],
    attendanceBySubject: [],
    engagementSegments: [],
    topStudents: [],
    gradeTrend: [],
  };

  if (studentIds.length === 0) {
    return <TeacherDashboardClient {...emptyResult} />;
  }

  // 2. All grades for these students
  const { data: allGrades } = await service
    .from("grades")
    .select("student_id, score")
    .in("student_id", studentIds)
    .not("score", "is", null);

  const gradesByStudent = new Map<string, number[]>();
  for (const g of allGrades ?? []) {
    const arr = gradesByStudent.get(g.student_id) ?? [];
    arr.push(g.score as number);
    gradesByStudent.set(g.student_id, arr);
  }

  // Average GPA
  const gpas = studentIds.map((id) => {
    const scores = gradesByStudent.get(id) ?? [];
    if (scores.length === 0) return 0;
    return scores.reduce((a, s) => a + scoreToGpa(s), 0) / scores.length;
  });
  const avgGpa =
    gpas.length > 0
      ? Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 100) / 100
      : 0;

  // 3. Attendance (30d)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAtt } = await service
    .from("attendance")
    .select("student_id, status, lessons!inner(starts_at, deleted_at)")
    .in("student_id", studentIds)
    .is("lessons.deleted_at", null)
    .gte("lessons.starts_at", thirtyDaysAgo);

  const attByStudent = new Map<string, { present: number; total: number }>();
  for (const a of recentAtt ?? []) {
    const cur = attByStudent.get(a.student_id) ?? { present: 0, total: 0 };
    cur.total++;
    if (a.status === "present") cur.present++;
    attByStudent.set(a.student_id, cur);
  }
  const attPcts = [...attByStudent.values()].map((v) =>
    v.total > 0 ? Math.round((v.present / v.total) * 100) : 0
  );
  const avgAttendance =
    attPcts.length > 0 ? Math.round(attPcts.reduce((a, b) => a + b, 0) / attPcts.length) : 0;

  // At-risk: attendance < 70%
  const { data: attSummary } = await service
    .from("v_student_attendance_summary")
    .select("student_id, attendance_pct")
    .in("student_id", studentIds);

  const atRiskCount = (attSummary ?? []).filter(
    (r) => r.attendance_pct !== null && r.attendance_pct < 70
  ).length;

  // 4. Grade distribution
  const allScores = (allGrades ?? []).map((g) => g.score as number);
  const gradeBuckets = [
    { range: "0-20", count: 0 },
    { range: "21-40", count: 0 },
    { range: "41-60", count: 0 },
    { range: "61-80", count: 0 },
    { range: "81-100", count: 0 },
  ];
  for (const score of allScores) {
    if (score <= 20) gradeBuckets[0].count++;
    else if (score <= 40) gradeBuckets[1].count++;
    else if (score <= 60) gradeBuckets[2].count++;
    else if (score <= 80) gradeBuckets[3].count++;
    else gradeBuckets[4].count++;
  }

  // 5. Attendance by subject (teacher's own lessons)
  const { data: teacherLessons } = await service
    .from("lessons")
    .select("id, subjects(name)")
    .eq("teacher_id", effectiveId)
    .is("deleted_at", null);

  // All attendance records for teacher's lessons
  const lessonIds = (teacherLessons ?? []).map((l) => l.id as string);
  const { data: lessonAtt } =
    lessonIds.length > 0
      ? await service
          .from("attendance")
          .select("lesson_id, status")
          .in("lesson_id", lessonIds)
          .in("student_id", studentIds)
      : { data: [] };

  // Map lesson → subject name
  const lessonSubjectMap = new Map<string, string>();
  for (const l of teacherLessons ?? []) {
    const subj =
      l.subjects && !Array.isArray(l.subjects)
        ? (l.subjects as { name: string }).name
        : "Unknown";
    lessonSubjectMap.set(l.id as string, subj);
  }

  const subjectAtt = new Map<string, { present: number; total: number }>();
  for (const a of lessonAtt ?? []) {
    const subj = lessonSubjectMap.get(a.lesson_id as string) ?? "Unknown";
    const cur = subjectAtt.get(subj) ?? { present: 0, total: 0 };
    cur.total++;
    if (a.status === "present") cur.present++;
    subjectAtt.set(subj, cur);
  }
  const attendanceBySubject = Array.from(subjectAtt.entries()).map(([subject, v]) => ({
    subject,
    attendance: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  // 6. Grade trend by month (grades with created_at)
  const { data: gradeTrendRaw } = await service
    .from("grades")
    .select("score, created_at")
    .in("student_id", studentIds)
    .not("score", "is", null)
    .order("created_at", { ascending: true });

  const monthMap = new Map<string, { sum: number; count: number }>();
  for (const g of gradeTrendRaw ?? []) {
    if (!g.created_at) continue;
    const d = new Date(g.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthMap.get(key) ?? { sum: 0, count: 0 };
    cur.sum += g.score as number;
    cur.count++;
    monthMap.set(key, cur);
  }
  const gradeTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month,
      avg: Math.round(v.sum / v.count),
    }));

  // 7. Engagement segments
  const { data: signups } = await service
    .from("event_signups")
    .select("student_id")
    .in("student_id", studentIds);

  const signupCount = new Map<string, number>();
  for (const s of signups ?? []) {
    signupCount.set(s.student_id, (signupCount.get(s.student_id) ?? 0) + 1);
  }

  const { data: checkins } = await service
    .from("student_checkins")
    .select("student_id, motivation_level, understanding")
    .in("student_id", studentIds)
    .order("week_start", { ascending: false });

  const checkinByStudent = new Map<string, number[]>();
  for (const c of checkins ?? []) {
    const arr = checkinByStudent.get(c.student_id) ?? [];
    if (arr.length < 4) arr.push((c.motivation_level + c.understanding) / 2);
    checkinByStudent.set(c.student_id, arr);
  }

  const segmentCounts = { "At Risk": 0, Declining: 0, Stable: 0, Excellent: 0 };
  const segmentColors: Record<string, string> = {
    "At Risk": "#f5222d",
    Declining: "#faad14",
    Stable: "#1677ff",
    Excellent: "#52c41a",
  };

  for (const id of studentIds) {
    const attData = attByStudent.get(id);
    const attPct = attData && attData.total > 0 ? (attData.present / attData.total) * 100 : 0;
    const scores = gradesByStudent.get(id) ?? [];
    const gpa =
      scores.length > 0
        ? scores.reduce((a, s) => a + scoreToGpa(s), 0) / scores.length
        : 0;
    const checkinVals = checkinByStudent.get(id) ?? [];
    const checkinAvg =
      checkinVals.length > 0 ? checkinVals.reduce((a, b) => a + b, 0) / checkinVals.length : null;
    const eng = calculateEngagement({
      attendancePct: attPct,
      gpa,
      eventSignups: signupCount.get(id) ?? 0,
      checkinAvg,
    });
    if (eng.segment === "at-risk") segmentCounts["At Risk"]++;
    else if (eng.segment === "declining") segmentCounts["Declining"]++;
    else if (eng.segment === "stable") segmentCounts["Stable"]++;
    else segmentCounts["Excellent"]++;
  }

  const engagementSegments = Object.entries(segmentCounts).map(([segment, count]) => ({
    segment,
    count,
    color: segmentColors[segment],
  }));

  // 8. Top 5 students by GPA
  const studentGpaList = studentIds
    .map((id) => {
      const scores = gradesByStudent.get(id) ?? [];
      if (scores.length === 0) return null;
      const gpa =
        Math.round((scores.reduce((a, s) => a + scoreToGpa(s), 0) / scores.length) * 100) / 100;
      return { id, gpa };
    })
    .filter((x): x is { id: string; gpa: number } => x !== null)
    .sort((a, b) => b.gpa - a.gpa)
    .slice(0, 5);

  const { data: topNames } =
    studentGpaList.length > 0
      ? await service
          .from("users")
          .select("id, full_name")
          .in("id", studentGpaList.map((s) => s.id))
      : { data: [] };

  const nameMap = new Map((topNames ?? []).map((u) => [u.id, u.full_name as string]));
  const topStudents = studentGpaList.map((s) => ({
    name: nameMap.get(s.id) ?? "Unknown",
    gpa: s.gpa,
  }));

  return (
    <TeacherDashboardClient
      kpi={{ totalStudents, avgGpa, avgAttendance, atRiskCount }}
      gradeDistribution={gradeBuckets}
      attendanceBySubject={attendanceBySubject}
      engagementSegments={engagementSegments}
      topStudents={topStudents}
      gradeTrend={gradeTrend}
    />
  );
}
