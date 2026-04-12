"use client";

import { useState } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Modal, Form, Select, Tag,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { createParent, updateParent, deleteParent } from "../../_actions/parent-actions";
import { resetPassword } from "../../_actions/teacher-actions";
import { formatDateTime } from "@/lib/utils";

interface Child {
  id: string;
  name: string;
}

interface Parent {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  children: Child[];
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  course_year: number | null;
}

interface Props {
  parents: Parent[];
  students: Student[];
}

export default function ParentsTable({ parents, students }: Props) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const filtered = parents.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    if (editing) {
      const res = await updateParent(editing.id, {
        fullName: values.fullName,
        email: values.email,
        childrenIds: values.childrenIds ?? [],
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Родитель обновлён");
        setFormOpen(false);
        setEditing(null);
      }
    } else {
      const res = await createParent({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        childrenIds: values.childrenIds ?? [],
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Родитель создан");
        setFormOpen(false);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteParent(id);
    if (res.error) message.error(res.error);
    else message.success("Родитель удалён");
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

  const columns: ColumnsType<Parent> = [
    {
      title: "ФИО",
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
      title: "Дети",
      key: "children",
      render: (_, record) =>
        record.children.length > 0
          ? record.children.map((c) => (
              <Tag key={c.id} color="blue" style={{ marginBottom: 2 }}>
                {c.name}
              </Tag>
            ))
          : <span style={{ color: "#999" }}>—</span>,
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
      responsive: ["lg"] as const,
    },
    {
      title: "Действия",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              form.setFieldsValue({
                fullName: record.full_name,
                email: record.email,
                childrenIds: record.children.map((c) => c.id),
              });
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
            title="Удалить родителя?"
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
          Родители
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
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

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? "Редактировать родителя" : "Новый родитель"}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={editing ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        width={600}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="fullName"
            label="ФИО"
            rules={[{ required: true, message: "Введите ФИО" }]}
          >
            <Input placeholder="Иванова Мария Петровна" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Введите email" },
              { type: "email", message: "Некорректный email" },
            ]}
          >
            <Input placeholder="parent@example.com" />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: "Введите пароль" },
                { min: 6, message: "Минимум 6 символов" },
              ]}
            >
              <Input.Password placeholder="Пароль" />
            </Form.Item>
          )}
          <Form.Item name="childrenIds" label="Дети (студенты)">
            <Select
              mode="multiple"
              placeholder="Выберите студентов"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={students.map((s) => ({
                label: `${s.full_name} (${s.email})`,
                value: s.id,
              }))}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
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
