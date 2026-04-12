import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeminiRec {
  title: string;
  description: string;
  action: string;
  expected_effect: string;
}

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

// ── Gemini REST helper ──────────────────────────────────────────────────────
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const SYSTEM_PROMPT =
  "Ты куратор KBTU. Отвечай СТРОГО JSON без markdown-блоков. Поля: title (3-4 слова), description (1-2 предложения с конкретными данными), action (1 краткое конкретное действие), expected_effect (ожидаемый результат). Всё на русском, без воды.";

async function callGemini(userPrompt: string): Promise<GeminiRec | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(raw) as GeminiRec;
  } catch {
    return null;
  }
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

  const { data: students } = await supabase
    .from("users")
    .select("id")
    .eq("role", "student")
    .is("deleted_at", null);

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
        const sName = subjectName.get(worstSubjId) ?? "предмету";
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
          const days = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
          nextInfo = `. Следующее занятие: ${days[d.getDay()]}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        }

        const fallbackText = `По предмету **${sName}** посещаемость ${Math.round(worstPct)}%${tName ? ` (преп. ${tName})` : ""}${nextInfo}. Старайтесь не пропускать.`;

        const ai = await callGemini(
          `Студент имеет посещаемость ${Math.round(worstPct)}% по предмету "${sName}"${tName ? `, преподаватель ${tName}` : ""}${nextInfo}. Норма ≥70%.`
        );

        allRecs.push({
          user_id: sid,
          rule_id: "R-01",
          category: "academic",
          next_action: ai?.description ?? fallbackText,
          priority_score: 0.9,
          title: ai?.title ?? "Улучшить посещаемость",
          action: ai?.action ?? `Посетить все занятия по ${sName} на следующей неделе`,
          expected_effect: ai?.expected_effect ?? "Повышение академической успеваемости на 10-15%",
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

        const sName = subjectName.get(topSubjId) ?? "предметам";
        const lastThree = ys.slice(-3).join("→");
        const lastLesson = gradeData[gradeData.length - 1].lessons as unknown as { teacher_id: string | null };
        const tName = lastLesson.teacher_id ? teacherName.get(lastLesson.teacher_id) : null;

        const fallbackText = `Оценки снижаются по **${sName}**: ${lastThree}${tName ? `. Обратитесь к преподавателю **${tName}**` : ". Обратитесь к преподавателю за консультацией"}.`;

        const ai = await callGemini(
          `Оценки студента снижаются по предмету "${sName}", последние три: ${lastThree}. Тренд: ${slope.toFixed(1)} балл/урок${tName ? `. Преподаватель: ${tName}` : ""}.`
        );

        allRecs.push({
          user_id: sid,
          rule_id: "R-03",
          category: "academic",
          next_action: ai?.description ?? fallbackText,
          priority_score: 0.8,
          title: ai?.title ?? "Повысить успеваемость",
          action: ai?.action ?? `Записаться на консультацию по ${sName}`,
          expected_effect: ai?.expected_effect ?? "Стабилизация оценок на уровне 70+",
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
          nearestEvent = `"${ev.title}" (${club}) — ${d.toLocaleDateString("ru-RU")}`;
          eventHint = nearestEvent;
        }

        const fallbackText = `Вы ещё не участвовали в клубных мероприятиях. ${eventHint ? `Ближайшее: **${eventHint}**.` : "Посмотрите объявления клубов!"}`;

        const ai = await callGemini(
          `Студент не участвовал ни в одном мероприятии за ${daysSinceSemester} дней семестра.${nearestEvent ? ` Ближайшее событие: ${nearestEvent}.` : ""}`
        );

        allRecs.push({
          user_id: sid,
          rule_id: "R-04",
          category: "social",
          next_action: ai?.description ?? fallbackText,
          priority_score: 0.5,
          title: ai?.title ?? "Присоединиться к клубу",
          action: ai?.action ?? "Записаться на ближайшее мероприятие клуба",
          expected_effect: ai?.expected_effect ?? "Улучшение soft skills, расширение круга общения",
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
        if (attPct < 70) weakAreas.push(`посещаемость ${Math.round(attPct)}%`);
        if (gpa < 2.0) weakAreas.push(`GPA ${gpa.toFixed(2)}`);
        if ((signupCount ?? 0) === 0) weakAreas.push("нет активности в клубах");
        if (!checkins || checkins.length === 0) weakAreas.push("нет данных check-in");

        const fallbackText = `Индекс вовлечённости ${engagement}/100. Слабые стороны: ${weakAreas.join(", ")}.`;

        const ai = await callGemini(
          `Индекс вовлечённости студента низкий: ${engagement}/100. Слабые стороны: ${weakAreas.join(", ")}.`
        );

        allRecs.push({
          user_id: sid,
          rule_id: "R-07",
          category: "academic",
          next_action: ai?.description ?? fallbackText,
          priority_score: 0.95,
          title: ai?.title ?? "Повысить вовлечённость",
          action: ai?.action ?? "Обратитесь к куратору для составления плана",
          expected_effect: ai?.expected_effect ?? "Рост индекса вовлечённости на 15+ пунктов",
          deadline: addDays(7),
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEACHER RULES
  // ═══════════════════════════════════════════════════════════════════════

  const { data: teachers } = await supabase
    .from("users")
    .select("id")
    .eq("role", "teacher")
    .is("deleted_at", null);

  for (const teacher of teachers ?? []) {
    const tid = teacher.id;

    // ── R-02: Grade entry overdue ──────────────────────────────────────────
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
        next_action: `${overdue.length} урок(ов) без отчёта по **${subjects.join(", ")}** (старейший: ${hoursAgo}ч назад).`,
        priority_score: 0.8,
        title: "Закрыть отчёты",
        action: `Заполнить отчёты по ${subjects.join(", ")}`,
        expected_effect: "Актуальные данные для студентов и администрации",
        deadline: addDays(1),
      });
    }

    // ── R-05: >3 pending reports ───────────────────────────────────────────
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
        title: "Незакрытые отчёты",
        action: "Открыть раздел «Мои уроки» и закрыть все просроченные отчёты",
        expected_effect: "Соответствие требованиям администрации",
        deadline: addDays(2),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN RULES
  // ═══════════════════════════════════════════════════════════════════════

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null);

  // ── R-06: Unassigned lessons ───────────────────────────────────────────
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
        title: "Назначить преподавателей",
        action: `Назначить преподавателя на уроки: ${subjects.join(", ")}`,
        expected_effect: "Студенты не останутся без занятий",
        deadline: nearestDate,
      });
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
