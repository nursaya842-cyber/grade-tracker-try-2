import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recommendation {
  user_id: string;
  rule_id: string;
  category: "academic" | "social" | "admin";
  next_action: string;
  priority_score: number;
  title: string;
  action: string;
  expected_effect: string;
  deadline: string | null;
}


function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Optional: process only one student (on-demand from profile view)
  let targetStudentId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    targetStudentId = body?.studentId ?? null;
  } catch { /* no body */ }

  // If single student: check freshness — skip if recs were generated < 24h ago
  if (targetStudentId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("recommendations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetStudentId)
      .is("resolved_at", null)
      .is("dismissed_at", null)
      .gte("created_at", oneDayAgo);
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "fresh" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const allRecs: Recommendation[] = [];

  // ─── Semester start ─────────────────────────────────────────────────────
  const { data: semConfig } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "semester_start")
    .maybeSingle();

  const semesterStart = semConfig?.value
    ? new Date(semConfig.value)
    : new Date(new Date().getFullYear(), 8, 1);

  const daysSinceSemester = Math.floor(
    (Date.now() - semesterStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // ─── Lookup maps ─────────────────────────────────────────────────────────
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name")
    .is("deleted_at", null);
  const subjectName = new Map((subjectRows ?? []).map((s) => [s.id, s.name]));

  const { data: teacherRows } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "teacher")
    .is("deleted_at", null);
  const teacherName = new Map((teacherRows ?? []).map((t) => [t.id, t.full_name]));

  // ═══════════════════════════════════════════════════════════════════════
  // STUDENT RULES
  // ═══════════════════════════════════════════════════════════════════════

  // If on-demand (single student) — only fetch that one; else process all
  let studentsQuery = supabase.from("users").select("id").eq("role", "student").is("deleted_at", null);
  if (targetStudentId) studentsQuery = studentsQuery.eq("id", targetStudentId);
  const { data: students } = await studentsQuery;

  for (const student of students ?? []) {
    const sid = student.id;

    // ── R-01: Low attendance ───────────────────────────────────────────────
    const { data: attData } = await supabase
      .from("attendance")
      .select("status, lessons!inner(subject_id, teacher_id, starts_at, deleted_at)")
      .eq("student_id", sid)
      .is("lessons.deleted_at", null)
      .gte("lessons.starts_at", thirtyDaysAgo);

    if (attData && attData.length > 0) {
      const bySubject = new Map<string, { total: number; present: number; teacherId: string | null }>();
      for (const a of attData) {
        const lesson = a.lessons as unknown as { subject_id: string; teacher_id: string | null };
        const entry = bySubject.get(lesson.subject_id) ?? { total: 0, present: 0, teacherId: lesson.teacher_id };
        entry.total++;
        if (a.status === "present") entry.present++;
        bySubject.set(lesson.subject_id, entry);
      }

      let worstSubjId: string | null = null;
      let worstPct = 100;
      for (const [subjId, stats] of bySubject) {
        const pct = stats.total > 0 ? (stats.present / stats.total) * 100 : 100;
        if (pct < 70 && pct < worstPct) {
          worstPct = pct;
          worstSubjId = subjId;
        }
      }

      if (worstSubjId) {
        const subjStats = bySubject.get(worstSubjId)!;
        const sName = subjectName.get(worstSubjId) ?? "subject";
        const tName = subjStats.teacherId ? teacherName.get(subjStats.teacherId) : null;

        const { data: nextLesson } = await supabase
          .from("lesson_students")
          .select("lessons!inner(starts_at, subject_id)")
          .eq("student_id", sid)
          .eq("lessons.subject_id", worstSubjId)
          .is("lessons.deleted_at", null)
          .gt("lessons.starts_at", now)
          .order("lessons.starts_at", { ascending: true })
          .limit(1);

        let nextInfo = "";
        if (nextLesson && nextLesson.length > 0) {
          const ls = nextLesson[0].lessons as unknown as { starts_at: string };
          const d = new Date(ls.starts_at);
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          nextInfo = `. Next class: ${days[d.getDay()]}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        }

        allRecs.push({
          user_id: sid, rule_id: "R-01", category: "academic",
          next_action: `Attendance for **${sName}** is ${Math.round(worstPct)}%${tName ? ` (teacher: ${tName})` : ""}${nextInfo}. Try not to miss classes.`,
          priority_score: 0.9,
          title: "Improve Attendance",
          action: `Attend all classes for ${sName} next week`,
          expected_effect: "Improve academic performance by 10–15%",
          deadline: addDays(7),
        });
      }
    }

    // ── R-03: Grade decline ────────────────────────────────────────────────
    const { data: gradeData } = await supabase
      .from("grades")
      .select("score, graded_at, lessons!inner(subject_id, teacher_id)")
      .eq("student_id", sid)
      .not("score", "is", null)
      .order("graded_at", { ascending: true })
      .limit(10);

    if (gradeData && gradeData.length >= 5) {
      const n = gradeData.length;
      const ys = gradeData.map((g) => g.score as number);
      const xs = gradeData.map((_, i) => i);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      if (slope < -5) {
        const subjCounts = new Map<string, number>();
        for (const g of gradeData) {
          const lesson = g.lessons as unknown as { subject_id: string; teacher_id: string | null };
          subjCounts.set(lesson.subject_id, (subjCounts.get(lesson.subject_id) ?? 0) + 1);
        }
        let topSubjId = "";
        let topCount = 0;
        for (const [s2, cnt] of subjCounts) {
          if (cnt > topCount) { topSubjId = s2; topCount = cnt; }
        }

        const sName = subjectName.get(topSubjId) ?? "subjects";
        const lastThree = ys.slice(-3).join("→");
        const lastLesson = gradeData[gradeData.length - 1].lessons as unknown as { teacher_id: string | null };
        const tName = lastLesson.teacher_id ? teacherName.get(lastLesson.teacher_id) : null;

        allRecs.push({
          user_id: sid, rule_id: "R-03", category: "academic",
          next_action: `Grades are declining in **${sName}**: ${lastThree}${tName ? `. Consult your teacher **${tName}**` : ". Consult your teacher for advice"}.`,
          priority_score: 0.8,
          title: "Improve Academic Performance",
          action: `Schedule a consultation for ${sName}`,
          expected_effect: "Grade stabilization at 70+ level",
          deadline: addDays(14),
        });
      }
    }

    // ── R-04: No social activity ───────────────────────────────────────────
    if (daysSinceSemester > 30) {
      const { count } = await supabase
        .from("event_signups")
        .select("*", { count: "exact", head: true })
        .eq("student_id", sid);

      if ((count ?? 0) === 0) {
        const { data: upcomingEvents } = await supabase
          .from("club_announcements")
          .select("title, clubs!inner(name), starts_at")
          .is("deleted_at", null)
          .gt("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(1);

        let eventHint = "";
        let nearestEvent = "";
        if (upcomingEvents && upcomingEvents.length > 0) {
          const ev = upcomingEvents[0];
          const club = (ev.clubs as unknown as { name: string })?.name;
          const d = new Date(ev.starts_at);
          nearestEvent = `"${ev.title}" (${club}) — ${d.toLocaleDateString("en-GB")}`;
          eventHint = nearestEvent;
        }

        allRecs.push({
          user_id: sid, rule_id: "R-04", category: "social",
          next_action: `You haven't participated in any club events yet. ${eventHint ? `Nearest: **${eventHint}**.` : "Check club announcements!"}`,
          priority_score: 0.5,
          title: "Join a Club",
          action: "Sign up for the nearest club event",
          expected_effect: "Improve soft skills and expand social network",
          deadline: addDays(14),
        });
      }
    }

    // ── R-07: Low Engagement Score ─────────────────────────────────────────
    {
      const totalAtt = attData?.length ?? 0;
      const presentAtt = attData?.filter((a) => a.status === "present").length ?? 0;
      const attPct = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 50;

      const allScores = (gradeData ?? []).map((g) => g.score as number).filter((s) => s != null);
      const gpaPoints = allScores.map((s) => {
        if (s >= 95) return 4.0;
        if (s >= 90) return 3.67;
        if (s >= 85) return 3.33;
        if (s >= 80) return 3.0;
        if (s >= 75) return 2.67;
        if (s >= 70) return 2.33;
        if (s >= 65) return 2.0;
        if (s >= 60) return 1.67;
        if (s >= 55) return 1.33;
        if (s >= 50) return 1.0;
        return 0;
      });
      const gpa = gpaPoints.length > 0 ? gpaPoints.reduce((a, b) => a + b, 0) / gpaPoints.length : 0;

      const { count: signupCount } = await supabase
        .from("event_signups")
        .select("*", { count: "exact", head: true })
        .eq("student_id", sid);

      const { data: checkins } = await supabase
        .from("student_checkins")
        .select("stress_level, motivation_level, workload_feeling, understanding, satisfaction")
        .eq("student_id", sid)
        .order("week_start", { ascending: false })
        .limit(4);

      let checkinNorm = 50;
      if (checkins && checkins.length > 0) {
        let total = 0;
        for (const c of checkins) {
          total += ((10 - c.stress_level) + c.motivation_level + (10 - c.workload_feeling) + c.understanding + c.satisfaction) / 5;
        }
        checkinNorm = (total / checkins.length) * 10;
      }

      const engagement = Math.round(
        0.35 * Math.min(attPct, 100) +
        0.30 * (gpa / 4.0) * 100 +
        0.20 * Math.min((signupCount ?? 0) / 3, 1) * 100 +
        0.15 * checkinNorm
      );

      if (engagement < 40) {
        const weakAreas: string[] = [];
        if (attPct < 70) weakAreas.push(`attendance ${Math.round(attPct)}%`);
        if (gpa < 2.0) weakAreas.push(`GPA ${gpa.toFixed(2)}`);
        if ((signupCount ?? 0) === 0) weakAreas.push("no club activity");
        if (!checkins || checkins.length === 0) weakAreas.push("no check-in data");

        allRecs.push({
          user_id: sid, rule_id: "R-07", category: "academic",
          next_action: `Engagement index ${engagement}/100. Weak areas: ${weakAreas.join(", ")}.`,
          priority_score: 0.95,
          title: "Improve Engagement",
          action: "Contact your advisor to build a plan",
          expected_effect: "Engagement index growth by 15+ points",
          deadline: addDays(7),
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEACHER + ADMIN RULES (only for cron/batch runs, not on-demand)
  // ═══════════════════════════════════════════════════════════════════════

  if (!targetStudentId) {
    const { data: teachers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "teacher")
      .is("deleted_at", null);

    for (const teacher of teachers ?? []) {
      const tid = teacher.id;

      // ── R-02: Grade entry overdue ────────────────────────────────────────
      const { data: overdue } = await supabase
        .from("lessons")
        .select("id, subject_id, ends_at")
        .eq("teacher_id", tid)
        .is("deleted_at", null)
        .is("report_submitted_at", null)
        .lt("ends_at", fortyEightHoursAgo)
        .order("ends_at", { ascending: true })
        .limit(3);

      if (overdue && overdue.length > 0) {
        const subjects = [...new Set(overdue.map((l) => subjectName.get(l.subject_id) ?? "?"))];
        const oldest = new Date(overdue[0].ends_at);
        const hoursAgo = Math.round((Date.now() - oldest.getTime()) / 3600000);

        allRecs.push({
          user_id: tid, rule_id: "R-02", category: "academic",
          next_action: `${overdue.length} lesson(s) without report for **${subjects.join(", ")}** (oldest: ${hoursAgo}h ago).`,
          priority_score: 0.8,
          title: "Close Reports",
          action: `Fill in reports for ${subjects.join(", ")}`,
          expected_effect: "Up-to-date data for students and administration",
          deadline: addDays(1),
        });
      }

      // ── R-05: >3 pending reports ─────────────────────────────────────────
      const { count: pendingCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", tid)
        .is("deleted_at", null)
        .is("report_submitted_at", null)
        .lt("ends_at", now);

      if ((pendingCount ?? 0) > 3) {
        allRecs.push({
          user_id: tid, rule_id: "R-05", category: "admin",
          next_action: `**${pendingCount}** pending reports. Please close all reports as soon as possible.`,
          priority_score: 0.9,
          title: "Pending Reports",
          action: "Open My Lessons section and close all overdue reports",
          expected_effect: "Compliance with administration requirements",
          deadline: addDays(2),
        });
      }
    }

    // ── R-06: Unassigned lessons ───────────────────────────────────────────
    const { data: admins } = await supabase
      .from("users").select("id").eq("role", "admin").is("deleted_at", null);

    const { data: unassigned } = await supabase
      .from("lessons")
      .select("id, subject_id, starts_at")
      .is("teacher_id", null)
      .is("deleted_at", null)
      .gt("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(5);

    if (unassigned && unassigned.length > 0) {
      const subjects = [...new Set(unassigned.map((l) => subjectName.get(l.subject_id) ?? "?"))];
      const nearestDate = new Date(unassigned[0].starts_at).toLocaleDateString("en-GB");

      for (const admin of admins ?? []) {
        allRecs.push({
          user_id: admin.id, rule_id: "R-06", category: "admin",
          next_action: `**${unassigned.length}** lessons without a teacher (${subjects.join(", ")}). Nearest: ${nearestDate}.`,
          priority_score: 0.85,
          title: "Assign Teachers",
          action: `Assign a teacher to lessons: ${subjects.join(", ")}`,
          expected_effect: "Students won't be left without classes",
          deadline: nearestDate,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UPSERT: top 3 per user
  // ═══════════════════════════════════════════════════════════════════════

  const byUser = new Map<string, Recommendation[]>();
  for (const rec of allRecs) {
    const arr = byUser.get(rec.user_id) ?? [];
    arr.push(rec);
    byUser.set(rec.user_id, arr);
  }

  let upsertedCount = 0;

  for (const [userId, recs] of byUser) {
    const top3 = recs
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 3);

    const activeRuleIds = top3.map((r) => r.rule_id);

    for (const rec of top3) {
      await supabase.from("recommendations").upsert(
        {
          user_id: rec.user_id,
          rule_id: rec.rule_id,
          category: rec.category,
          next_action: rec.next_action,
          priority_score: rec.priority_score,
          title: rec.title,
          action: rec.action,
          expected_effect: rec.expected_effect,
          deadline: rec.deadline,
          resolved_at: null,
        },
        { onConflict: "user_id,rule_id" }
      );
      upsertedCount++;
    }

    // Resolve rules that no longer fire
    await supabase
      .from("recommendations")
      .update({ resolved_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("resolved_at", null)
      .is("dismissed_at", null)
      .not("rule_id", "in", `(${activeRuleIds.join(",")})`);
  }

  // Resolve all recs for users with NO active rules
  const allUserIds = new Set(byUser.keys());
  const allActiveUsers = [...(students ?? []), ...(teachers ?? []), ...(admins ?? [])];
  let resolvedCount = 0;
  for (const u of allActiveUsers) {
    if (!allUserIds.has(u.id)) {
      const { count } = await supabase
        .from("recommendations")
        .update({ resolved_at: new Date().toISOString() })
        .eq("user_id", u.id)
        .is("resolved_at", null)
        .is("dismissed_at", null);
      if (count) resolvedCount += count;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      upserted: upsertedCount,
      resolved: resolvedCount,
      totalRecsGenerated: allRecs.length,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
