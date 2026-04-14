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
      message.success("Report unlocked");
      router.refresh();
    }
  };

  const handleDownloadCSV = () => {
    const headers = ["Student", "Attendance", "Score", "Method"];
    const csvRows = students.map((s) => [
      s.fullName,
      s.status === "present" ? "Present" : "Absent",
      s.score !== null ? String(s.score) : "N/A",
      s.method === "face_id" ? "Face-ID" : "Manual",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...csvRows].map((row) => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${subjectName}_${formatDateTime(startsAt).replace(/[/\\:]/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "Student",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Attendance",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string | null) =>
        status === "present" ? (
          <Tag color="green">Present</Tag>
        ) : status === "absent" ? (
          <Tag color="red">Absent</Tag>
        ) : (
          <Tag>Not marked</Tag>
        ),
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: 100,
      render: (score: number | null) =>
        score !== null ? (
          <Typography.Text strong>{score}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">N/A</Typography.Text>
        ),
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      width: 120,
      render: (method: string | null) =>
        method === "face_id" ? (
          <Tag color="blue">Face-ID</Tag>
        ) : method === "manual" ? (
          <Tag>Manual</Tag>
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
        Back to Lessons
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Subject">{subjectName}</Descriptions.Item>
          <Descriptions.Item label="Teacher">
            {teacherName}
          </Descriptions.Item>
          <Descriptions.Item label="Start">
            {formatDateTime(startsAt)}
          </Descriptions.Item>
          <Descriptions.Item label="End">
            {formatDateTime(endsAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="green">Report submitted</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Lesson Results
          </Typography.Title>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadCSV}
            >
              Download CSV
            </Button>
            {canUnlock && (
              <Popconfirm
                title="Unlock report?"
                description="The teacher will be able to edit the data."
                onConfirm={handleUnlock}
                okText="Unlock"
                cancelText="Cancel"
              >
                <Button
                  icon={<UnlockOutlined />}
                  danger
                  loading={unlocking}
                >
                  Unlock
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
