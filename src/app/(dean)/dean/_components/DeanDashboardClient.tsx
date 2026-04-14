"use client";

import { Typography, Row, Col, Card, Statistic, Tag, Empty, Progress } from "antd";
import {
  TeamOutlined,
  PercentageOutlined,
  AlertOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface KPI {
  totalStudents: number;
  avgGpa: number;
  avgAttendance: number;
  atRiskCount: number;
}

interface GradeDistItem {
  range: string;
  count: number;
}

interface AttByYearItem {
  year: string;
  attendance: number;
}

interface EngagementItem {
  segment: string;
  count: number;
  color: string;
}

interface TopStudentItem {
  name: string;
  gpa: number;
}

interface Props {
  kpi: KPI;
  facultyName: string | null;
  gradeDistribution: GradeDistItem[];
  attendanceByYear: AttByYearItem[];
  engagementSegments: EngagementItem[];
  topStudents: TopStudentItem[];
}

const GRADE_COLORS = ["#f5222d", "#fa8c16", "#faad14", "#52c41a", "#1677ff"];

function gpaColor(gpa: number): string {
  if (gpa >= 3.0) return "#52c41a";
  if (gpa >= 2.0) return "#faad14";
  return "#f5222d";
}

function attColor(att: number): string {
  if (att >= 80) return "#52c41a";
  if (att >= 60) return "#faad14";
  return "#f5222d";
}

export default function DeanDashboardClient({
  kpi,
  facultyName,
  gradeDistribution,
  attendanceByYear,
  engagementSegments,
  topStudents,
}: Props) {
  const atRiskPct =
    kpi.totalStudents > 0 ? Math.round((kpi.atRiskCount / kpi.totalStudents) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Faculty Dashboard
        </Typography.Title>
        {facultyName && (
          <Tag color="purple" style={{ marginTop: 6, fontSize: 13, padding: "2px 10px" }}>
            {facultyName}
          </Tag>
        )}
      </div>

      {/* KPI cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={kpi.totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average GPA"
              value={kpi.avgGpa.toFixed(2)}
              suffix="/ 4.0"
              prefix={<RiseOutlined />}
              styles={{ content: { color: gpaColor(kpi.avgGpa) } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Attendance (30d)"
              value={kpi.avgAttendance}
              suffix="%"
              prefix={<PercentageOutlined />}
              styles={{ content: { color: attColor(kpi.avgAttendance) } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="At-Risk Students"
              value={kpi.atRiskCount}
              suffix={`/ ${kpi.totalStudents}`}
              prefix={<AlertOutlined />}
              styles={{ content: { color: kpi.atRiskCount > 0 ? "#f5222d" : "#52c41a" } }}
            />
            {kpi.totalStudents > 0 && (
              <Progress
                percent={atRiskPct}
                showInfo={false}
                strokeColor={kpi.atRiskCount > 0 ? "#f5222d" : "#52c41a"}
                size="small"
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Grade Distribution */}
        <Col xs={24} lg={12}>
          <Card title="Grade Distribution">
            {gradeDistribution.every((d) => d.count === 0) ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No grade data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gradeDistribution} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {gradeDistribution.map((_, i) => (
                      <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Attendance by Course Year */}
        <Col xs={24} lg={12}>
          <Card title="Average Attendance by Year">
            {attendanceByYear.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attendance data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={attendanceByYear} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} />
                  <Bar dataKey="attendance" name="Attendance %" radius={[4, 4, 0, 0]} fill="#1677ff">
                    {attendanceByYear.map((d, i) => (
                      <Cell key={i} fill={attColor(d.attendance)} />
                    ))}
                    <LabelList
                      dataKey="attendance"
                      position="top"
                      formatter={(v: unknown) => `${v}%`}
                      style={{ fontSize: 12 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]}>
        {/* Engagement Segments */}
        <Col xs={24} lg={12}>
          <Card title="Engagement Segments">
            {engagementSegments.every((d) => d.count === 0) ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No engagement data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={engagementSegments}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {engagementSegments.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Top 5 Students by GPA */}
        <Col xs={24} lg={12}>
          <Card title="Top 5 Students by GPA">
            {topStudents.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No grade data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={topStudents}
                  margin={{ top: 10, right: 48, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 4]} tickCount={5} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={130}
                    tickFormatter={(v: string) =>
                      v.length > 18 ? `${v.slice(0, 17)}…` : v
                    }
                  />
                  <Tooltip formatter={(v) => [typeof v === "number" ? v.toFixed(2) : v, "GPA"]} />
                  <Bar dataKey="gpa" name="GPA" radius={[0, 4, 4, 0]}>
                    {topStudents.map((d, i) => (
                      <Cell key={i} fill={gpaColor(d.gpa)} />
                    ))}
                    <LabelList
                      dataKey="gpa"
                      position="right"
                      formatter={(v: unknown) => typeof v === "number" ? v.toFixed(2) : String(v)}
                      style={{ fontSize: 12 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
