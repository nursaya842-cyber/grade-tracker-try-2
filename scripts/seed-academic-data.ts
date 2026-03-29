/**
 * Seed academic data: teachers, subjects, lessons, attendance, grades, clubs.
 * Period: 2026-03-01 to 2026-03-29
 *
 * Usage: npx tsx scripts/seed-academic-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "qweasdqwe123";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Config ───────────────────────────────────────────────
const START_DATE = new Date("2026-03-01");
const END_DATE = new Date("2026-03-29");
const NOW = new Date("2026-03-29T18:00:00+05:00"); // Almaty time
const BATCH = 500;

// ─── Helpers ──────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function batchInsert(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ❌ ${table} batch ${i}: ${error.message}`);
      // Try smaller batches on error
      for (const row of chunk) {
        const { error: e2 } = await supabase.from(table).insert(row);
        if (e2 && !e2.message.includes("duplicate")) {
          console.error(`    row error: ${e2.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

// Get dates matching days-of-week in range
function expandDates(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[] // 1=Mon..7=Sun
): Date[] {
  const dates: Date[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay() === 0 ? 7 : d.getDay(); // Convert JS Sunday=0 to ISO Sunday=7
    if (daysOfWeek.includes(dow)) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ─── Data Definitions ─────────────────────────────────────

const TEACHERS = [
  { name: "Асанова Айгуль Маратовна", email: "a.asanova@kbtu.kz" },
  { name: "Бекмуратов Ержан Кайратович", email: "e.bekmuratov@kbtu.kz" },
  { name: "Сулейменова Дана Бакытовна", email: "d.suleimenova@kbtu.kz" },
  { name: "Жумабеков Алмас Нурланович", email: "a.zhumabekov@kbtu.kz" },
  { name: "Турсынова Мадина Серикова", email: "m.tursynova@kbtu.kz" },
  { name: "Оспанов Тимур Абайевич", email: "t.ospanov@kbtu.kz" },
  { name: "Кенжебаева Асель Даулетовна", email: "a.kenzhebaeva@kbtu.kz" },
  { name: "Нурланов Бауыржан Ерболатович", email: "b.nurlanov@kbtu.kz" },
  { name: "Ахметова Карлыгаш Жандосовна", email: "k.akhmetova@kbtu.kz" },
  { name: "Мусин Данияр Асылханович", email: "d.musin@kbtu.kz" },
  { name: "Сатпаева Назерке Болатовна", email: "n.satpaeva@kbtu.kz" },
  { name: "Ибрагимов Руслан Маратович", email: "r.ibragimov@kbtu.kz" },
  { name: "Тлеуова Жансая Ермековна", email: "zh.tleuova@kbtu.kz" },
  { name: "Касымов Арман Бакытжанович", email: "a.kasymov@kbtu.kz" },
  { name: "Байжанова Лаура Канатовна", email: "l.baizhanova@kbtu.kz" },
];

const SUBJECTS = [
  "Математический анализ",
  "Линейная алгебра",
  "Физика",
  "Программирование на Python",
  "Базы данных",
  "Веб-разработка",
  "Алгоритмы и структуры данных",
  "Операционные системы",
  "Компьютерные сети",
  "Машинное обучение",
  "Экономическая теория",
  "Менеджмент",
  "Статистика",
  "Дискретная математика",
  "Теория вероятностей",
  "Химия",
  "Термодинамика",
  "Геология",
  "Философия",
  "Английский язык",
];

// Series: subject index, teacher index, days (ISO), slot
const SERIES_CONFIG = [
  { subj: 0, teacher: 0, days: [1, 3], slot: { start: "09:00", end: "10:30" } },
  { subj: 1, teacher: 0, days: [2, 4], slot: { start: "09:00", end: "10:30" } },
  { subj: 2, teacher: 1, days: [1, 3, 5], slot: { start: "10:45", end: "12:15" } },
  { subj: 3, teacher: 2, days: [2, 4], slot: { start: "10:45", end: "12:15" } },
  { subj: 4, teacher: 2, days: [1, 3], slot: { start: "13:00", end: "14:30" } },
  { subj: 5, teacher: 3, days: [2, 5], slot: { start: "13:00", end: "14:30" } },
  { subj: 6, teacher: 3, days: [1, 4], slot: { start: "14:45", end: "16:15" } },
  { subj: 7, teacher: 4, days: [3, 5], slot: { start: "09:00", end: "10:30" } },
  { subj: 8, teacher: 4, days: [2, 4], slot: { start: "14:45", end: "16:15" } },
  { subj: 9, teacher: 5, days: [1, 3], slot: { start: "10:45", end: "12:15" } },
  { subj: 10, teacher: 6, days: [2, 4], slot: { start: "13:00", end: "14:30" } },
  { subj: 11, teacher: 6, days: [1, 5], slot: { start: "09:00", end: "10:30" } },
  { subj: 12, teacher: 7, days: [3, 5], slot: { start: "13:00", end: "14:30" } },
  { subj: 13, teacher: 8, days: [1, 4], slot: { start: "09:00", end: "10:30" } },
  { subj: 14, teacher: 8, days: [2, 5], slot: { start: "10:45", end: "12:15" } },
  { subj: 15, teacher: 9, days: [3, 5], slot: { start: "14:45", end: "16:15" } },
  { subj: 16, teacher: 10, days: [1, 3], slot: { start: "14:45", end: "16:15" } },
  { subj: 17, teacher: 11, days: [2, 4], slot: { start: "09:00", end: "10:30" } },
  { subj: 18, teacher: 12, days: [1, 3], slot: { start: "13:00", end: "14:30" } },
  { subj: 19, teacher: 13, days: [2, 4, 5], slot: { start: "10:45", end: "12:15" } },
];

// Faculty → which subject indexes students take (by course year 1-2 vs 3-4+)
const FACULTY_SUBJECTS: Record<string, { junior: number[]; senior: number[] }> = {
  "School of Information Technology and Engineering": { junior: [0, 1, 2, 3, 19], senior: [4, 5, 6, 7, 8, 9] },
  "School of Applied Mathematics": { junior: [0, 1, 13, 14, 19], senior: [9, 12, 14, 6, 15] },
  "Business School": { junior: [0, 10, 11, 18, 19], senior: [11, 12, 10, 5, 9] },
  "International School of Economics": { junior: [0, 10, 12, 18, 19], senior: [10, 11, 14, 12, 9] },
  "School of Energy and Oil & Gas Industry": { junior: [0, 2, 15, 16, 19], senior: [16, 15, 7, 12, 8] },
  "School of Chemical Engineering": { junior: [0, 2, 15, 14, 19], senior: [15, 16, 12, 7, 17] },
  "School of Geology": { junior: [0, 2, 17, 14, 19], senior: [17, 15, 12, 16, 8] },
  "Kazakh Maritime Academy": { junior: [0, 2, 16, 18, 19], senior: [16, 8, 7, 12, 15] },
  "School of Materials Science and Green Technologies": { junior: [0, 2, 15, 13, 19], senior: [15, 16, 9, 12, 17] },
  "School of Natural and Social Sciences": { junior: [0, 2, 18, 14, 19], senior: [18, 12, 14, 10, 11] },
};

const CLUBS = [
  "IT Club",
  "Debate Club",
  "Sport Club",
  "Music Club",
  "Art & Design Club",
  "Business Club",
  "Volunteer Club",
  "Science Club",
];

const CLUB_EVENTS = [
  { title: "Хакатон KBTU 2026", desc: "48-часовой хакатон", venue: "Корпус C, Ауд. 301" },
  { title: "Дебаты: ИИ в образовании", desc: "Открытые дебаты на тему ИИ", venue: "Актовый зал" },
  { title: "Футбольный турнир", desc: "Межфакультетский турнир", venue: "Стадион KBTU" },
  { title: "Концерт весны", desc: "Ежегодный весенний концерт", venue: "Актовый зал" },
  { title: "Выставка студенческих работ", desc: "Дизайн и арт-проекты", venue: "Галерея, 2 этаж" },
  { title: "Startup Pitch Night", desc: "Презентация стартап-идей", venue: "Коворкинг KBTU" },
  { title: "Субботник в парке", desc: "Уборка территории", venue: "Парк рядом с KBTU" },
  { title: "Science Fair 2026", desc: "Научная ярмарка проектов", venue: "Лаборатории, 3 этаж" },
  { title: "CTF соревнование", desc: "Capture The Flag по кибербезопасности", venue: "Компьютерный класс 405" },
  { title: "Баскетбольный матч", desc: "KBTU vs. SDU", venue: "Спортзал" },
  { title: "Workshop: Figma для начинающих", desc: "Мастер-класс по дизайну", venue: "Ауд. 210" },
  { title: "Благотворительный забег", desc: "5 км благотворительный забег", venue: "Набережная" },
  { title: "Квиз-найт", desc: "Интеллектуальная викторина", venue: "Кафе KBTU" },
  { title: "Мастер-класс по ML", desc: "Введение в TensorFlow", venue: "Ауд. 301" },
  { title: "Поэтический вечер", desc: "Чтение стихов и прозы", venue: "Библиотека" },
  { title: "Кейс-чемпионат", desc: "Решение бизнес-кейсов", venue: "Ауд. 501" },
];

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Academic Data Seed (March 2026)");
  console.log("═══════════════════════════════════════════\n");

  // ── Step 1: Create Teachers ────────────────────────────
  console.log("1️⃣  Creating teachers...");
  const teacherIds: string[] = [];

  for (const t of TEACHERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: t.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { email: t.email, full_name: t.name, role: "teacher" },
    });
    if (error) {
      if (error.message.includes("already been registered")) {
        // Fetch existing
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", t.email)
          .single();
        if (existing) teacherIds.push(existing.id);
        continue;
      }
      console.error(`  ❌ ${t.email}: ${error.message}`);
      continue;
    }
    teacherIds.push(data.user.id);
  }
  console.log(`  ✅ ${teacherIds.length} teachers\n`);

  // ── Step 2: Create Subjects ────────────────────────────
  console.log("2️⃣  Creating subjects...");
  for (const name of SUBJECTS) {
    await supabase.from("subjects").upsert({ name }, { onConflict: "name" });
  }
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name")
    .is("deleted_at", null);
  const subjectMap = new Map((subjectRows ?? []).map((s) => [s.name, s.id]));
  const subjectIds = SUBJECTS.map((n) => subjectMap.get(n)!);
  console.log(`  ✅ ${subjectIds.length} subjects\n`);

  // ── Step 3: Create Lesson Series + Lessons ─────────────
  console.log("3️⃣  Creating lesson series & lessons...");
  const seriesIds: string[] = [];
  const allLessons: {
    id?: string;
    series_id: string;
    subject_id: string;
    teacher_id: string;
    starts_at: string;
    ends_at: string;
    report_submitted_at: string | null;
    seriesIdx: number;
  }[] = [];

  for (let si = 0; si < SERIES_CONFIG.length; si++) {
    const cfg = SERIES_CONFIG[si];
    const subjectId = subjectIds[cfg.subj];
    const teacherId = teacherIds[cfg.teacher];
    if (!subjectId || !teacherId) continue;

    const recurrenceRule = { days: cfg.days, slots: [cfg.slot] };

    const { data: series, error } = await supabase
      .from("lesson_series")
      .insert({
        subject_id: subjectId,
        teacher_id: teacherId,
        recurrence_rule: recurrenceRule,
        start_date: "2026-03-01",
        end_date: "2026-03-29",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ❌ Series ${si}: ${error.message}`);
      continue;
    }
    seriesIds.push(series.id);

    // Generate lessons for each matching day
    const dates = expandDates(START_DATE, END_DATE, cfg.days);
    for (const date of dates) {
      const [sh, sm] = cfg.slot.start.split(":").map(Number);
      const [eh, em] = cfg.slot.end.split(":").map(Number);
      const startsAt = new Date(date);
      startsAt.setHours(sh, sm, 0, 0);
      const endsAt = new Date(date);
      endsAt.setHours(eh, em, 0, 0);

      // Past lessons get report_submitted_at (80% of them)
      const isPast = endsAt < NOW;
      const reportSubmitted = isPast && Math.random() < 0.8;

      allLessons.push({
        series_id: series.id,
        subject_id: subjectId,
        teacher_id: teacherId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        report_submitted_at: reportSubmitted
          ? new Date(endsAt.getTime() + rand(1, 48) * 3600000).toISOString()
          : null,
        seriesIdx: si,
      });
    }
  }

  // Insert lessons
  const lessonInserts = allLessons.map(({ seriesIdx: _, ...rest }) => rest);
  const { data: insertedLessons, error: lErr } = await supabase
    .from("lessons")
    .insert(lessonInserts)
    .select("id, series_id, subject_id, teacher_id, starts_at, ends_at, report_submitted_at");

  if (lErr) {
    console.error(`  ❌ Lessons: ${lErr.message}`);
    return;
  }
  console.log(`  ✅ ${seriesIds.length} series, ${insertedLessons!.length} lessons\n`);

  // Map series_id → lesson rows, and subject_id → lessons
  const lessonsBySeries = new Map<string, typeof insertedLessons>();
  const lessonsBySubject = new Map<string, typeof insertedLessons>();
  for (const l of insertedLessons!) {
    if (!lessonsBySeries.has(l.series_id)) lessonsBySeries.set(l.series_id, []);
    lessonsBySeries.get(l.series_id)!.push(l);
    if (!lessonsBySubject.has(l.subject_id)) lessonsBySubject.set(l.subject_id, []);
    lessonsBySubject.get(l.subject_id)!.push(l);
  }

  // ── Step 4: Fetch Students & Build Groups ──────────────
  console.log("4️⃣  Fetching students & building enrollment groups...");
  const { data: allStudents } = await supabase
    .from("users")
    .select("id, faculty_id, course_year")
    .eq("role", "student")
    .is("deleted_at", null);

  if (!allStudents || allStudents.length === 0) {
    console.error("  ❌ No students found!");
    return;
  }

  // Fetch faculties
  const { data: facRows } = await supabase
    .from("faculties")
    .select("id, name")
    .is("deleted_at", null);
  const facultyNameById = new Map((facRows ?? []).map((f) => [f.id, f.name]));

  // Group students by faculty+tier
  type StudentInfo = { id: string; faculty_id: string | null; course_year: number | null };
  const groups = new Map<string, StudentInfo[]>();

  for (const s of allStudents) {
    const facName = s.faculty_id ? facultyNameById.get(s.faculty_id) ?? "Unknown" : "Unknown";
    const tier = (s.course_year ?? 1) <= 2 ? "junior" : "senior";
    const key = `${facName}|${tier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  console.log(`  ${allStudents.length} students in ${groups.size} groups\n`);

  // ── Step 5: Create Enrollments ─────────────────────────
  console.log("5️⃣  Creating enrollments (lesson_students)...");
  const enrollmentRows: { lesson_id: string; student_id: string }[] = [];

  // For each group, find their subjects and enroll in all lessons of those subjects
  for (const [key, students] of groups) {
    const [facName, tier] = key.split("|");
    const facConfig = FACULTY_SUBJECTS[facName];
    if (!facConfig) continue;

    const subjIndexes = tier === "junior" ? facConfig.junior : facConfig.senior;

    // Limit group size to avoid massive inserts — sample max 200 students per group
    const sampledStudents = students.length > 200 ? shuffle(students).slice(0, 200) : students;

    for (const si of subjIndexes) {
      const subjId = subjectIds[si];
      if (!subjId) continue;
      const lessons = lessonsBySubject.get(subjId) ?? [];
      for (const lesson of lessons) {
        for (const student of sampledStudents) {
          enrollmentRows.push({
            lesson_id: lesson.id,
            student_id: student.id,
          });
        }
      }
    }
  }

  console.log(`  Inserting ${enrollmentRows.length} enrollment rows...`);
  await batchInsert("lesson_students", enrollmentRows);
  console.log(`  ✅ Enrollments done\n`);

  // ── Step 6: Attendance ─────────────────────────────────
  console.log("6️⃣  Generating attendance...");
  const pastLessons = (insertedLessons ?? []).filter(
    (l) => new Date(l.ends_at) < NOW
  );

  // Build set of enrolled student→lesson for quick lookup
  // We'll generate attendance from enrollment rows for past lessons only
  const pastLessonIds = new Set(pastLessons.map((l) => l.id));
  const attendanceRows: {
    lesson_id: string;
    student_id: string;
    status: string;
    method: string;
    marked_at: string;
  }[] = [];

  for (const e of enrollmentRows) {
    if (!pastLessonIds.has(e.lesson_id)) continue;
    const present = Math.random() < 0.78; // ~78% attendance
    const method = Math.random() < 0.1 ? "face_id" : "manual";
    const lesson = pastLessons.find((l) => l.id === e.lesson_id);
    attendanceRows.push({
      lesson_id: e.lesson_id,
      student_id: e.student_id,
      status: present ? "present" : "absent",
      method,
      marked_at: lesson ? lesson.ends_at : new Date().toISOString(),
    });
  }

  console.log(`  Inserting ${attendanceRows.length} attendance rows...`);
  await batchInsert("attendance", attendanceRows);
  console.log(`  ✅ Attendance done\n`);

  // ── Step 7: Grades ─────────────────────────────────────
  console.log("7️⃣  Generating grades...");
  const reportedLessonIds = new Set(
    (insertedLessons ?? [])
      .filter((l) => l.report_submitted_at)
      .map((l) => l.id)
  );

  const gradeRows: {
    lesson_id: string;
    student_id: string;
    score: number | null;
    graded_at: string;
  }[] = [];

  for (const e of enrollmentRows) {
    if (!reportedLessonIds.has(e.lesson_id)) continue;
    // 5% chance of null score (N/A)
    const isNA = Math.random() < 0.05;
    const score = isNA ? null : rand(30, 100);
    const lesson = pastLessons.find((l) => l.id === e.lesson_id);
    gradeRows.push({
      lesson_id: e.lesson_id,
      student_id: e.student_id,
      score,
      graded_at: lesson?.report_submitted_at ?? lesson?.ends_at ?? new Date().toISOString(),
    });
  }

  console.log(`  Inserting ${gradeRows.length} grade rows...`);
  await batchInsert("grades", gradeRows);
  console.log(`  ✅ Grades done\n`);

  // ── Step 8: Clubs ──────────────────────────────────────
  console.log("8️⃣  Creating clubs...");
  const clubStudents = shuffle(allStudents).slice(0, 500); // pool for club operations
  const clubIds: string[] = [];

  for (let i = 0; i < CLUBS.length; i++) {
    const headStudent = clubStudents[i];
    const { data: club, error } = await supabase
      .from("clubs")
      .upsert(
        { name: CLUBS[i], head_student_id: headStudent.id },
        { onConflict: "name" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(`  ❌ Club ${CLUBS[i]}: ${error.message}`);
      continue;
    }
    clubIds.push(club.id);

    // Add members (30-80 random students)
    const memberCount = rand(30, 80);
    const members = shuffle(clubStudents).slice(0, memberCount);
    // Always include head
    const memberSet = new Set([headStudent.id, ...members.map((m) => m.id)]);
    const memberRows = [...memberSet].map((sid) => ({
      club_id: club.id,
      student_id: sid,
    }));
    await batchInsert("club_members", memberRows);
  }
  console.log(`  ✅ ${clubIds.length} clubs with members\n`);

  // ── Step 9: Club Announcements + Event Signups ─────────
  console.log("9️⃣  Creating announcements & signups...");
  let totalAnnouncements = 0;
  let totalSignups = 0;

  for (let ci = 0; ci < clubIds.length; ci++) {
    const clubId = clubIds[ci];
    // 2 events per club
    const eventCount = 2;
    const eventPool = shuffle(CLUB_EVENTS);

    for (let ei = 0; ei < eventCount; ei++) {
      const ev = eventPool[ei % eventPool.length];
      const dayOffset = rand(1, 28);
      const startDate = new Date("2026-03-01");
      startDate.setDate(startDate.getDate() + dayOffset);
      startDate.setHours(rand(10, 18), 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + rand(1, 3));

      const { data: ann, error } = await supabase
        .from("club_announcements")
        .insert({
          club_id: clubId,
          title: ev.title,
          description: ev.desc,
          venue: ev.venue,
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`  ❌ Announcement: ${error.message}`);
        continue;
      }
      totalAnnouncements++;

      // Get club members for signups
      const { data: members } = await supabase
        .from("club_members")
        .select("student_id")
        .eq("club_id", clubId);

      const signupRate = 0.1 + Math.random() * 0.3; // 10-40%
      const signupRows = (members ?? [])
        .filter(() => Math.random() < signupRate)
        .map((m) => ({
          announcement_id: ann.id,
          student_id: m.student_id,
        }));

      if (signupRows.length > 0) {
        await batchInsert("event_signups", signupRows);
        totalSignups += signupRows.length;
      }
    }
  }
  console.log(`  ✅ ${totalAnnouncements} announcements, ${totalSignups} signups\n`);

  // ── Summary ────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("  ✅ Seed complete!");
  console.log(`  Teachers: ${teacherIds.length}`);
  console.log(`  Subjects: ${subjectIds.length}`);
  console.log(`  Series: ${seriesIds.length}`);
  console.log(`  Lessons: ${insertedLessons!.length}`);
  console.log(`  Enrollments: ${enrollmentRows.length}`);
  console.log(`  Attendance: ${attendanceRows.length}`);
  console.log(`  Grades: ${gradeRows.length}`);
  console.log(`  Clubs: ${clubIds.length}`);
  console.log(`  Announcements: ${totalAnnouncements}`);
  console.log(`  Signups: ${totalSignups}`);
  console.log("═══════════════════════════════════════════");
}

main().catch(console.error);
