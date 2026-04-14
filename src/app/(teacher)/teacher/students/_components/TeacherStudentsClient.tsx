"use client";

import React, { useState, useRef } from "react";
import { Typography, Table, Avatar, Input, Tag } from "antd";
import { UserOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import type { ColumnsType } from "antd/es/table";
import StudentDetailDrawer from "./StudentDetailDrawer";
import { Button } from "antd";

interface Student {
  id: string;
  full_name: string;
  email: string;
  face_photo_url: string | null;
  course_year: number | null;
}

interface Props {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
}

export default function TeacherStudentsClient({ students, total, page, pageSize, search }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [searchValue, setSearchValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { page: String(page), search, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v != null ? String(v) : ""])) };
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    if (merged.search) params.set("search", merged.search);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ search: value, page: 1 }), 400);
  };

  const openDrawer = (id: string, name: string) => {
    setSelectedId(id);
    setSelectedName(name);
  };

  const columns: ColumnsType<Student> = [
    {
      title: "Student",
      key: "student",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar icon={<UserOutlined />} src={record.face_photo_url ?? undefined} size={36} />
          <div>
            <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{record.full_name}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Year",
      dataIndex: "course_year",
      key: "course_year",
      width: 90,
      render: (v: number | null) => v ? <Tag>Year {v}</Tag> : <Tag>—</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); openDrawer(record.id, record.full_name); }}
        >
          Student Profile
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          My Students
        </Typography.Title>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name or email"
          style={{ width: 300 }}
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
          onClear={() => handleSearch("")}
        />
      </div>

      <Table
        dataSource={students}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Total: ${t} students`,
          onChange: (p) => navigate({ page: p }),
        }}
        onRow={(record) => ({
          style: { cursor: "pointer" },
          onClick: () => openDrawer(record.id, record.full_name),
        })}
      />

      <StudentDetailDrawer
        studentId={selectedId}
        studentName={selectedName}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
