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
    : new Date(new Date().getFullYear(), 8, 1); // Sep 1 fallback

  const daysSinceSemester = Math.floor(
    (Date.now() - semesterStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

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

    // R-01: Low attendance (< 70% in any subject, last 30d)
    const { data: attData } = await supabase
      .from("attendance")
      .select("status, lessons!inner(subject_id, starts_at, deleted_at)")
      .eq("student_id", sid)
      .is("lessons.deleted_at", null)
      .gte("lessons.starts_at", thirtyDaysAgo);

    if (attData && attData.length > 0) {
      // Group by subject
      const bySubject = new Map<string, { total: number; present: number }>();
      for (const a of attData) {
        const subId = (a.lessons as unknown as { subject_id: string }).subject_id;
        const entry = bySubject.get(subId) ?? { total: 0, present: 0 };
        entry.total++;
        if (a.status === "present") entry.present++;
        bySubject.set(subId, entry);
      }

      for (const [, stats] of bySubject) {
        const pct = stats.total > 0 ? (stats.present / stats.total) * 100 : 100;
        if (pct < 70) {
          allRecs.push({
            user_id: sid,
            rule_id: "R-01",
            category: "academic",
            next_action: `Посещаемость ниже 70% (${Math.round(pct)}%). Старайтесь не пропускать занятия.`,
            priority_score: 0.9,
          });
          break; // one rec per rule
        }
      }
    }

    // R-03: Grade decline (last 10 grades slope < -5)
    const { data: gradeData } = await supabase
      .from("grades")
      .select("score, graded_at")
      .eq("student_id", sid)
      .not("score", "is", null)
      .order("graded_at", { ascending: true })
      .limit(10);

    if (gradeData && gradeData.length >= 5) {
      // Simple linear regression
      const n = gradeData.length;
      const xs = gradeData.map((_, i) => i);
      const ys = gradeData.map((g) => g.score as number);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      if (slope < -5) {
        allRecs.push({
          user_id: sid,
          rule_id: "R-03",
          category: "academic",
          next_action: "Оценки снижаются. Обратитесь к преподавателю за консультацией.",
          priority_score: 0.8,
        });
      }
    }

    // R-04: No social activity (0 signups, >30d into semester)
    if (daysSinceSemester > 30) {
      const { count } = await supabase
        .from("event_signups")
        .select("*", { count: "exact", head: true })
        .eq("student_id", sid);

      if ((count ?? 0) === 0) {
        allRecs.push({
          user_id: sid,
          rule_id: "R-04",
          category: "social",
          next_action: "Вы ещё не участвовали в клубных мероприятиях. Посмотрите объявления!",
          priority_score: 0.5,
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

    // R-02: Grade entry overdue (>48h since lesson ended, no report)
    const { data: overdue } = await supabase
      .from("lessons")
      .select("id")
      .eq("teacher_id", tid)
      .is("deleted_at", null)
      .is("report_submitted_at", null)
      .lt("ends_at", fortyEightHoursAgo)
      .limit(1);

    if (overdue && overdue.length > 0) {
      allRecs.push({
        user_id: tid,
        rule_id: "R-02",
        category: "academic",
        next_action: "Есть уроки без отчёта более 48 часов. Заполните отчёт.",
        priority_score: 0.8,
      });
    }

    // R-05: >3 pending reports
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
        next_action: `${pendingCount} незакрытых отчётов. Пожалуйста, закройте отчёты.`,
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

  // R-06: Unassigned lessons
  const { count: unassignedCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .is("teacher_id", null)
    .is("deleted_at", null)
    .gt("starts_at", now);

  if ((unassignedCount ?? 0) > 0) {
    for (const admin of admins ?? []) {
      allRecs.push({
        user_id: admin.id,
        rule_id: "R-06",
        category: "admin",
        next_action: `${unassignedCount} уроков без преподавателя. Назначьте преподавателей.`,
        priority_score: 0.85,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UPSERT: top 3 per user, resolve old ones
  // ═══════════════════════════════════════════════════════════

  // Group by user
  const byUser = new Map<string, Recommendation[]>();
  for (const rec of allRecs) {
    const arr = byUser.get(rec.user_id) ?? [];
    arr.push(rec);
    byUser.set(rec.user_id, arr);
  }

  let upsertedCount = 0;
  let resolvedCount = 0;

  for (const [userId, recs] of byUser) {
    // Sort by priority descending, keep top 3
    const top3 = recs
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 3);

    const activeRuleIds = top3.map((r) => r.rule_id);

    // Upsert top 3
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

    // Resolve rules that no longer fire for this user
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
