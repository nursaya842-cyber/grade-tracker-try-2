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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const allRecs: Recommendation[] = [];

  // ─── Get semester start for "30 days into semester" check ──
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

  // ─── Pre-fetch subject names ────────────────────────────
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name")
    .is("deleted_at", null);
  const subjectName = new Map((subjectRows ?? []).map((s) => [s.id, s.name]));

  // ─── Pre-fetch teacher names ────────────────────────────
  const { data: teacherRows } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "teacher")
    .is("deleted_at", null);
  const teacherName = new Map((teacherRows ?? []).map((t) => [t.id, t.full_name]));

  // ═══════════════════════════════════════════════════════════
  // STUDENT RULES
  // ═══════════════════════════════════════════════════════════

  const { data: students } = await supabase
    .from("users")
    .select("id")
    .eq("role", "student")
    .is("deleted_at", null);

  for (const student of students ?? []) {
    const sid = student.id;

    // ── R-01: Low attendance (< 70% in any subject, last 30d) ──
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

      // Find worst subject
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
        const sName = subjectName.get(worstSubjId) ?? "предмету";
        const tName = subjStats.teacherId ? teacherName.get(subjStats.teacherId) : null;

        // Find next lesson for this subject
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
          const days = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
          nextInfo = `. Следующее занятие: ${days[d.getDay()]}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        }

        allRecs.push({
          user_id: sid,
          rule_id: "R-01",
          category: "academic",
          next_action: `По предмету **${sName}** посещаемость ${Math.round(worstPct)}%${tName ? ` (преп. ${tName})` : ""}${nextInfo}. Старайтесь не пропускать.`,
          priority_score: 0.9,
        });
      }
    }

    // ── R-03: Grade decline (last 10 grades, slope < -5) ──
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
        // Find the subject with most declining grades
        const subjCounts = new Map<string, number>();
        for (const g of gradeData) {
          const lesson = g.lessons as unknown as { subject_id: string; teacher_id: string | null };
          subjCounts.set(lesson.subject_id, (subjCounts.get(lesson.subject_id) ?? 0) + 1);
        }
        let topSubjId = "";
        let topCount = 0;
        for (const [sid2, cnt] of subjCounts) {
          if (cnt > topCount) { topSubjId = sid2; topCount = cnt; }
        }

        const sName = subjectName.get(topSubjId) ?? "предметам";
        const lastThree = ys.slice(-3).join("→");
        const lastLesson = gradeData[gradeData.length - 1].lessons as unknown as { teacher_id: string | null };
        const tName = lastLesson.teacher_id ? teacherName.get(lastLesson.teacher_id) : null;

        allRecs.push({
          user_id: sid,
          rule_id: "R-03",
          category: "academic",
          next_action: `Оценки снижаются по **${sName}**: ${lastThree}${tName ? `. Обратитесь к преподавателю **${tName}**` : ". Обратитесь к преподавателю за консультацией"}.`,
          priority_score: 0.8,
        });
      }
    }

    // ── R-04: No social activity (0 signups, >30d into semester) ──
    if (daysSinceSemester > 30) {
      const { count } = await supabase
        .from("event_signups")
        .select("*", { count: "exact", head: true })
        .eq("student_id", sid);

      if ((count ?? 0) === 0) {
        // Find clubs with upcoming events
        const { data: upcomingEvents } = await supabase
          .from("club_announcements")
          .select("title, clubs!inner(name), starts_at")
          .is("deleted_at", null)
          .gt("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(1);

        let eventHint = "Посмотрите объявления клубов!";
        if (upcomingEvents && upcomingEvents.length > 0) {
          const ev = upcomingEvents[0];
          const club = (ev.clubs as unknown as { name: string })?.name;
          const d = new Date(ev.starts_at);
          eventHint = `Ближайшее: **${ev.title}** (${club}) — ${d.toLocaleDateString("ru-RU")}.`;
        }

        allRecs.push({
          user_id: sid,
          rule_id: "R-04",
          category: "social",
          next_action: `Вы ещё не участвовали в клубных мероприятиях. ${eventHint}`,
          priority_score: 0.5,
        });
      }
    }

    // ── R-07: Low Engagement Score (< 40) ──
    // Compute engagement inline (same formula as src/lib/engagement.ts)
    {
      // Attendance %
      const totalAtt = attData?.length ?? 0;
      const presentAtt = attData?.filter((a) => a.status === "present").length ?? 0;
      const attPct = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 50;

      // GPA
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

      // Event signups
      const { count: signupCount } = await supabase
        .from("event_signups")
        .select("*", { count: "exact", head: true })
        .eq("student_id", sid);

      // Check-in average (last 4)
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
        const tips: string[] = [];
        if (attPct < 70) tips.push("посещайте занятия регулярно");
        if (gpa < 2.0) tips.push("уделите внимание учёбе");
        if ((signupCount ?? 0) === 0) tips.push("запишитесь на мероприятие клуба");
        if (!checkins || checkins.length === 0) tips.push("заполните еженедельный опрос");

        allRecs.push({
          user_id: sid,
          rule_id: "R-07",
          category: "academic",
          next_action: `Ваш индекс вовлечённости низкий (${engagement}/100). Рекомендуем: ${tips.length > 0 ? tips.join(", ") : "обратитесь к куратору"}.`,
          priority_score: 0.95,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TEACHER RULES
  // ═══════════════════════════════════════════════════════════

  const { data: teachers } = await supabase
    .from("users")
    .select("id")
    .eq("role", "teacher")
    .is("deleted_at", null);

  for (const teacher of teachers ?? []) {
    const tid = teacher.id;

    // ── R-02: Grade entry overdue (>48h) with specific subject ──
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
        user_id: tid,
        rule_id: "R-02",
        category: "academic",
        next_action: `${overdue.length} урок(ов) без отчёта по **${subjects.join(", ")}** (старейший: ${hoursAgo}ч назад). Заполните отчёт.`,
        priority_score: 0.8,
      });
    }

    // ── R-05: >3 pending reports ──
    const { count: pendingCount } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", tid)
      .is("deleted_at", null)
      .is("report_submitted_at", null)
      .lt("ends_at", now);

    if ((pendingCount ?? 0) > 3) {
      allRecs.push({
        user_id: tid,
        rule_id: "R-05",
        category: "admin",
        next_action: `**${pendingCount}** незакрытых отчётов. Пожалуйста, закройте отчёты как можно скорее.`,
        priority_score: 0.9,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN RULES
  // ═══════════════════════════════════════════════════════════

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null);

  // ── R-06: Unassigned lessons ──
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
    const nearestDate = new Date(unassigned[0].starts_at).toLocaleDateString("ru-RU");

    for (const admin of admins ?? []) {
      allRecs.push({
        user_id: admin.id,
        rule_id: "R-06",
        category: "admin",
        next_action: `**${unassigned.length}** уроков без преподавателя (${subjects.join(", ")}). Ближайший: ${nearestDate}.`,
        priority_score: 0.85,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UPSERT: top 3 per user, resolve old ones
  // ═══════════════════════════════════════════════════════════

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
          resolved_at: null,
        },
        { onConflict: "user_id,rule_id" }
      );
      upsertedCount++;
    }

    // Resolve rules that no longer fire
    await supabase
      .from("recommendations")
      .update({ resolved_at: now })
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
        .update({ resolved_at: now })
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
