"use client";

import { useState, useCallback } from "react";
import {
  Typography,
  Segmented,
  Card,
  Tag,
  Button,
  Space,
  App,
} from "antd";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import { toggleSignup } from "../../_actions/student-actions";
import { formatDateTime } from "@/lib/utils";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { ru };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  clubName: string;
  signupCount: number;
  isSignedUp: boolean;
}

export default function AnnouncementsClient({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localState, setLocalState] = useState<
    Map<string, { isSignedUp: boolean; signupCount: number }>
  >(new Map());

  const getState = (a: Announcement) => {
    const local = localState.get(a.id);
    return {
      isSignedUp: local?.isSignedUp ?? a.isSignedUp,
      signupCount: local?.signupCount ?? a.signupCount,
    };
  };

  const handleToggle = async (a: Announcement) => {
    setLoadingId(a.id);
    const st = getState(a);
    const result = await toggleSignup(a.id);
    setLoadingId(null);

    if (result.error) {
      message.error(result.error);
    } else {
      const newSignedUp = result.signedUp;
      setLocalState((prev) => {
        const next = new Map(prev);
        next.set(a.id, {
          isSignedUp: newSignedUp,
          signupCount: st.signupCount + (newSignedUp ? 1 : -1),
        });
        return next;
      });
      message.success(newSignedUp ? "Вы записались" : "Запись отменена");
    }
  };

  const calendarEvents = announcements.map((a) => ({
    id: a.id,
    title: `${a.clubName}: ${a.title}`,
    start: new Date(a.startsAt),
    end: new Date(a.endsAt),
  }));

  const eventStyleGetter = useCallback(
    () => ({
      style: {
        backgroundColor: "#52c41a",
        borderRadius: 6,
        border: "none",
        color: "#fff",
        fontSize: 12,
        padding: "2px 6px",
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
          Объявления
        </Typography.Title>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "list" | "calendar")}
          options={[
            {
              label: "Список",
              value: "list",
              icon: <UnorderedListOutlined />,
            },
            {
              label: "Календарь",
              value: "calendar",
              icon: <CalendarOutlined />,
            },
          ]}
        />
      </div>

      {mode === "list" ? (
        <div>
          {announcements.length === 0 && (
            <Typography.Text type="secondary">Нет предстоящих мероприятий</Typography.Text>
          )}
          {announcements.map((a) => {
            const st = getState(a);
            return (
              <Card key={a.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color="purple">{a.clubName}</Tag>
                      <Tag icon={<CalendarOutlined />} color="blue">
                        {formatDateTime(a.startsAt)}
                      </Tag>
                    </Space>
                    <Typography.Title level={5} style={{ marginBottom: 4 }}>
                      {a.title}
                    </Typography.Title>
                    {a.description && (
                      <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
                        {a.description}
                      </Typography.Paragraph>
                    )}
                    <Space>
                      {a.venue && <Tag icon={<EnvironmentOutlined />}>{a.venue}</Tag>}
                      <Tag icon={<TeamOutlined />}>{st.signupCount} записалось</Tag>
                    </Space>
                  </div>
                  <Button
                    type={st.isSignedUp ? "default" : "primary"}
                    danger={st.isSignedUp}
                    loading={loadingId === a.id}
                    onClick={() => handleToggle(a)}
                  >
                    {st.isSignedUp ? "Отменить" : "Записаться"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
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
            events={calendarEvents}
            defaultView={"month" as View}
            eventPropGetter={eventStyleGetter}
            messages={{
              today: "Сегодня",
              previous: "Назад",
              next: "Далее",
              week: "Неделя",
              month: "Месяц",
              day: "День",
              noEventsInRange: "Нет мероприятий",
            }}
            step={30}
            timeslots={2}
            culture="ru"
          />
        </div>
      )}
    </div>
  );
}
