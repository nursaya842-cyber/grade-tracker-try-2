"use client";

import React, { useState } from "react";
import {
  Typography,
  Table,
  Avatar,
  Input,
  Button,
  Tag,
} from "antd";
import {
  LineChartOutlined,
  BarChartOutlined,
  UserOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PerformanceModal from "./PerformanceModal";
import AttendanceModal from "./AttendanceModal";

interface Student {
  id: string;
  full_name: string;
  phone: string;
  face_photo_url: string | null;
  course_year: number | null;
}

export default function TeacherStudentsClient({
  students,
}: {
  students: Student[];
}) {
  const [search, setSearch] = useState("");
  const [perfStudentId, setPerfStudentId] = useState<string | null>(null);
  const [attStudentId, setAttStudentId] = useState<string | null>(null);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const columns: ColumnsType<Student> = [
    {
      title: "Фото",
      dataIndex: "face_photo_url",
      key: "photo",
      width: 60,
      render: () => <Avatar icon={<UserOutlined />} />,
    },
    {
      title: "Имя",
      dataIndex: "full_name",
      key: "full_name",
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      width: 160,
    },
    {
      title: "Курс",
      dataIndex: "course_year",
      key: "course_year",
      width: 80,
      render: (v: number | null) =>
        v ? <Tag>{v} курс</Tag> : <Tag>—</Tag>,
    },
    {
      title: "Действия",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            size="small"
            icon={<LineChartOutlined />}
            onClick={() => setPerfStudentId(record.id)}
          >
            Оценки
          </Button>
          <Button
            size="small"
            icon={<BarChartOutlined />}
            onClick={() => setAttStudentId(record.id)}
          >
            Посещаемость
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Мои студенты
        </Typography.Title>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по имени или телефону"
          style={{ width: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <PerformanceModal
        studentId={perfStudentId}
        studentName={students.find((s) => s.id === perfStudentId)?.full_name ?? ""}
        onClose={() => setPerfStudentId(null)}
      />

      <AttendanceModal
        studentId={attStudentId}
        studentName={students.find((s) => s.id === attStudentId)?.full_name ?? ""}
        onClose={() => setAttStudentId(null)}
      />
    </div>
  );
}
