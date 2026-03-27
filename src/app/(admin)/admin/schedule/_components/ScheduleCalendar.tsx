"use client";

import React, { useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Button, Typography, Space, Segmented } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonsForRange } from "../../_actions/schedule-actions";
import LessonFormModal from "./LessonFormModal";
import LessonDetailDrawer from "./LessonDetailDrawer";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { ru };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

const SUBJECT_COLORS = [
  "#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#eb2f96",
  "#13c2c2", "#2f54eb", "#faad14", "#f5222d", "#a0d911",
];

interface FormOptions {
  subjects: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
  students: { id: string; full_name: string; course_year: number | null }[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  seriesId: string | null;
  subjectId: string;
  color: string;
}

export default function ScheduleCalendar({ formOptions }: { formOptions: FormOptions }) {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const rangeStart = startOfMonth(subMonths(date, 1)).toISOString();
  const rangeEnd = endOfMonth(addMonths(date, 1)).toISOString();

  const { data: rawLessons = [], refetch } = useQuery({
    queryKey: ["admin-lessons", rangeStart, rangeEnd],
    queryFn: () => fetchLessonsForRange(rangeStart, rangeEnd),
  });

  const subjectColorMap = new Map<string, string>();
  formOptions.subjects.forEach((s, i) => subjectColorMap.set(s.id, SUBJECT_COLORS[i % SUBJECT_COLORS.length]));

  const events: CalendarEvent[] = rawLessons.map((l) => {
    const subjects = l.subjects as unknown as { name: string; id: string } | null;
    const teacher = l.teacher as unknown as { full_name: string } | null;
    return {
      id: l.id,
      title: `${subjects?.name ?? "?"} — ${teacher?.full_name ?? "Не назначен"}`,
      start: new Date(l.starts_at),
      end: new Date(l.ends_at),
      seriesId: l.series_id,
      subjectId: l.subject_id,
      color: subjectColorMap.get(l.subject_id) ?? "#1677ff",
    };
  });

  const eventStyleGetter = useCallback((event: CalendarEvent) => ({
    style: {
      backgroundColor: event.color,
      borderRadius: 6,
      border: "none",
      color: "#fff",
      fontSize: 12,
      padding: "2px 6px",
    },
  }), []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Расписание</Typography.Title>
        <Space>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { label: "Неделя", value: "week" },
              { label: "Месяц", value: "month" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Создать серию
          </Button>
        </Space>
      </div>

      <div style={{ height: "calc(100vh - 200px)", background: "#fff", borderRadius: 8, padding: 8 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={(v) => setView(v)}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => setSelectedLessonId(event.id)}
          messages={{
            today: "Сегодня",
            previous: "Назад",
            next: "Далее",
            week: "Неделя",
            month: "Месяц",
            day: "День",
            noEventsInRange: "Нет уроков",
          }}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 22, 0)}
          culture="ru"
        />
      </div>

      <LessonFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); refetch(); }}
        formOptions={formOptions}
      />

      <LessonDetailDrawer
        lessonId={selectedLessonId}
        onClose={() => { setSelectedLessonId(null); refetch(); }}
      />
    </div>
  );
}
