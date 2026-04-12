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
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import StudentDetailDrawer from "./StudentDetailDrawer";

interface Student {
  id: string;
  full_name: string;
  email: string;
  face_photo_url: string | null;
  course_year: number | null;
}

export default function TeacherStudentsClient({
  students,
}: {
  students: Student[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.includes(search)
  );

  const selectedStudent = students.find((s) => s.id === selectedId);

  const columns: ColumnsType<Student> = [
    {
      title: "Студент",
      key: "student",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar icon={<UserOutlined />} size={36} />
          <div>
            <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{record.full_name}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Курс",
      dataIndex: "course_year",
      key: "course_year",
      width: 90,
      render: (v: number | null) =>
        v ? <Tag>{v} курс</Tag> : <Tag>—</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedId(record.id)}
        >
          Профиль студента
        </Button>
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
          placeholder="Поиск по имени или email"
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
        onRow={(record) => ({
          style: { cursor: "pointer" },
          onClick: () => setSelectedId(record.id),
        })}
      />

      <StudentDetailDrawer
        studentId={selectedId}
        studentName={selectedStudent?.full_name ?? ""}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
