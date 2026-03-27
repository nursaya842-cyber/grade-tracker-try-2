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
      message.success("Запись отменена");
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
          Моё расписание
        </Typography.Title>
        <Segmented
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { label: "Неделя", value: "week" },
            { label: "Месяц", value: "month" },
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
            today: "Сегодня",
            previous: "Назад",
            next: "Далее",
            week: "Неделя",
            month: "Месяц",
            day: "День",
            noEventsInRange: "Нет событий",
          }}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 22, 0)}
          culture="ru"
        />
      </div>

      {/* Lesson detail modal */}
      <Modal
        title={selectedEvent?.type === "lesson" ? "Урок" : "Мероприятие"}
        open={!!selectedEvent}
        onCancel={closeModal}
        footer={
          selectedEvent?.type === "event"
            ? [
                <Button key="close" onClick={closeModal}>
                  Закрыть
                </Button>,
                <Button
                  key="cancel"
                  danger
                  loading={cancelling}
                  onClick={handleCancelSignup}
                >
                  Отменить запись
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
              <Descriptions.Item label="Предмет">
                {(lessonDetail.lesson.subjects as unknown as { name: string })
                  ?.name ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Преподаватель">
                {(
                  lessonDetail.lesson.teacher as unknown as {
                    full_name: string;
                  }
                )?.full_name ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Время">
                {formatDT(selectedEvent.start)} — {format(selectedEvent.end, "HH:mm")}
              </Descriptions.Item>
              {lessonDetail.lesson.report_submitted_at ? (
                <>
                  <Descriptions.Item label="Посещаемость">
                    {lessonDetail.attendance?.status === "present" ? (
                      <Tag color="green">Присутствует</Tag>
                    ) : lessonDetail.attendance?.status === "absent" ? (
                      <Tag color="red">Отсутствует</Tag>
                    ) : (
                      <Tag>Не отмечен</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Оценка">
                    {lessonDetail.grade?.score !== null &&
                    lessonDetail.grade?.score !== undefined ? (
                      <Typography.Text strong>
                        {lessonDetail.grade.score}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">Н/Д</Typography.Text>
                    )}
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="Статус">
                  <Tag color="blue">Отчёт ещё не сдан</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">
              Данные урока не найдены
            </Typography.Text>
          )
        )}

        {selectedEvent?.type === "event" && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Клуб">
              {String(selectedEvent.meta.clubName ?? "—")}
            </Descriptions.Item>
            <Descriptions.Item label="Название">
              {selectedEvent.title}
            </Descriptions.Item>
            <Descriptions.Item label="Время">
              {formatDT(selectedEvent.start)} — {format(selectedEvent.end, "HH:mm")}
            </Descriptions.Item>
            {selectedEvent.meta.venue ? (
              <Descriptions.Item label="Место">
                {String(selectedEvent.meta.venue)}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
