"use client";

import { Card, Row, Col, Typography, Statistic, Table, Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RocketOutlined,
  FileTextOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Metrics {
  avgGradeEntryHours: number;
  reportCompletionPct: number;
  atRiskCount: number;
  totalStudents: number;
  totalRecs: number;
  activeRecs: number;
  checkinCount: number;
  attendanceRecords: number;
  gradeRecords: number;
  reportedLessons: number;
  totalPastLessons: number;
}

const beforeAfterData = (m: Metrics) => [
  {
    key: "1",
    metric: "Grade Entry Speed",
    before: "~7 days (manual Excel)",
    after: `${m.avgGradeEntryHours} hours (automatic tracking)`,
    improvement: m.avgGradeEntryHours > 0 ? `${Math.round((168 - m.avgGradeEntryHours) / 168 * 100)}% faster` : "—",
    color: "green",
  },
  {
    key: "2",
    metric: "Report Completion",
    before: "~60% (estimate)",
    after: `${m.reportCompletionPct}% (${m.reportedLessons}/${m.totalPastLessons})`,
    improvement: m.reportCompletionPct > 60 ? `+${m.reportCompletionPct - 60}%` : "—",
    color: m.reportCompletionPct > 60 ? "green" : "orange",
  },
  {
    key: "3",
    metric: "At-risk students detected",
    before: "0 (not tracked)",
    after: `${m.atRiskCount} students automatically`,
    improvement: "New capability",
    color: "blue",
  },
  {
    key: "4",
    metric: "Personal recommendations",
    before: "0 (none)",
    after: `${m.totalRecs} generated, ${m.activeRecs} active`,
    improvement: "New capability",
    color: "blue",
  },
  {
    key: "5",
    metric: "Attendance digitized",
    before: "Paper journals",
    after: `${m.attendanceRecords.toLocaleString()} records`,
    improvement: "100% digitized",
    color: "green",
  },
  {
    key: "6",
    metric: "Grades in system",
    before: "Excel spreadsheets",
    after: `${m.gradeRecords.toLocaleString()} records`,
    improvement: "100% digitized",
    color: "green",
  },
  {
    key: "7",
    metric: "Weekly Check-ins",
    before: "Not conducted",
    after: `${m.checkinCount} submitted`,
    improvement: "New capability",
    color: "blue",
  },
];

const columns = [
  {
    title: "Metric",
    dataIndex: "metric",
    key: "metric",
    width: 250,
    render: (v: string) => <Text strong>{v}</Text>,
  },
  {
    title: "Before (manual process)",
    dataIndex: "before",
    key: "before",
    render: (v: string) => <Text type="secondary">{v}</Text>,
  },
  {
    title: "After (CVM System)",
    dataIndex: "after",
    key: "after",
    render: (v: string) => <Text>{v}</Text>,
  },
  {
    title: "Improvement",
    dataIndex: "improvement",
    key: "improvement",
    width: 180,
    render: (v: string, record: { color: string }) => (
      <Tag color={record.color}>{v}</Tag>
    ),
  },
];

export default function EffectivenessClient({ metrics }: { metrics: Metrics }) {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 8 }}>
        System Effectiveness
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Comparison of manual processes vs. KBTU CVM System based on real data
      </Text>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Grade Entry Speed"
              value={metrics.avgGradeEntryHours}
              suffix="h"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: metrics.avgGradeEntryHours < 48 ? "#52c41a" : "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Reports Submitted"
              value={metrics.reportCompletionPct}
              suffix="%"
              prefix={<FileTextOutlined />}
              styles={{ content: { color: metrics.reportCompletionPct >= 80 ? "#52c41a" : "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="At-risk detected"
              value={metrics.atRiskCount}
              prefix={<WarningOutlined />}
              suffix={`of ${metrics.totalStudents}`}
              styles={{ content: { color: "#1677ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Recommendations issued"
              value={metrics.totalRecs}
              prefix={<RocketOutlined />}
              styles={{ content: { color: "#722ed1" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Process metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ textAlign: "center" }}>
            <Statistic
              title="Attendance records"
              value={metrics.attendanceRecords}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ textAlign: "center" }}>
            <Statistic
              title="Grades in system"
              value={metrics.gradeRecords}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ textAlign: "center" }}>
            <Statistic
              title="Students covered"
              value={metrics.totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Before/After Table */}
      <Card
        title="Before and After — Comparative Analysis"
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={beforeAfterData(metrics)}
          columns={columns}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
