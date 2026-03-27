"use client";

import { Typography, Row, Col, Statistic, Card, Table, Tag } from "antd";
import {
  TeamOutlined,
  PercentageOutlined,
  TrophyOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/utils";

interface KPI {
  totalStudents: number;
  avgAttendance: number;
  avgGrade: number;
  eventsThisMonth: number;
}

interface Props {
  kpi: KPI;
  attendanceBySubject: Array<{ subject: string; attendance: number }>;
  gradeDistribution: Array<{ range: string; count: number }>;
  socialParticipation: Array<{ month: string; count: number }>;
  pendingReports: Array<{
    teacherName: string;
    unsubmittedCount: number;
    oldestPending: string | null;
  }>;
}

export default function AnalyticsClient({
  kpi,
  attendanceBySubject,
  gradeDistribution,
  socialParticipation,
  pendingReports,
}: Props) {
  const reportColumns: ColumnsType<Props["pendingReports"][number]> = [
    { title: "Преподаватель", dataIndex: "teacherName", key: "teacherName" },
    {
      title: "Незакрытых",
      dataIndex: "unsubmittedCount",
      key: "unsubmittedCount",
      width: 120,
      render: (v: number) => <Tag color={v > 3 ? "red" : "orange"}>{v}</Tag>,
    },
    {
      title: "Самый старый отчёт",
      dataIndex: "oldestPending",
      key: "oldestPending",
      width: 200,
      render: (v: string | null) => (v ? formatDateTime(v) : "—"),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Аналитика</Typography.Title>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего студентов"
              value={kpi.totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Посещаемость (30д)"
              value={kpi.avgAttendance}
              suffix="%"
              prefix={<PercentageOutlined />}
              valueStyle={{ color: kpi.avgAttendance >= 70 ? "#52c41a" : "#f5222d" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Средняя оценка (30д)"
              value={kpi.avgGrade}
              prefix={<TrophyOutlined />}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Мероприятий в этом месяце"
              value={kpi.eventsThisMonth}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Посещаемость по предметам">
            {attendanceBySubject.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceBySubject}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="attendance" fill="#1677ff" name="Посещаемость %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography.Text type="secondary">Нет данных</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Распределение оценок">
            {gradeDistribution.some((b) => b.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#722ed1" name="Кол-во оценок" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography.Text type="secondary">Нет данных</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Social Participation */}
      <Card title="Участие в мероприятиях по месяцам" style={{ marginBottom: 24 }}>
        {socialParticipation.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={socialParticipation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#52c41a"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Записей"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Typography.Text type="secondary">Нет данных</Typography.Text>
        )}
      </Card>

      {/* Pending Reports */}
      <Card title="Незакрытые отчёты преподавателей">
        <Table
          dataSource={pendingReports.map((p, i) => ({ ...p, key: i }))}
          columns={reportColumns}
          pagination={false}
          size="small"
          locale={{ emptyText: "Все отчёты закрыты" }}
        />
      </Card>
    </div>
  );
}
