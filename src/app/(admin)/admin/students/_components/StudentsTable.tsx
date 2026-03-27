"use client";

import React, { useState } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Avatar, Select,
  Modal, Form,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
  LineChartOutlined, BarChartOutlined, UserOutlined, LoginOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/utils";
import { deleteStudent } from "../../_actions/student-actions";
import { resetPassword } from "../../_actions/teacher-actions";
import { startImpersonation } from "../../_actions/impersonation-actions";
import StudentFormModal from "./StudentFormModal";
import StudentGradesModal from "./StudentGradesModal";
import StudentSocialModal from "./StudentSocialModal";

interface Student {
  id: string;
  phone: string;
  full_name: string;
  course_year: number | null;
  face_photo_url: string | null;
  created_at: string;
}

export default function StudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [gradesStudentId, setGradesStudentId] = useState<string | null>(null);
  const [socialStudentId, setSocialStudentId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetForm] = Form.useForm();
  const { message } = App.useApp();

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchesCourse = courseFilter ? s.course_year === courseFilter : true;
    return matchesSearch && matchesCourse;
  });

  const handleDelete = async (id: string) => {
    const res = await deleteStudent(id);
    if (res.error) message.error(res.error);
    else message.success("Студент удалён");
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
      render: (_, record) => (
        <Avatar
          src={record.face_photo_url ? undefined : undefined}
          icon={<UserOutlined />}
          style={{ background: "#722ed1" }}
        />
      ),
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
    },
    {
      title: "Курс",
      dataIndex: "course_year",
      key: "course_year",
      width: 80,
      render: (v: number | null) => v ?? "—",
      sorter: (a, b) => (a.course_year ?? 0) - (b.course_year ?? 0),
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
          <Button
            type="text"
            size="small"
            icon={<LoginOutlined />}
            title="Войти как"
            onClick={() => startImpersonation(record.id)}
          />
          <Button
            type="text"
            size="small"
            icon={<LineChartOutlined />}
            title="Оценки"
            onClick={() => setGradesStudentId(record.id)}
          />
          <Button
            type="text"
            size="small"
            icon={<BarChartOutlined />}
            title="Активность"
            onClick={() => setSocialStudentId(record.id)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingStudent(record);
              setFormOpen(true);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => {
              setResetUserId(record.id);
              setResetOpen(true);
            }}
          />
          <Popconfirm
            title="Удалить студента?"
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
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
          Студенты
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingStudent(null);
            setFormOpen(true);
          }}
        >
          Добавить
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Поиск по имени или телефону..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Курс"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setCourseFilter(v ?? null)}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ label: `${n} курс`, value: n }))}
        />
      </Space>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
      />

      <StudentFormModal
        open={formOpen}
        student={editingStudent}
        onClose={() => {
          setFormOpen(false);
          setEditingStudent(null);
        }}
      />

      <StudentGradesModal
        studentId={gradesStudentId}
        onClose={() => setGradesStudentId(null)}
      />

      <StudentSocialModal
        studentId={socialStudentId}
        onClose={() => setSocialStudentId(null)}
      />

      <Modal
        title="Сброс пароля"
        open={resetOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetOpen(false);
          resetForm.resetFields();
        }}
        okText="Сбросить"
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: "Введите пароль" },
              { min: 6, message: "Минимум 6 символов" },
            ]}
          >
            <Input.Password placeholder="Новый пароль" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
