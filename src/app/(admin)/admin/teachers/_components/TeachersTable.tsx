"use client";

import React, { useState } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Modal, Form,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, FileTextOutlined, LoginOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/utils";
import { deleteTeacher, resetPassword } from "../../_actions/teacher-actions";
import { startImpersonation } from "../../_actions/impersonation-actions";
import TeacherFormModal from "./TeacherFormModal";
import { createClient } from "@/lib/supabase/client";

interface Teacher {
  id: string;
  email: string;
  full_name: string;
  diploma_url: string | null;
  created_at: string;
}

export default function TeachersTable({ teachers }: { teachers: Teacher[] }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const { message } = App.useApp();
  const [resetForm] = Form.useForm();

  const filtered = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.includes(search)
  );

  const handleDelete = async (id: string) => {
    const res = await deleteTeacher(id);
    if (res.error) message.error(res.error);
    else message.success("Преподаватель удалён");
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

  const handleViewDiploma = async (path: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("diplomas")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const columns: ColumnsType<Teacher> = [
    {
      title: "Имя",
      dataIndex: "full_name",
      key: "full_name",
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Диплом",
      key: "diploma",
      render: (_, record) =>
        record.diploma_url ? (
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDiploma(record.diploma_url!)}
          >
            Открыть
          </Button>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
      sorter: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: "Действия",
      key: "actions",
      width: 200,
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
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTeacher(record);
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
            title="Удалить преподавателя?"
            description="Будущие уроки будут отвязаны."
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
          Преподаватели
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTeacher(null);
            setFormOpen(true);
          }}
        >
          Добавить
        </Button>
      </div>

      <Input.Search
        placeholder="Поиск по имени или email..."
        allowClear
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 360 }}
      />

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
      />

      <TeacherFormModal
        open={formOpen}
        teacher={editingTeacher}
        onClose={() => {
          setFormOpen(false);
          setEditingTeacher(null);
        }}
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
