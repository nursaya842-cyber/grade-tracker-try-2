"use client";

import React, { useEffect, useState } from "react";
import { Drawer, Table, Tag, Typography, Button, Popconfirm, Space, Spin, App, Descriptions } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getLessonDetail, deleteLesson, deleteLessonSeries } from "../../_actions/schedule-actions";
import { formatDateTime } from "@/lib/utils";

interface Props {
  lessonId: string | null;
  onClose: () => void;
}

interface StudentRow {
  studentId: string;
  name: string;
  attendance: string | null;
  method: string | null;
  grade: number | null;
}

export default function LessonDetailDrawer({ lessonId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const { message } = App.useApp();

  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    getLessonDetail(lessonId).then((res) => {
      setLesson(res.lesson);
      const studentRows: StudentRow[] = (res.students ?? []).map((s) => {
        const users = s.users as unknown as { full_name: string };
        const att = (res.attendance ?? []).find((a) => a.student_id === s.student_id);
        const gr = (res.grades ?? []).find((g) => g.student_id === s.student_id);
        return {
          studentId: s.student_id,
          name: users?.full_name ?? "?",
          attendance: att?.status ?? null,
          method: att?.method ?? null,
          grade: gr?.score ?? null,
        };
      });
      setRows(studentRows);
      setLoading(false);
    });
  }, [lessonId]);

  const handleDeleteSingle = async () => {
    if (!lessonId) return;
    const res = await deleteLesson(lessonId);
    if (res.error) message.error(res.error);
    else { message.success("Урок удалён"); onClose(); }
  };

  const handleDeleteSeries = async () => {
    const seriesId = lesson?.series_id as string | null;
    if (!seriesId) return;
    const res = await deleteLessonSeries(seriesId);
    if (res.error) message.error(res.error);
    else { message.success("Серия удалена"); onClose(); }
  };

  const subjects = lesson?.subjects as { name: string } | null;
  const teacher = lesson?.teacher as { full_name: string } | null;

  const columns = [
    { title: "Студент", dataIndex: "name", key: "name" },
    {
      title: "Посещаемость", key: "attendance",
      render: (_: unknown, r: StudentRow) =>
        r.attendance === "present" ? <Tag color="green">Присутствует</Tag> :
        r.attendance === "absent" ? <Tag color="red">Отсутствует</Tag> :
        <Tag>Не отмечен</Tag>,
    },
    {
      title: "Оценка", key: "grade",
      render: (_: unknown, r: StudentRow) =>
        r.grade !== null ? r.grade : <span style={{ color: "#999" }}>—</span>,
    },
  ];

  return (
    <Drawer
      title="Детали урока"
      open={!!lessonId}
      onClose={onClose}
      size="large"
      extra={
        <Space>
          <Popconfirm title="Удалить этот урок?" onConfirm={handleDeleteSingle} okText="Да" cancelText="Нет">
            <Button size="small" danger icon={<DeleteOutlined />}>Урок</Button>
          </Popconfirm>
          {!!lesson?.series_id && (
            <Popconfirm title="Удалить всю серию?" onConfirm={handleDeleteSeries} okText="Да" cancelText="Нет">
              <Button size="small" danger>Всю серию</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      {loading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : lesson ? (
        <>
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Предмет">
              <Typography.Text strong>{subjects?.name ?? "—"}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Преподаватель">
              {teacher?.full_name ?? <Tag color="orange">Не назначен</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Время">
              {formatDateTime(lesson.starts_at as string)} — {new Date(lesson.ends_at as string).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </Descriptions.Item>
            <Descriptions.Item label="Отчёт">
              {lesson.report_submitted_at ? <Tag color="green">Сдан</Tag> : <Tag>Не сдан</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
            Студенты ({rows.length})
          </Typography.Text>
          <Table
            dataSource={rows}
            columns={columns}
            rowKey="studentId"
            size="small"
            pagination={false}
          />
        </>
      ) : null}
    </Drawer>
  );
}
