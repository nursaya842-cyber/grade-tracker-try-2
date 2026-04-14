"use client";

import { useState } from "react";
import {
  Typography,
  Row,
  Col,
  Statistic,
  Card,
  Table,
  Tag,
  Input,
  Modal,
  Select,
  Button,
  App,
} from "antd";
import {
  WarningOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { assignTeacherToLesson } from "./risk-actions";
import { formatDateTime } from "@/lib/utils";

interface KPI {
  atRiskStudents: number;
  overdueTeachers: number;
  avgAttendance: number;
  participationRate: number;
}

interface HeatmapRow {
  id: string;
  fullName: string;
  courseYear: number | null;
  attendancePct: number | null;
  avgGrade: number | null;
  signupCount: number;
}

interface PendingReport {
  teacherId: string;
  teacherName: string;
  unsubmittedCount: number;
  oldestPending: string | null;
}

interface UnassignedLesson {
  id: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
}

interface Teacher {
  id: string;
  fullName: string;
}

interface Props {
  kpi: KPI;
  heatmapData: HeatmapRow[];
  pendingReports: PendingReport[];
  unassignedLessons: UnassignedLesson[];
  teachers: Teacher[];
}

function riskColor(value: number | null, thresholdGreen: number, thresholdRed: number): string {
  if (value === null) return "#d9d9d9";
  if (value >= thresholdGreen) return "#52c41a";
  if (value >= thresholdRed) return "#faad14";
  return "#f5222d";
}

export default function RiskDashboardClient({
  kpi,
  heatmapData,
  pendingReports,
  unassignedLessons,
  teachers,
}: Props) {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const filteredHeatmap = heatmapData.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!assignModal || !selectedTeacher) return;
    setAssigning(true);
    const result = await assignTeacherToLesson(assignModal, selectedTeacher);
    setAssigning(false);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Teacher assigned");
      setAssignModal(null);
      setSelectedTeacher(null);
    }
  };

  const heatmapColumns: ColumnsType<HeatmapRow> = [
    {
      title: "Student",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Year",
      dataIndex: "courseYear",
      key: "courseYear",
      width: 80,
      render: (v: number | null) => (v ? `${v}` : "—"),
    },
    {
      title: "Attendance",
      dataIndex: "attendancePct",
      key: "attendancePct",
      width: 140,
      sorter: (a, b) => (a.attendancePct ?? 0) - (b.attendancePct ?? 0),
      render: (v: number | null) => (
        <Tag
          color={riskColor(v, 70, 50)}
          style={{ minWidth: 50, textAlign: "center" }}
        >
          {v !== null ? `${v}%` : "—"}
        </Tag>
      ),
    },
    {
      title: "Grades",
      dataIndex: "avgGrade",
      key: "avgGrade",
      width: 120,
      sorter: (a, b) => (a.avgGrade ?? 0) - (b.avgGrade ?? 0),
      render: (v: number | null) => (
        <Tag
          color={riskColor(v, 70, 50)}
          style={{ minWidth: 40, textAlign: "center" }}
        >
          {v !== null ? v : "—"}
        </Tag>
      ),
    },
    {
      title: "Clubs",
      dataIndex: "signupCount",
      key: "signupCount",
      width: 120,
      sorter: (a, b) => a.signupCount - b.signupCount,
      render: (v: number) => (
        <Tag
          color={v > 0 ? "#52c41a" : "#f5222d"}
          style={{ minWidth: 30, textAlign: "center" }}
        >
          {v}
        </Tag>
      ),
    },
  ];

  const reportColumns: ColumnsType<PendingReport> = [
    { title: "Teacher", dataIndex: "teacherName", key: "teacherName" },
    {
      title: "Unsubmitted",
      dataIndex: "unsubmittedCount",
      key: "unsubmittedCount",
      width: 120,
      sorter: (a, b) => a.unsubmittedCount - b.unsubmittedCount,
      render: (v: number) => <Tag color={v > 3 ? "red" : "orange"}>{v}</Tag>,
    },
    {
      title: "Oldest pending",
      dataIndex: "oldestPending",
      key: "oldestPending",
      width: 180,
      render: (v: string | null) => (v ? formatDateTime(v) : "—"),
    },
  ];

  const unassignedColumns: ColumnsType<UnassignedLesson> = [
    { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
    {
      title: "Date",
      dataIndex: "startsAt",
      key: "startsAt",
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "Action",
      key: "action",
      width: 200,
      render: (_: unknown, record: UnassignedLesson) => (
        <Button size="small" type="primary" onClick={() => setAssignModal(record.id)}>
          Assign teacher
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Risk Dashboard</Typography.Title>

      {/* KPI Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="At risk"
              value={kpi.atRiskStudents}
              prefix={<WarningOutlined />}
              styles={{ content: { color: kpi.atRiskStudents > 0 ? "#f5222d" : "#52c41a" } }}
              suffix="students"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue reports"
              value={kpi.overdueTeachers}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: kpi.overdueTeachers > 0 ? "#faad14" : "#52c41a" } }}
              suffix="teachers"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg. attendance (30d)"
              value={kpi.avgAttendance}
              prefix={<PercentageOutlined />}
              suffix="%"
              styles={{ content: { color: kpi.avgAttendance >= 70 ? "#52c41a" : "#f5222d" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Club participation"
              value={kpi.participationRate}
              prefix={<TeamOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Risk Heatmap */}
      <Card
        title="Student Risk Heatmap"
        extra={
          <Input.Search
            placeholder="Search"
            style={{ width: 250 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          dataSource={filteredHeatmap}
          columns={heatmapColumns}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
        />
      </Card>

      {/* Pending Reports */}
      <Card title="Teachers with pending reports" style={{ marginBottom: 24 }}>
        <Table
          dataSource={pendingReports}
          columns={reportColumns}
          rowKey="teacherId"
          pagination={false}
          size="small"
          locale={{ emptyText: "No overdue reports" }}
        />
      </Card>

      {/* Unassigned Lessons */}
      <Card title="Lessons without a teacher">
        <Table
          dataSource={unassignedLessons}
          columns={unassignedColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: "All lessons are assigned" }}
        />
      </Card>

      {/* Assign Teacher Modal */}
      <Modal
        title="Assign teacher"
        open={!!assignModal}
        onCancel={() => {
          setAssignModal(null);
          setSelectedTeacher(null);
        }}
        onOk={handleAssign}
        okText="Assign"
        cancelText="Cancel"
        confirmLoading={assigning}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Select a teacher"
          showSearch
          optionFilterProp="label"
          value={selectedTeacher}
          onChange={setSelectedTeacher}
          options={teachers.map((t) => ({ label: t.fullName, value: t.id }))}
        />
      </Modal>
    </div>
  );
}
