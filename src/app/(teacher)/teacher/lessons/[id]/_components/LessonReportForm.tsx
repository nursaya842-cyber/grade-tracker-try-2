"use client";

import { useState } from "react";
import {
  Typography,
  Table,
  Switch,
  InputNumber,
  Checkbox,
  Button,
  Card,
  Space,
  Tag,
  Popconfirm,
  App,
  Descriptions,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, ScanOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { submitLessonReport, fetchFaceIdData } from "../../../_actions/teacher-actions";
import { formatDateTime } from "@/lib/utils";
import FaceIdModal from "@/components/face-id/FaceIdModal";
import type { FaceMatchResult } from "@/components/face-id/FaceIdModal";

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
}

interface ReportRow {
  studentId: string;
  present: boolean;
  score: number | null;
  isNA: boolean;
  method: "manual" | "face_id";
  faceConfidence: number | null;
}

export default function LessonReportForm({
  lessonId,
  subjectName,
  teacherName,
  startsAt,
  endsAt,
  students,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [faceIdOpen, setFaceIdOpen] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [faceIdData, setFaceIdData] = useState<{
    students: Array<{ studentId: string; fullName: string; facePhotoUrl: string | null }>;
    signedUrls: Record<string, string>;
    threshold: number;
  } | null>(null);

  const [rows, setRows] = useState<ReportRow[]>(
    students.map((s) => ({
      studentId: s.studentId,
      present: s.status === "present",
      score: s.score,
      isNA: s.score === null && s.status !== null,
      method: s.method ?? "manual",
      faceConfidence: null,
    }))
  );

  const updateRow = (idx: number, updates: Partial<ReportRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...updates } : r))
    );
  };

  const handleOpenFaceId = async () => {
    setFaceIdLoading(true);
    try {
      const data = await fetchFaceIdData(lessonId);
      setFaceIdData(data);
      setFaceIdOpen(true);
    } catch {
      message.error("Ошибка загрузки данных для Face-ID");
    }
    setFaceIdLoading(false);
  };

  const handleFaceIdClose = (results: FaceMatchResult[]) => {
    setFaceIdOpen(false);
    // Apply results to rows
    setRows((prev) =>
      prev.map((r) => {
        const match = results.find((res) => res.studentId === r.studentId);
        if (match && match.matched) {
          return {
            ...r,
            present: true,
            method: "face_id",
            faceConfidence: match.confidence,
          };
        }
        return r;
      })
    );
    if (results.length > 0) {
      message.success(`Face-ID: ${results.length} студентов распознано`);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const entries = rows.map((r) => ({
      studentId: r.studentId,
      status: r.present ? ("present" as const) : ("absent" as const),
      method: r.method,
      score: r.isNA ? null : r.score,
    }));

    const result = await submitLessonReport(lessonId, entries);
    setSubmitting(false);

    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Отчёт успешно отправлен и заблокирован");
      router.refresh();
    }
  };

  const columns = [
    {
      title: "Студент",
      dataIndex: "fullName",
      key: "fullName",
      render: (_: unknown, __: unknown, idx: number) => (
        <span>{students[idx].fullName}</span>
      ),
    },
    {
      title: "Присутствие",
      key: "present",
      width: 140,
      render: (_: unknown, __: unknown, idx: number) => (
        <Switch
          checked={rows[idx].present}
          onChange={(checked) => updateRow(idx, { present: checked, method: "manual", faceConfidence: null })}
          checkedChildren="Здесь"
          unCheckedChildren="Нет"
        />
      ),
    },
    {
      title: "Метод",
      key: "method",
      width: 130,
      render: (_: unknown, __: unknown, idx: number) => {
        const r = rows[idx];
        if (r.method === "face_id") {
          return (
            <Space size={4}>
              <Tag color="blue">Face-ID</Tag>
              {r.faceConfidence !== null && (
                <Tag color="cyan">{Math.round(r.faceConfidence * 100)}%</Tag>
              )}
            </Space>
          );
        }
        return <Tag>Вручную</Tag>;
      },
    },
    {
      title: "Оценка",
      key: "score",
      width: 180,
      render: (_: unknown, __: unknown, idx: number) => (
        <Space>
          <InputNumber
            min={0}
            max={100}
            value={rows[idx].isNA ? undefined : rows[idx].score}
            disabled={rows[idx].isNA}
            onChange={(val) => updateRow(idx, { score: val })}
            placeholder="0-100"
            style={{ width: 80 }}
          />
          <Checkbox
            checked={rows[idx].isNA}
            onChange={(e) =>
              updateRow(idx, {
                isNA: e.target.checked,
                score: e.target.checked ? null : rows[idx].score,
              })
            }
          >
            Н/Д
          </Checkbox>
        </Space>
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
        </Descriptions>
      </Card>

      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Посещаемость и оценки
          </Typography.Title>
        }
        extra={
          <Button
            icon={<ScanOutlined />}
            onClick={handleOpenFaceId}
            loading={faceIdLoading}
          >
            Face-ID сканирование
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={students.map((s, i) => ({ ...s, key: s.studentId, idx: i }))}
          columns={columns}
          pagination={false}
          size="middle"
        />
      </Card>

      <div style={{ textAlign: "right" }}>
        <Popconfirm
          title="Подтвердить отправку?"
          description="После отправки отчёт будет заблокирован для редактирования."
          onConfirm={handleSubmit}
          okText="Да, отправить"
          cancelText="Отмена"
        >
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="large"
            loading={submitting}
          >
            Отправить отчёт
          </Button>
        </Popconfirm>
      </div>

      {faceIdData && (
        <FaceIdModal
          open={faceIdOpen}
          onClose={handleFaceIdClose}
          students={faceIdData.students}
          signedUrls={faceIdData.signedUrls}
          threshold={faceIdData.threshold}
        />
      )}
    </div>
  );
}
