"use client";

import React, { useState } from "react";
import {
  Typography,
  Table,
  Tag,
  Button,
  Card,
  Space,
  Descriptions,
  Popconfirm,
  App,
} from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { unlockLessonReport } from "../../../_actions/teacher-actions";
import { formatDateTime } from "@/lib/utils";

interface StudentEntry {
  studentId: string;
  fullName: string;
  facePhotoUrl: string | null;
  status: "present" | "absent" | null;
  method: "manual" | "face_id" | null;
  score: number | null;
}

interface Props {
  lessonId: string;
  subjectName: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  students: StudentEntry[];
  canUnlock: boolean;
}

export default function LessonViewMode({
  lessonId,
  subjectName,
  teacherName,
  startsAt,
  endsAt,
  students,
  canUnlock,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    const result = await unlockLessonReport(lessonId);
    setUnlocking(false);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Отчёт разблокирован");
      router.refresh();
    }
  };

  const handleDownloadCSV = () => {
    const headers = ["Студент", "Посещаемость", "Оценка", "Метод"];
    const csvRows = students.map((s) => [
      s.fullName,
      s.status === "present" ? "Присутствует" : "Отсутствует",
      s.score !== null ? String(s.score) : "Н/Д",
      s.method === "face_id" ? "Face-ID" : "Вручную",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...csvRows].map((row) => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `отчёт_${subjectName}_${formatDateTime(startsAt).replace(/[/\\:]/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "Студент",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Посещаемость",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string | null) =>
        status === "present" ? (
          <Tag color="green">Присутствует</Tag>
        ) : status === "absent" ? (
          <Tag color="red">Отсутствует</Tag>
        ) : (
          <Tag>Не отмечен</Tag>
        ),
    },
    {
      title: "Оценка",
      dataIndex: "score",
      key: "score",
      width: 100,
      render: (score: number | null) =>
        score !== null ? (
          <Typography.Text strong>{score}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">Н/Д</Typography.Text>
        ),
    },
    {
      title: "Метод",
      dataIndex: "method",
      key: "method",
      width: 120,
      render: (method: string | null) =>
        method === "face_id" ? (
          <Tag color="blue">Face-ID</Tag>
        ) : method === "manual" ? (
          <Tag>Вручную</Tag>
        ) : (
          <Tag>—</Tag>
        ),
    },
  ];

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/teacher/lessons")}
        style={{ marginBottom: 16 }}
      >
        Назад к урокам
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Предмет">{subjectName}</Descriptions.Item>
          <Descriptions.Item label="Преподаватель">
            {teacherName}
          </Descriptions.Item>
          <Descriptions.Item label="Начало">
            {formatDateTime(startsAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Конец">
            {formatDateTime(endsAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Статус">
            <Tag color="green">Отчёт отправлен</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Результаты урока
          </Typography.Title>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadCSV}
            >
              Скачать CSV
            </Button>
            {canUnlock && (
              <Popconfirm
                title="Разблокировать отчёт?"
                description="Преподаватель сможет изменить данные."
                onConfirm={handleUnlock}
                okText="Разблокировать"
                cancelText="Отмена"
              >
                <Button
                  icon={<UnlockOutlined />}
                  danger
                  loading={unlocking}
                >
                  Разблокировать
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Table
          dataSource={students.map((s) => ({ ...s, key: s.studentId }))}
          columns={columns}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
