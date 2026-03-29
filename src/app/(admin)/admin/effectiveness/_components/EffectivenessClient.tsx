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
    metric: "Время выставления оценок",
    before: "~7 дней (ручной Excel)",
    after: `${m.avgGradeEntryHours} часов (автоматический трекинг)`,
    improvement: m.avgGradeEntryHours > 0 ? `${Math.round((168 - m.avgGradeEntryHours) / 168 * 100)}% быстрее` : "—",
    color: "green",
  },
  {
    key: "2",
    metric: "Заполнение отчётов",
    before: "~60% (оценка)",
    after: `${m.reportCompletionPct}% (${m.reportedLessons}/${m.totalPastLessons})`,
    improvement: m.reportCompletionPct > 60 ? `+${m.reportCompletionPct - 60}%` : "—",
    color: m.reportCompletionPct > 60 ? "green" : "orange",
  },
  {
    key: "3",
    metric: "At-risk студенты обнаружены",
    before: "0 (не отслеживалось)",
    after: `${m.atRiskCount} студентов автоматически`,
    improvement: "Новая возможность",
    color: "blue",
  },
  {
    key: "4",
    metric: "Персональные рекомендации",
    before: "0 (отсутствовали)",
    after: `${m.totalRecs} сгенерировано, ${m.activeRecs} активных`,
    improvement: "Новая возможность",
    color: "blue",
  },
  {
    key: "5",
    metric: "Посещаемость оцифрована",
    before: "Бумажные журналы",
    after: `${m.attendanceRecords.toLocaleString()} записей`,
    improvement: "100% цифровизация",
    color: "green",
  },
  {
    key: "6",
    metric: "Оценки в системе",
    before: "Excel-таблицы",
    after: `${m.gradeRecords.toLocaleString()} записей`,
    improvement: "100% цифровизация",
    color: "green",
  },
  {
    key: "7",
    metric: "Еженедельные Check-in",
    before: "Не проводились",
    after: `${m.checkinCount} заполнено`,
    improvement: "Новая возможность",
    color: "blue",
  },
];

const columns = [
  {
    title: "Метрика",
    dataIndex: "metric",
    key: "metric",
    width: 250,
    render: (v: string) => <Text strong>{v}</Text>,
  },
  {
    title: "До (ручной процесс)",
    dataIndex: "before",
    key: "before",
    render: (v: string) => <Text type="secondary">{v}</Text>,
  },
  {
    title: "После (CVM System)",
    dataIndex: "after",
    key: "after",
    render: (v: string) => <Text>{v}</Text>,
  },
  {
    title: "Улучшение",
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
        Эффективность системы
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Сравнение ручных процессов с KBTU CVM System на основе реальных данных
      </Text>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Скорость выставления"
              value={metrics.avgGradeEntryHours}
              suffix="ч"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: metrics.avgGradeEntryHours < 48 ? "#52c41a" : "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Отчёты заполнены"
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
              title="At-risk обнаружено"
              value={metrics.atRiskCount}
              prefix={<WarningOutlined />}
              suffix={`из ${metrics.totalStudents}`}
              styles={{ content: { color: "#1677ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Рекомендации выданы"
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
              title="Записей посещаемости"
              value={metrics.attendanceRecords}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ textAlign: "center" }}>
            <Statistic
              title="Оценок в системе"
              value={metrics.gradeRecords}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ textAlign: "center" }}>
            <Statistic
              title="Студентов охвачено"
              value={metrics.totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Before/After Table */}
      <Card
        title="До и После — сравнительный анализ"
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
