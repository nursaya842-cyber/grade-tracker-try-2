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
    else { message.success("Lesson deleted"); onClose(); }
  };

  const handleDeleteSeries = async () => {
    const seriesId = lesson?.series_id as string | null;
    if (!seriesId) return;
    const res = await deleteLessonSeries(seriesId);
    if (res.error) message.error(res.error);
    else { message.success("Series deleted"); onClose(); }
  };

  const subjects = lesson?.subjects as { name: string } | null;
  const teacher = lesson?.teacher as { full_name: string } | null;

  const columns = [
    { title: "Student", dataIndex: "name", key: "name" },
    {
      title: "Attendance", key: "attendance",
      render: (_: unknown, r: StudentRow) =>
        r.attendance === "present" ? <Tag color="green">Present</Tag> :
        r.attendance === "absent" ? <Tag color="red">Absent</Tag> :
        <Tag>Not marked</Tag>,
    },
    {
      title: "Grade", key: "grade",
      render: (_: unknown, r: StudentRow) =>
        r.grade !== null ? r.grade : <span style={{ color: "#999" }}>—</span>,
    },
  ];

  return (
    <Drawer
      title="Lesson Details"
      open={!!lessonId}
      onClose={onClose}
      size="large"
      extra={
        <Space>
          <Popconfirm title="Delete this lesson?" onConfirm={handleDeleteSingle} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />}>Lesson</Button>
          </Popconfirm>
          {!!lesson?.series_id && (
            <Popconfirm title="Delete the entire series?" onConfirm={handleDeleteSeries} okText="Yes" cancelText="No">
              <Button size="small" danger>Entire series</Button>
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
            <Descriptions.Item label="Subject">
              <Typography.Text strong>{subjects?.name ?? "—"}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Teacher">
              {teacher?.full_name ?? <Tag color="orange">Not assigned</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {formatDateTime(lesson.starts_at as string)} — {new Date(lesson.ends_at as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </Descriptions.Item>
            <Descriptions.Item label="Report">
              {lesson.report_submitted_at ? <Tag color="green">Submitted</Tag> : <Tag>Not submitted</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
            Students ({rows.length})
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
