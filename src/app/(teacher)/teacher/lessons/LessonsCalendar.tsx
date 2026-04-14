"use client";

import React, { useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { Typography, Segmented } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchTeacherLessons } from "../_actions/teacher-actions";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { ru };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const SUBJECT_COLORS = [
  "#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#eb2f96",
  "#13c2c2", "#2f54eb", "#faad14", "#f5222d", "#a0d911",
];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  subjectId: string;
  color: string;
  isSubmitted: boolean;
}

export default function LessonsCalendar() {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const router = useRouter();

  const rangeStart = startOfMonth(subMonths(date, 1)).toISOString();
  const rangeEnd = endOfMonth(addMonths(date, 1)).toISOString();

  const { data: rawLessons = [] } = useQuery({
    queryKey: ["teacher-lessons", rangeStart, rangeEnd],
    queryFn: () => fetchTeacherLessons(rangeStart, rangeEnd),
  });

  // Build color map from unique subjects
  const subjectColorMap = new Map<string, string>();
  const seenSubjects = new Set<string>();
  let colorIdx = 0;
  for (const l of rawLessons) {
    if (!seenSubjects.has(l.subject_id)) {
      seenSubjects.add(l.subject_id);
      subjectColorMap.set(l.subject_id, SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length]);
      colorIdx++;
    }
  }

  const events: CalendarEvent[] = rawLessons.map((l) => {
    const sub = l.subjects as unknown as { name: string } | null;
    return {
      id: l.id,
      title: sub?.name ?? "Subject",
      start: new Date(l.starts_at),
      end: new Date(l.ends_at),
      subjectId: l.subject_id,
      color: subjectColorMap.get(l.subject_id) ?? "#1677ff",
      isSubmitted: !!l.report_submitted_at,
    };
  });

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: event.color,
        borderRadius: 6,
        border: event.isSubmitted ? "2px solid #52c41a" : "none",
        color: "#fff",
        fontSize: 12,
        padding: "2px 6px",
        opacity: event.isSubmitted ? 0.8 : 1,
      },
    }),
    []
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          My Lessons
        </Typography.Title>
        <Segmented
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { label: "Week", value: "week" },
            { label: "Month", value: "month" },
          ]}
        />
      </div>

      <div
        style={{
          height: "calc(100vh - 200px)",
          background: "#fff",
          borderRadius: 8,
          padding: 8,
        }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={(v) => setView(v)}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => router.push(`/teacher/lessons/${event.id}`)}
          messages={{
            today: "Today",
            previous: "Back",
            next: "Next",
            week: "Week",
            month: "Month",
            day: "Day",
            noEventsInRange: "No lessons",
          }}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 22, 0)}
          culture="en"
        />
      </div>
    </div>
  );
}
