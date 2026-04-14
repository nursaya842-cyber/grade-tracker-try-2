"use client";

import {
  Card, Descriptions, Statistic, Row, Col, Typography, Avatar, Table, Tag, Button,
} from "antd";
import {
  UserOutlined, TrophyOutlined, CheckCircleOutlined,
  CalendarOutlined, ArrowLeftOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { formatDateTime, scoreToLetter } from "@/lib/utils";

interface ChildData {
  profile: {
    id: string;
    full_name: string;
    email: string;
    course_year: number | null;
    created_at: string;
  };
  photoSignedUrl: string | null;
  gpa: number;
  avgGrade: number;
  attendancePct: number;
  recentGrades: Record<string, unknown>[];
  recentAttendance: Record<string, unknown>[];
  clubs: { id: string; name: string }[];
}

export default function ChildDetailClient({ data }: { data: ChildData }) {
  const router = useRouter();
  const { profile } = data;

  const gradeColumns: Array<Record<string, unknown>> = [
    {
      title: "Subject",
      key: "subject",
      render: (_: unknown, record: Record<string, unknown>) => {
        const lessons = record.lessons as unknown as { subjects: { name: string } } | { subjects: { name: string } }[];
        const subj = Array.isArray(lessons) ? lessons[0] : lessons;
        return subj?.subjects?.name ?? "—";
      },
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: 80,
      render: (v: unknown) => (v as number) ?? "N/A",
    },
    {
      title: "Letter",
      key: "letter",
      width: 70,
      render: (_: unknown, record: Record<string, unknown>) => {
        const score = record.score as number | null;
        return score ? (
          <Tag color={score >= 70 ? "green" : score >= 50 ? "gold" : "red"}>
            {scoreToLetter(score)}
          </Tag>
        ) : "—";
      },
    },
    {
      title: "Date",
      dataIndex: "graded_at",
      key: "graded_at",
      render: (v: string) => formatDateTime(v),
      responsive: ["md"] as const,
    },
  ];

  const attendanceColumns: Array<Record<string, unknown>> = [
    {
      title: "Subject",
      key: "subject",
      render: (_: unknown, record: Record<string, unknown>) => {
        const lessons = record.lessons as unknown as { subjects: { name: string } } | { subjects: { name: string } }[];
        const lesson = Array.isArray(lessons) ? lessons[0] : lessons;
        return lesson?.subjects?.name ?? "—";
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string) => (
        <Tag color={v === "present" ? "green" : "red"}>
          {v === "present" ? "Present" : "Absent"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "marked_at",
      key: "marked_at",
      render: (v: string) => formatDateTime(v),
      responsive: ["md"] as const,
    },
  ];

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/parent/children")}
        style={{ marginBottom: 16 }}
      >
        Back to list
      </Button>

      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Avatar
            size={80}
            src={data.photoSignedUrl}
            icon={!data.photoSignedUrl ? <UserOutlined /> : undefined}
            style={{ flexShrink: 0, background: "#722ed1" }}
          />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {profile.full_name}
            </Typography.Title>
            <Typography.Text type="secondary">{profile.email}</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {profile.course_year ? `Year ${profile.course_year}` : ""}
            </Typography.Text>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="GPA"
              value={data.gpa}
              precision={2}
              prefix={<TrophyOutlined />}
              suffix="/ 4.0"
              styles={{
                content: {
                  color: data.gpa >= 3.0 ? "#52c41a" : data.gpa >= 2.0 ? "#faad14" : "#f5222d",
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Score"
              value={data.avgGrade}
              precision={1}
              suffix="/ 100"
              styles={{
                content: {
                  color: data.avgGrade >= 70 ? "#52c41a" : data.avgGrade >= 50 ? "#faad14" : "#f5222d",
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Attendance"
              value={data.attendancePct}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              styles={{
                content: {
                  color: data.attendancePct >= 70 ? "#52c41a" : "#f5222d",
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Clubs */}
      {data.clubs.length > 0 && (
        <Card
          title={<><TeamOutlined /> Clubs</>}
          style={{ marginBottom: 24 }}
          styles={{ body: { padding: "12px 24px" } }}
        >
          {data.clubs.map((c) => (
            <Tag key={c.id} color="purple" style={{ marginBottom: 4 }}>
              {c.name}
            </Tag>
          ))}
        </Card>
      )}

      {/* Recent Grades */}
      <Card
        title="Recent Grades"
        style={{ marginBottom: 24 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={data.recentGrades}
          columns={gradeColumns}
          rowKey={(r) => String(r.lesson_id)}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* Recent Attendance */}
      <Card
        title={<><CalendarOutlined /> Recent Attendance</>}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={data.recentAttendance}
          columns={attendanceColumns}
          rowKey={(r) => String(r.lesson_id)}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
}
