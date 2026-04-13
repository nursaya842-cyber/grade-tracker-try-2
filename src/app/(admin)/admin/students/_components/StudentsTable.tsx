"use client";
import { useClientMount } from "@/hooks/use-client-mount";

import React, { useState, useTransition, useEffect, useRef } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Avatar, Select,
  Modal, Form,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
  LineChartOutlined, BarChartOutlined, UserOutlined, LoginOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter, usePathname } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { deleteStudent } from "../../_actions/student-actions";
import { resetPassword } from "../../_actions/teacher-actions";
import { startImpersonation } from "../../_actions/impersonation-actions";
import StudentFormModal from "./StudentFormModal";
import StudentGradesModal from "./StudentGradesModal";
import StudentSocialModal from "./StudentSocialModal";

interface Faculty {
  id: string;
  name: string;
}

interface Student {
  id: string;
  email: string;
  full_name: string;
  course_year: number | null;
  faculty_id: string | null;
  faculty_name: string | null;
  face_photo_url: string | null;
  created_at: string;
  gpa: number;
}

interface Props {
  students: Student[];
  faculties: Faculty[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  course: number | null;
  facultyId: string | null;
}

export default function StudentsTable({
  students,
  faculties,
  total,
  page,
  pageSize,
  search: initialSearch,
  course: initialCourse,
  facultyId: initialFacultyId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [gradesStudentId, setGradesStudentId] = useState<string | null>(null);
  const [socialStudentId, setSocialStudentId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetForm] = Form.useForm();
  const mounted = useClientMount();
  const { message } = App.useApp();

  function navigate(overrides: Record<string, string | number | null>) {
    const params = new URLSearchParams();
    const merged = {
      page: String(page),
      search: initialSearch,
      course: initialCourse ? String(initialCourse) : "",
      faculty: initialFacultyId ?? "",
      ...Object.fromEntries(
        Object.entries(overrides).map(([k, v]) => [k, v == null ? "" : String(v)])
      ),
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const handleDelete = async (id: string) => {
    const res = await deleteStudent(id);
    if (res.error) message.error(res.error);
    else { message.success("Студент удалён"); navigate({ page: 1 }); }
  };

  const handleResetPassword = async () => {
    const values = await resetForm.validateFields();
    if (!resetUserId) return;
    const res = await resetPassword(resetUserId, values.newPassword);
    if (res.error) message.error(res.error);
    else {
      message.success("Пароль сброшен");
      setResetOpen(false);
      resetForm.resetFields();
    }
  };

  const columns: ColumnsType<Student> = [
    {
      title: "Фото",
      key: "avatar",
      width: 60,
      render: () => <Avatar icon={<UserOutlined />} style={{ background: "#722ed1" }} />,
    },
    {
      title: "Имя",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Курс",
      dataIndex: "course_year",
      key: "course_year",
      width: 80,
      render: (v: number | null) => v ?? "—",
    },
    {
      title: "Факультет",
      dataIndex: "faculty_name",
      key: "faculty_name",
      render: (v: string | null) => v ?? <span style={{ color: "#999" }}>—</span>,
      responsive: ["md"] as const,
    },
    {
      title: "GPA",
      dataIndex: "gpa",
      key: "gpa",
      width: 80,
      render: (v: number) => (
        <span style={{ color: v >= 3.0 ? "#52c41a" : v >= 2.0 ? "#faad14" : "#f5222d", fontWeight: 600 }}>
          {v > 0 ? v.toFixed(2) : "—"}
        </span>
      ),
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
      responsive: ["lg"],
    },
    {
      title: "Действия",
      key: "actions",
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" size="small" icon={<LoginOutlined />} title="Войти как" onClick={() => startImpersonation(record.id)} />
          <Button type="text" size="small" icon={<LineChartOutlined />} title="Оценки" onClick={() => setGradesStudentId(record.id)} />
          <Button type="text" size="small" icon={<BarChartOutlined />} title="Активность" onClick={() => setSocialStudentId(record.id)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingStudent(record); setFormOpen(true); }} />
          <Button type="text" size="small" icon={<KeyOutlined />} onClick={() => { setResetUserId(record.id); setResetOpen(true); }} />
          <Popconfirm title="Удалить студента?" onConfirm={() => handleDelete(record.id)} okText="Удалить" cancelText="Отмена">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Студенты <span style={{ fontSize: 14, fontWeight: 400, color: "#8c8c8c" }}>({total})</span>
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingStudent(null); setFormOpen(true); }}>
          Добавить
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по имени или email..."
          allowClear
          value={searchVal}
          style={{ width: 300 }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchVal(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => navigate({ search: val, page: 1 }), 400);
          }}
          onPressEnter={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate({ search: searchVal, page: 1 });
          }}
          onClear={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate({ search: "", page: 1 });
          }}
        />
        <Select
          placeholder="Курс"
          allowClear
          value={initialCourse}
          style={{ width: 120 }}
          onChange={(v) => navigate({ course: v ?? null, page: 1 })}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ label: `${n} курс`, value: n }))}
        />
        <Select
          placeholder="Факультет"
          allowClear
          showSearch
          optionFilterProp="label"
          value={initialFacultyId}
          style={{ width: 200 }}
          onChange={(v) => navigate({ faculty: v ?? null, page: 1 })}
          options={faculties.map((f) => ({ label: f.name, value: f.id }))}
        />
      </Space>

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
          showTotal: (t, range) => `${range[0]}-${range[1]} из ${t}`,
          onChange: (p) => navigate({ page: p }),
        }}
      />

      <StudentFormModal
        open={formOpen}
        student={editingStudent}
        faculties={faculties}
        onClose={() => { setFormOpen(false); setEditingStudent(null); navigate({ page: 1 }); }}
      />
      <StudentGradesModal studentId={gradesStudentId} onClose={() => setGradesStudentId(null)} />
      <StudentSocialModal studentId={socialStudentId} onClose={() => setSocialStudentId(null)} />

      <Modal
        forceRender={mounted}
        title="Сброс пароля"
        open={resetOpen}
        onOk={handleResetPassword}
        onCancel={() => { setResetOpen(false); resetForm.resetFields(); }}
        okText="Сбросить"
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[{ required: true, message: "Введите пароль" }, { min: 6, message: "Минимум 6 символов" }]}
          >
            <Input.Password placeholder="Новый пароль" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
