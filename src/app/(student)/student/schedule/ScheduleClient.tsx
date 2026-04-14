"use client";

import { useState, useCallback } from "react";
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
import {
  Typography,
  Segmented,
  Modal,
  Descriptions,
  Tag,
  Button,
  App,
  Spin,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStudentSchedule,
  fetchStudentLessonDetail,
  cancelEventSignup,
} from "../_actions/student-actions";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { ru };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  type: "lesson" | "event";
  title: string;
  start: Date;
  end: Date;
  meta: Record<string, unknown>;
}

export default function ScheduleClient() {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [lessonDetail, setLessonDetail] = useState<Awaited<
    ReturnType<typeof fetchStudentLessonDetail>
  > | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { message } = App.useApp();

  const rangeStart = startOfMonth(subMonths(date, 1)).toISOString();
  const rangeEnd = endOfMonth(addMonths(date, 1)).toISOString();

  const { data, refetch } = useQuery({
    queryKey: ["student-schedule", rangeStart, rangeEnd],
    queryFn: () => fetchStudentSchedule(rangeStart, rangeEnd),
  });

  const events: CalendarEvent[] = [
    ...(data?.lessons ?? []).map((l) => ({
      id: l.id,
      type: "lesson" as const,
      title: l.title,
      start: new Date(l.startsAt),
      end: new Date(l.endsAt),
      meta: { teacherName: l.teacherName, reportSubmitted: l.reportSubmitted },
    })),
    ...(data?.events ?? []).map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      start: new Date(e.startsAt),
      end: new Date(e.endsAt),
      meta: { venue: e.venue, clubName: e.clubName },
    })),
  ];

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const isLesson = event.type === "lesson";
    return {
      style: {
        backgroundColor: isLesson ? "#1677ff" : "#52c41a",
        borderRadius: 6,
        border: "none",
        color: "#fff",
        fontSize: 12,
        padding: "2px 6px",
      },
    };
  }, []);

  const handleSelectEvent = async (event: CalendarEvent) => {
    setSelectedEvent(event);

    if (event.type === "lesson") {
      setLoadingDetail(true);
      const detail = await fetchStudentLessonDetail(event.id);
      setLessonDetail(detail);
      setLoadingDetail(false);
    }
  };

  const handleCancelSignup = async () => {
    if (!selectedEvent) return;
    setCancelling(true);
    const result = await cancelEventSignup(selectedEvent.id);
    setCancelling(false);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Registration cancelled");
      setSelectedEvent(null);
      refetch();
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setLessonDetail(null);
  };

  const formatDT = (d: Date) =>
    format(d, "dd.MM.yyyy HH:mm", { locale: ru });

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
          My Schedule
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
          onSelectEvent={handleSelectEvent}
          messages={{
            today: "Today",
            previous: "Back",
            next: "Next",
            week: "Week",
            month: "Month",
            day: "Day",
            noEventsInRange: "No events",
          }}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 22, 0)}
          culture="en"
        />
      </div>

      {/* Lesson detail modal */}
      <Modal
        title={selectedEvent?.type === "lesson" ? "Lesson" : "Event"}
        open={!!selectedEvent}
        onCancel={closeModal}
        footer={
          selectedEvent?.type === "event"
            ? [
                <Button key="close" onClick={closeModal}>
                  Close
                </Button>,
                <Button
                  key="cancel"
                  danger
                  loading={cancelling}
                  onClick={handleCancelSignup}
                >
                  Cancel Registration
                </Button>,
              ]
            : null
        }
      >
        {selectedEvent?.type === "lesson" && (
          loadingDetail ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : lessonDetail?.lesson ? (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Subject">
                {(lessonDetail.lesson.subjects as unknown as { name: string })
                  ?.name ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Teacher">
                {(
                  lessonDetail.lesson.teacher as unknown as {
                    full_name: string;
                  }
                )?.full_name ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Time">
                {formatDT(selectedEvent.start)} — {format(selectedEvent.end, "HH:mm")}
              </Descriptions.Item>
              {lessonDetail.lesson.report_submitted_at ? (
                <>
                  <Descriptions.Item label="Attendance">
                    {lessonDetail.attendance?.status === "present" ? (
                      <Tag color="green">Present</Tag>
                    ) : lessonDetail.attendance?.status === "absent" ? (
                      <Tag color="red">Absent</Tag>
                    ) : (
                      <Tag>Not marked</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Grade">
                    {lessonDetail.grade?.score !== null &&
                    lessonDetail.grade?.score !== undefined ? (
                      <Typography.Text strong>
                        {lessonDetail.grade.score}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">N/A</Typography.Text>
                    )}
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="Status">
                  <Tag color="blue">Report not submitted yet</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">
              Lesson data not found
            </Typography.Text>
          )
        )}

        {selectedEvent?.type === "event" && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Club">
              {String(selectedEvent.meta.clubName ?? "—")}
            </Descriptions.Item>
            <Descriptions.Item label="Title">
              {selectedEvent.title}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {formatDT(selectedEvent.start)} — {format(selectedEvent.end, "HH:mm")}
            </Descriptions.Item>
            {selectedEvent.meta.venue ? (
              <Descriptions.Item label="Venue">
                {String(selectedEvent.meta.venue)}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
