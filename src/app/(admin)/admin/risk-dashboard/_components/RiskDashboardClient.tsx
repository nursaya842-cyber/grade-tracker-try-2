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
      message.success("Преподаватель назначен");
      setAssignModal(null);
      setSelectedTeacher(null);
    }
  };

  const heatmapColumns: ColumnsType<HeatmapRow> = [
    {
      title: "Студент",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Курс",
      dataIndex: "courseYear",
      key: "courseYear",
      width: 80,
      render: (v: number | null) => (v ? `${v}` : "—"),
    },
    {
      title: "Посещаемость",
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
      title: "Оценки",
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
      title: "Клубы",
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
    { title: "Преподаватель", dataIndex: "teacherName", key: "teacherName" },
    {
      title: "Незакрытых",
      dataIndex: "unsubmittedCount",
      key: "unsubmittedCount",
      width: 120,
      sorter: (a, b) => a.unsubmittedCount - b.unsubmittedCount,
      render: (v: number) => <Tag color={v > 3 ? "red" : "orange"}>{v}</Tag>,
    },
    {
      title: "Самый старый",
      dataIndex: "oldestPending",
      key: "oldestPending",
      width: 180,
      render: (v: string | null) => (v ? formatDateTime(v) : "—"),
    },
  ];

  const unassignedColumns: ColumnsType<UnassignedLesson> = [
    { title: "Предмет", dataIndex: "subjectName", key: "subjectName" },
    {
      title: "Дата",
      dataIndex: "startsAt",
      key: "startsAt",
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "Действие",
      key: "action",
      width: 200,
      render: (_: unknown, record: UnassignedLesson) => (
        <Button size="small" type="primary" onClick={() => setAssignModal(record.id)}>
          Назначить преподавателя
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Риск-дашборд</Typography.Title>

      {/* KPI Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="В зоне риска"
              value={kpi.atRiskStudents}
              prefix={<WarningOutlined />}
              styles={{ content: { color: kpi.atRiskStudents > 0 ? "#f5222d" : "#52c41a" } }}
              suffix="студентов"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Просроченные отчёты"
              value={kpi.overdueTeachers}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: kpi.overdueTeachers > 0 ? "#faad14" : "#52c41a" } }}
              suffix="преподавателей"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Средняя посещаемость (30д)"
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
              title="Участие в клубах"
              value={kpi.participationRate}
              prefix={<TeamOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Risk Heatmap */}
      <Card
        title="Карта рисков студентов"
        extra={
          <Input.Search
            placeholder="Поиск"
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
      <Card title="Преподаватели с незакрытыми отчётами" style={{ marginBottom: 24 }}>
        <Table
          dataSource={pendingReports}
          columns={reportColumns}
          rowKey="teacherId"
          pagination={false}
          size="small"
          locale={{ emptyText: "Нет просроченных отчётов" }}
        />
      </Card>

      {/* Unassigned Lessons */}
      <Card title="Уроки без преподавателя">
        <Table
          dataSource={unassignedLessons}
          columns={unassignedColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: "Все уроки назначены" }}
        />
      </Card>

      {/* Assign Teacher Modal */}
      <Modal
        title="Назначить преподавателя"
        open={!!assignModal}
        onCancel={() => {
          setAssignModal(null);
          setSelectedTeacher(null);
        }}
        onOk={handleAssign}
        okText="Назначить"
        cancelText="Отмена"
        confirmLoading={assigning}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Выберите преподавателя"
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
