"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays, setHours, setMinutes, format, parseISO } from "date-fns";

interface TimeSlot {
  start: string; // "HH:mm"
  end: string;
}

interface RecurrenceRule {
  days: number[]; // 1=Mon..7=Sun
  slots: TimeSlot[];
}

interface CreateSeriesInput {
  subjectId: string;
  teacherId: string;
  studentIds: string[];
  recurrenceRule: RecurrenceRule;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

function generateLessonDates(
  rule: RecurrenceRule,
  startDate: string,
  endDate: string
): { startsAt: Date; endsAt: Date }[] {
  const results: { startsAt: Date; endsAt: Date }[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let current = start;
  while (current <= end) {
    const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay(); // 1=Mon..7=Sun
    if (rule.days.includes(dayOfWeek)) {
      for (const slot of rule.slots) {
        const [sh, sm] = slot.start.split(":").map(Number);
        const [eh, em] = slot.end.split(":").map(Number);
        const startsAt = setMinutes(setHours(current, sh), sm);
        const endsAt = setMinutes(setHours(current, eh), em);
        results.push({ startsAt, endsAt });
      }
    }
    current = addDays(current, 1);
  }
  return results;
}

export async function checkConflicts(
  teacherId: string,
  studentIds: string[],
  lessonDates: { startsAt: string; endsAt: string }[],
  excludeSeriesId?: string
) {
  const supabase = await createClient();
  const conflicts: string[] = [];

  for (const ld of lessonDates) {
    // Teacher conflict
    let query = supabase
      .from("lessons")
      .select("id, starts_at, ends_at, subjects(name)")
      .eq("teacher_id", teacherId)
      .is("deleted_at", null)
      .lt("starts_at", ld.endsAt)
      .gt("ends_at", ld.startsAt);

    if (excludeSeriesId) {
      query = query.neq("series_id", excludeSeriesId);
    }

    const { data: teacherConflicts } = await query;
    if (teacherConflicts && teacherConflicts.length > 0) {
      conflicts.push(
        `Teacher is busy: ${format(parseISO(ld.startsAt), "dd.MM HH:mm")}–${format(parseISO(ld.endsAt), "HH:mm")}`
      );
      if (conflicts.length >= 5) return conflicts; // limit
    }

    // Student conflicts (check first few)
    if (studentIds.length > 0) {
      const { data: studentConflicts } = await supabase
        .from("lesson_students")
        .select("student_id, lessons!inner(id, starts_at, ends_at, deleted_at)")
        .in("student_id", studentIds)
        .is("lessons.deleted_at", null)
        .lt("lessons.starts_at", ld.endsAt)
        .gt("lessons.ends_at", ld.startsAt);

      if (studentConflicts && studentConflicts.length > 0) {
        conflicts.push(
          `Student conflict: ${format(parseISO(ld.startsAt), "dd.MM HH:mm")}–${format(parseISO(ld.endsAt), "HH:mm")} (${studentConflicts.length} students)`
        );
        if (conflicts.length >= 5) return conflicts;
      }
    }
  }

  return conflicts;
}

export async function createLessonSeries(input: CreateSeriesInput) {
  const supabase = await createClient();

  const dates = generateLessonDates(input.recurrenceRule, input.startDate, input.endDate);
  if (dates.length === 0) return { error: "No lessons in date range" };

  // Check conflicts
  const lessonDates = dates.map((d) => ({
    startsAt: d.startsAt.toISOString(),
    endsAt: d.endsAt.toISOString(),
  }));

  const conflicts = await checkConflicts(input.teacherId, input.studentIds, lessonDates);
  if (conflicts.length > 0) return { error: null, conflicts };

  // Insert series
  const { data: series, error: seriesErr } = await supabase
    .from("lesson_series")
    .insert({
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      recurrence_rule: input.recurrenceRule,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select("id")
    .single();

  if (seriesErr) return { error: seriesErr.message };

  // Insert lessons
  const lessonRows = dates.map((d) => ({
    series_id: series.id,
    subject_id: input.subjectId,
    teacher_id: input.teacherId,
    starts_at: d.startsAt.toISOString(),
    ends_at: d.endsAt.toISOString(),
  }));

  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .insert(lessonRows)
    .select("id");

  if (lessonsErr) return { error: lessonsErr.message };

  // Insert lesson_students
  const enrollmentRows = lessons.flatMap((l) =>
    input.studentIds.map((sid) => ({ lesson_id: l.id, student_id: sid }))
  );

  if (enrollmentRows.length > 0) {
    const { error: enrollErr } = await supabase
      .from("lesson_students")
      .insert(enrollmentRows);
    if (enrollErr) return { error: enrollErr.message };
  }

  revalidatePath("/admin/schedule");
  return { error: null, conflicts: null, seriesId: series.id, lessonCount: lessons.length };
}

export async function getLessonDetail(lessonId: string) {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, subjects(name), teacher:users!lessons_teacher_id_fkey(full_name)")
    .eq("id", lessonId)
    .single();

  const { data: students } = await supabase
    .from("lesson_students")
    .select("student_id, users!inner(full_name)")
    .eq("lesson_id", lessonId);

  const { data: attendance } = await supabase
    .from("attendance")
    .select("student_id, status, method")
    .eq("lesson_id", lessonId);

  const { data: grades } = await supabase
    .from("grades")
    .select("student_id, score")
    .eq("lesson_id", lessonId);

  return { lesson, students, attendance, grades };
}

export async function deleteLesson(lessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", lessonId);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedule");
  return { error: null };
}

export async function deleteLessonSeries(seriesId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("series_id", seriesId)
    .is("deleted_at", null);
  if (error) return { error: error.message };
  await supabase
    .from("lesson_series")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", seriesId);
  revalidatePath("/admin/schedule");
  return { error: null };
}

export async function fetchLessonsForRange(start: string, end: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, subject_id, teacher_id, starts_at, ends_at, series_id, report_submitted_at, subjects(name, id), teacher:users!lessons_teacher_id_fkey(full_name)")
    .is("deleted_at", null)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .order("starts_at");
  return data ?? [];
}

export async function fetchFormOptions() {
  const supabase = await createClient();
  const [subjects, teachers] = await Promise.all([
    supabase.from("subjects").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("users").select("id, full_name").eq("role", "teacher").is("deleted_at", null).order("full_name"),
  ]);
  return {
    subjects: subjects.data ?? [],
    teachers: teachers.data ?? [],
  };
}

export async function searchStudentsForSchedule(query: string) {
  const supabase = await createClient();
  let q = supabase
    .from("users")
    .select("id, full_name, course_year")
    .eq("role", "student")
    .is("deleted_at", null)
    .order("full_name")
    .limit(20);
  if (query.trim()) {
    q = q.or(`full_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
  }
  const { data } = await q;
  return data ?? [];
}

export async function searchTeachersForSchedule(query: string) {
  const supabase = await createClient();
  let q = supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "teacher")
    .is("deleted_at", null)
    .order("full_name")
    .limit(20);
  if (query.trim()) {
    q = q.ilike("full_name", `%${query.trim()}%`);
  }
  const { data } = await q;
  return data ?? [];
}
