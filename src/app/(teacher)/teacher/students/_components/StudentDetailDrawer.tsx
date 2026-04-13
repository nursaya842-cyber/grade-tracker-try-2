"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  Avatar,
  Typography,
  Row,
  Col,
  Card,
  Tag,
  Progress,
  Spin,
  Tabs,
  Table,
  Alert,
  Space,
  Empty,
} from "antd";
import {
  UserOutlined,
  ExclamationCircleFilled,
  WarningFilled,
  CheckCircleFilled,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchStudentFullProfile } from "../../_actions/teacher-actions";
import type { ColumnsType } from "antd/es/table";

type FullProfile = Awaited<ReturnType<typeof fetchStudentFullProfile>>;

interface Props {
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}

function getRiskConfig(segment: string): { label: string; color: string } {
  if (segment === "at-risk") return { label: "Высокий риск", color: "red" };
  if (segment === "declining") return { label: "Средний риск", color: "orange" };
  if (segment === "stable") return { label: "Стабильный", color: "blue" };
  return { label: "Низкий риск", color: "green" };
}

function getPriorityIcon(score: number) {
  if (score > 0.7) return <ExclamationCircleFilled style={{ color: "#f5222d" }} />;
  if (score > 0.4) return <WarningFilled style={{ color: "#faad14" }} />;
  return <CheckCircleFilled style={{ color: "#52c41a" }} />;
}

function getBarColor(val: number, lo: number, hi: number): string {
  if (val >= hi) return "#52c41a";
  if (val >= lo) return "#faad14";
  return "#f5222d";
}

// Build chart data: merge all subjects into timeline series
function buildChartData(subjectGrades: NonNullable<FullProfile>["subjectGrades"]) {
  if (subjectGrades.length === 0) return { data: [], subjects: [] };

  const subjectNames = subjectGrades.map((s) => s.name);

  // Collect all dates
  const allDates = new Set<string>();
  for (const s of subjectGrades) {
    for (const g of s.scores) {
      allDates.add(g.date.slice(0, 10));
    }
  }

  const sorted = [...allDates].sort();

  const data = sorted.map((date) => {
    const point: Record<string, string | number> = {
      date: date.slice(5), // MM-DD
    };
    for (const s of subjectGrades) {
      const match = s.scores.find((g) => g.date.slice(0, 10) === date);
      if (match) point[s.name] = match.score;
    }
    return point;
  });

  return { data, subjects: subjectNames };
}

const COLORS = ["#1677ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2"];

export default function StudentDetailDrawer({ studentId, studentName, onClose }: Props) {
  const [profile, setProfile] = useState<FullProfile>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setProfile(null);
    fetchStudentFullProfile(studentId).then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, [studentId]);

  const p = profile;
  const risk = p ? getRiskConfig(p.stats.engagement.segment) : null;
  const { data: chartData, subjects: chartSubjects } = p ? buildChartData(p.subjectGrades) : { data: [], subjects: [] };

  const attColumns: ColumnsType<NonNullable<FullProfile>["subjectAttendance"][number]> = [
    { title: "Предмет", dataIndex: "name", key: "name" },
    { title: "Всего", dataIndex: "total", key: "total", width: 70 },
    { title: "Присутствовал", dataIndex: "present", key: "present", width: 120 },
    {
      title: "Посещаемость",
      dataIndex: "pct",
      key: "pct",
      width: 160,
      render: (v: number) => (
        <Progress percent={v} strokeColor={getBarColor(v, 60, 80)} size="small" />
      ),
    },
  ];

  const checkinColumns: ColumnsType<NonNullable<FullProfile>["checkins"][number]> = [
    { title: "Неделя", dataIndex: "week_start", key: "week_start", width: 110 },
    {
      title: "Стресс",
      dataIndex: "stress_level",
      key: "stress_level",
      width: 80,
      render: (v: number) => <Tag color={v >= 7 ? "red" : v >= 5 ? "orange" : "green"}>{v}/10</Tag>,
    },
    {
      title: "Мотивация",
      dataIndex: "motivation_level",
      key: "motivation_level",
      width: 90,
      render: (v: number) => <Tag color={v >= 7 ? "green" : v >= 4 ? "orange" : "red"}>{v}/10</Tag>,
    },
    {
      title: "Понимание",
      dataIndex: "understanding",
      key: "understanding",
      width: 100,
      render: (v: number) => <Tag color={v >= 7 ? "green" : v >= 4 ? "orange" : "red"}>{v}/10</Tag>,
    },
    {
      title: "AI-резюме заметки",
      dataIndex: "ai_summary",
      key: "ai_summary",
      render: (v: string | null) =>
        v ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>{v}</Typography.Text> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <Avatar icon={<UserOutlined />} src={p?.photoSignedUrl} />
          <span>{studentName}</span>
          {risk && <Tag color={risk.color}>{risk.label}</Tag>}
        </Space>
      }
      open={!!studentId}
      onClose={onClose}
      size="large"
      styles={{ body: { padding: "16px 24px" } }}
    >
      {loading && (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && p && (
        <>
          {/* ── Stats row ── */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: "GPA", value: p.stats.gpa.toFixed(2), suffix: "/ 4.0", pct: Math.round(p.stats.gpa / 4 * 100), lo: 50, hi: 75 },
              { label: "Средний балл", value: p.stats.avgGrade.toFixed(1), suffix: "/ 100", pct: p.stats.avgGrade, lo: 50, hi: 70 },
              { label: "Посещаемость", value: `${p.stats.attendancePct}%`, suffix: "", pct: p.stats.attendancePct, lo: 60, hi: 80 },
              { label: "Вовлечённость", value: `${p.stats.engagement.score}%`, suffix: "", pct: p.stats.engagement.score, lo: 40, hi: 70, customColor: p.stats.engagement.color },
              { label: "Health Score", value: String(p.stats.academicHealth), suffix: "/ 100", pct: p.stats.academicHealth, lo: 50, hi: 75 },
            ].map((s) => (
              <Col span={Math.floor(24 / 5)} key={s.label}>
                <Card size="small" styles={{ body: { padding: "10px 12px" } }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Typography.Text>
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: s.customColor ?? getBarColor(s.pct, s.lo, s.hi) }}>
                    {s.value}
                  </div>
                  {s.suffix && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{s.suffix}</Typography.Text>}
                  <Progress
                    percent={s.pct}
                    showInfo={false}
                    strokeColor={s.customColor ?? getBarColor(s.pct, s.lo, s.hi)}
                    style={{ marginTop: 4, marginBottom: 0 }}
                    size="small"
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* ── Tabs ── */}
          <Tabs
            size="small"
            items={[
              {
                key: "recs",
                label: `Рекомендации (${p.recommendations.length})`,
                children: (
                  <div>
                    {p.recommendations.length === 0 ? (
                      <Empty description="Нет активных рекомендаций" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      p.recommendations.map((rec) => (
                        <Card
                          key={rec.id}
                          size="small"
                          style={{ borderLeft: `4px solid ${rec.priority_score > 0.7 ? "#f5222d" : rec.priority_score > 0.4 ? "#faad14" : "#52c41a"}`, marginBottom: 8 }}
                          styles={{ body: { padding: "10px 14px" } }}
                        >
                          <Space size={6} style={{ flexWrap: "wrap" }}>
                            {getPriorityIcon(rec.priority_score)}
                            <Typography.Text strong>{rec.title ?? rec.next_action.slice(0, 40)}</Typography.Text>
                            <Tag color={rec.category === "academic" ? "blue" : rec.category === "social" ? "green" : "orange"} style={{ margin: 0 }}>
                              {rec.category === "academic" ? "Академическое" : rec.category === "social" ? "Социальное" : "Административное"}
                            </Tag>
                          </Space>
                          <div style={{ fontSize: 13, color: "#595959", marginTop: 6 }}>{rec.next_action}</div>
                          {rec.action && (
                            <div style={{ marginTop: 4, fontSize: 12 }}>
                              <Typography.Text type="secondary">Действие: </Typography.Text>
                              <Typography.Text>{rec.action}</Typography.Text>
                            </div>
                          )}
                          {rec.expected_effect && (
                            <div style={{ marginTop: 2, fontSize: 12, color: "#52c41a" }}>
                              <ThunderboltOutlined /> Ожидаемый эффект: {rec.expected_effect}
                            </div>
                          )}
                          {rec.deadline && (
                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Срок: {new Date(rec.deadline).toLocaleDateString("ru-RU")}</Typography.Text>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: "grades",
                label: "Динамика оценок",
                children: chartData.length === 0 ? (
                  <Empty description="Нет данных об оценках" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {chartSubjects.map((subj, i) => (
                        <Line
                          key={subj}
                          type="monotone"
                          dataKey={subj}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ),
              },
              {
                key: "attendance",
                label: "Посещаемость",
                children: p.subjectAttendance.length === 0 ? (
                  <Empty description="Нет данных о посещаемости" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table
                    dataSource={p.subjectAttendance}
                    columns={attColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ),
              },
              {
                key: "checkin",
                label: `Самочувствие (${p.checkins.length})`,
                children: (
                  <div>
                    {p.checkinAvg !== null && (
                      <Alert
                        type={p.checkinAvg >= 7 ? "success" : p.checkinAvg >= 5 ? "warning" : "error"}
                        title={`Средний wellbeing-индекс за последние 4 недели: ${p.checkinAvg}/10`}
                        style={{ marginBottom: 12 }}
                        showIcon
                      />
                    )}
                    {p.checkins.length === 0 ? (
                      <Empty description="Студент ещё не заполнял check-in" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Table
                        dataSource={p.checkins}
                        columns={checkinColumns}
                        rowKey="week_start"
                        size="small"
                        pagination={false}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {!loading && !p && studentId && (
        <Empty description="Не удалось загрузить данные студента" />
      )}
    </Drawer>
  );
}
