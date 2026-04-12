/**
 * Import real KBTU teachers with subjects, lessons, enrollments, attendance, grades.
 * Period: 2026-03-01 to 2026-03-29
 *
 * Usage: npx tsx scripts/import-kbtu-teachers.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "qweasdqwe123";
const BATCH = 500;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const START_DATE = new Date("2026-03-01");
const END_DATE = new Date("2026-03-29");
const NOW = new Date("2026-03-29T18:00:00+05:00");

// ─── Helpers ──────────────────────────────────────────────
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function expandDates(startDate: Date, endDate: Date, daysOfWeek: number[]): Date[] {
  const dates: Date[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    if (daysOfWeek.includes(dow)) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

async function batchInsert(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      for (const row of chunk) {
        const { error: e2 } = await supabase.from(table).insert(row);
        if (!e2 || e2.message.includes("duplicate")) inserted++;
      }
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

// ─── Data ─────────────────────────────────────────────────

const TEACHERS = [
  { name: "Zhylkybayeva Nazym Zhaksybaykyzy", email: "n.zhylkybaeva@kbtu.kz", subjects: ["Physics"] },
  { name: "Aituov Askar Talgatovich", email: "a.aituov@kbtu.kz", subjects: ["Basics of Information Systems"] },
  { name: "Aldamuratov Zhomart Utegenovich", email: "z.aldamuratov@kbtuedu.onmicrosoft.com", subjects: ["Software Engineering"] },
  { name: "Akhmetova Dilyara Nadirovna", email: "d.akhmetova@kbtu.kz", subjects: ["Databases", "UI/UX Design"] },
  { name: "Baisakov Beisenbek Miyatbekovich", email: "b.baisakov@kbtu.kz", subjects: ["Algorithms and Data Structures", "Principles of Programming 1", "Principles of Programming 2"] },
  { name: "Balamanova Asem Temirgalikyzy", email: "a.balamanova@kbtuedu.onmicrosoft.com", subjects: ["Algorithms and Data Structures"] },
  { name: "Begenov Mels Orazhanovich", email: "m.begenov@kbtu.kz", subjects: ["IT Infrastructure and Computer Networks"] },
  { name: "Yerkin Adilet Asylbekuly", email: "a.yerkin@kbtu.kz", subjects: ["Data Mining"] },
  { name: "Zhaxalykov Temirlan Mirambekovich", email: "t.zhaxalykov@kbtu.kz", subjects: ["Research Methods and Tools", "IT Infrastructure and Computer Networks"] },
  { name: "Ziro Aaso Araz", email: "aa.ziro@kbtu.kz", subjects: ["Blockchain Technology and Applications"] },
  { name: "Kaidarova Nazym Almasovna", email: "n.kaidarova@kbtu.kz", subjects: ["Databases"] },
  { name: "Kelgenbayev Arnur Galiaskaruly", email: "a.kelgenbayev@kbtu.kz", subjects: ["Principles of Programming 1", "Principles of Programming 2"] },
  { name: "Mukasheva Asel Koptleuvna", email: "a.mukasheva@kbtu.kz", subjects: ["Cybersecurity Fundamentals"] },
  { name: "Mukhsimbaev Bobur Abdirakhimovich", email: "b.mukhsimbaev@kbtu.kz", subjects: ["Web Development"] },
  { name: "Kuralbaev Aibek Talgatuly", email: "a.kuralbaev@kbtu.kz", subjects: ["Web Development", "Databases"] },
];

// Map existing Russian subject names to English equivalents
const SUBJECT_ALIASES: Record<string, string> = {
  "Physics": "Physics",
  "Databases": "Databases",
  "Algorithms and Data Structures": "Algorithms and Data Structures",
  "Web Development": "Web Development",
};

// All unique subjects from teachers
const ALL_SUBJECTS = [...new Set(TEACHERS.flatMap((t) => t.subjects))];

// Time slots for rotation
const SLOTS = [
  { start: "09:00", end: "10:30" },
  { start: "10:45", end: "12:15" },
  { start: "13:00", end: "14:30" },
  { start: "14:45", end: "16:15" },
];

// Day pairs for rotation
const DAY_PAIRS = [
  [1, 3], // Mon, Wed
  [2, 4], // Tue, Thu
  [1, 4], // Mon, Thu
  [2, 5], // Tue, Fri
  [3, 5], // Wed, Fri
];

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  KBTU Teachers Import");
  console.log("═══════════════════════════════════════════\n");

  // ── Step 1: Create Teachers ────────────────────────────
  console.log("1️⃣  Creating teachers...");
  const teacherMap = new Map<string, string>(); // email → userId

  for (const t of TEACHERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: t.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { email: t.email, full_name: t.name, role: "teacher" },
    });
    if (error) {
      if (error.message.includes("already been registered")) {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", t.email)
          .single();
        if (existing) teacherMap.set(t.email, existing.id);
        console.log(`  ⏭️  ${t.email} (already exists)`);
        continue;
      }
      console.error(`  ❌ ${t.email}: ${error.message}`);
      continue;
    }
    teacherMap.set(t.email, data.user.id);
    console.log(`  ✅ ${t.name}`);
  }
  console.log(`  Total: ${teacherMap.size} teachers\n`);

  // ── Step 2: Create/Get Subjects ────────────────────────
  console.log("2️⃣  Creating subjects...");
  for (const name of ALL_SUBJECTS) {
    await supabase.from("subjects").upsert({ name }, { onConflict: "name" });
  }

  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name")
    .is("deleted_at", null);
  const subjectMap = new Map((subjectRows ?? []).map((s) => [s.name, s.id]));
  console.log(`  ✅ ${ALL_SUBJECTS.length} subjects ready\n`);

  // ── Step 3: Fetch students from SITE faculty ───────────
  console.log("3️⃣  Fetching students...");
  const { data: faculties } = await supabase
    .from("faculties")
    .select("id, name")
    .is("deleted_at", null);

  const siteFaculty = (faculties ?? []).find((f) =>
    f.name.includes("Information Technology") || f.name.includes("Engineering")
  );

  let studentPool: { id: string }[] = [];
  if (siteFaculty) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("role", "student")
      .eq("faculty_id", siteFaculty.id)
      .is("deleted_at", null)
      .limit(400);
    studentPool = data ?? [];
  }

  // Fallback: get any students if SITE is empty
  if (studentPool.length < 50) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("role", "student")
      .is("deleted_at", null)
      .limit(400);
    studentPool = data ?? [];
  }
  console.log(`  ✅ ${studentPool.length} students in pool\n`);

  // ── Step 4: Create Lesson Series + Lessons ─────────────
  console.log("4️⃣  Creating lesson series & lessons...");
  let seriesCount = 0;
  let slotIdx = 0;
  let dayIdx = 0;

  interface LessonRow {
    series_id: string;
    subject_id: string;
    teacher_id: string;
    starts_at: string;
    ends_at: string;
    report_submitted_at: string | null;
  }

  const allLessons: LessonRow[] = [];
  const seriesSubjectTeacher: { seriesId: string; subjectId: string; teacherId: string }[] = [];

  for (const t of TEACHERS) {
    const teacherId = teacherMap.get(t.email);
    if (!teacherId) continue;

    for (const subjName of t.subjects) {
      const subjectId = subjectMap.get(subjName);
      if (!subjectId) {
        console.error(`  ❌ Subject not found: ${subjName}`);
        continue;
      }

      const slot = SLOTS[slotIdx % SLOTS.length];
      const days = DAY_PAIRS[dayIdx % DAY_PAIRS.length];
      slotIdx++;
      dayIdx++;

      const { data: series, error } = await supabase
        .from("lesson_series")
        .insert({
          subject_id: subjectId,
          teacher_id: teacherId,
          recurrence_rule: { days, slots: [slot] },
          start_date: "2026-03-01",
          end_date: "2026-03-29",
        })
        .select("id")
        .single();

      if (error) {
        console.error(`  ❌ Series ${subjName}: ${error.message}`);
        continue;
      }
      seriesCount++;
      seriesSubjectTeacher.push({ seriesId: series.id, subjectId, teacherId });

      const dates = expandDates(START_DATE, END_DATE, days);
      for (const date of dates) {
        const [sh, sm] = slot.start.split(":").map(Number);
        const [eh, em] = slot.end.split(":").map(Number);
        const startsAt = new Date(date); startsAt.setHours(sh, sm, 0, 0);
        const endsAt = new Date(date); endsAt.setHours(eh, em, 0, 0);

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
        });
      }
    }
  }

  const { data: insertedLessons, error: lErr } = await supabase
    .from("lessons")
    .insert(allLessons)
    .select("id, series_id, subject_id, starts_at, ends_at, report_submitted_at");

  if (lErr) {
    console.error(`  ❌ Lessons insert: ${lErr.message}`);
    return;
  }
  console.log(`  ✅ ${seriesCount} series, ${insertedLessons!.length} lessons\n`);

  // ── Step 5: Enroll students ────────────────────────────
  console.log("5️⃣  Enrolling students...");
  const enrollmentRows: { lesson_id: string; student_id: string }[] = [];

  // Group lessons by series
  const lessonsBySeries = new Map<string, typeof insertedLessons>();
  for (const l of insertedLessons!) {
    if (!lessonsBySeries.has(l.series_id)) lessonsBySeries.set(l.series_id, []);
    lessonsBySeries.get(l.series_id)!.push(l);
  }

  for (const { seriesId } of seriesSubjectTeacher) {
    const lessons = lessonsBySeries.get(seriesId) ?? [];
    // 30-80 students per series
    const count = rand(30, Math.min(80, studentPool.length));
    const selected = shuffle(studentPool).slice(0, count);

    for (const lesson of lessons) {
      for (const student of selected) {
        enrollmentRows.push({ lesson_id: lesson.id, student_id: student.id });
      }
    }
  }

  console.log(`  Inserting ${enrollmentRows.length} enrollments...`);
  await batchInsert("lesson_students", enrollmentRows);
  console.log(`  ✅ Enrollments done\n`);

  // ── Step 6: Attendance ─────────────────────────────────
  console.log("6️⃣  Generating attendance...");
  const pastLessonIds = new Set(
    (insertedLessons ?? []).filter((l) => new Date(l.ends_at) < NOW).map((l) => l.id)
  );

  const attendanceRows: Record<string, unknown>[] = [];
  for (const e of enrollmentRows) {
    if (!pastLessonIds.has(e.lesson_id)) continue;
    attendanceRows.push({
      lesson_id: e.lesson_id,
      student_id: e.student_id,
      status: Math.random() < 0.78 ? "present" : "absent",
      method: Math.random() < 0.1 ? "face_id" : "manual",
      marked_at: NOW.toISOString(),
    });
  }

  console.log(`  Inserting ${attendanceRows.length} attendance rows...`);
  await batchInsert("attendance", attendanceRows);
  console.log(`  ✅ Attendance done\n`);

  // ── Step 7: Grades ─────────────────────────────────────
  console.log("7️⃣  Generating grades...");
  const reportedIds = new Set(
    (insertedLessons ?? []).filter((l) => l.report_submitted_at).map((l) => l.id)
  );

  const gradeRows: Record<string, unknown>[] = [];
  for (const e of enrollmentRows) {
    if (!reportedIds.has(e.lesson_id)) continue;
    gradeRows.push({
      lesson_id: e.lesson_id,
      student_id: e.student_id,
      score: Math.random() < 0.05 ? null : rand(30, 100),
      graded_at: NOW.toISOString(),
    });
  }

  console.log(`  Inserting ${gradeRows.length} grade rows...`);
  await batchInsert("grades", gradeRows);
  console.log(`  ✅ Grades done\n`);

  // ── Summary ────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("  ✅ Import complete!");
  console.log(`  Teachers: ${teacherMap.size}`);
  console.log(`  Subjects: ${ALL_SUBJECTS.length}`);
  console.log(`  Series: ${seriesCount}`);
  console.log(`  Lessons: ${insertedLessons!.length}`);
  console.log(`  Enrollments: ${enrollmentRows.length}`);
  console.log(`  Attendance: ${attendanceRows.length}`);
  console.log(`  Grades: ${gradeRows.length}`);
  console.log("═══════════════════════════════════════════");
}

main().catch(console.error);
