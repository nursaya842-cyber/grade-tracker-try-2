"use client";

import { useClientMount } from "@/hooks/use-client-mount";
import { useState, useTransition, useRef, useCallback } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Modal, Form, Select, Tag,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter, usePathname } from "next/navigation";
import { createParent, updateParent, deleteParent, searchStudentsForSelect } from "../../_actions/parent-actions";
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

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
  course_year: number | null;
}

interface Props {
  parents: Parent[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
}

export default function ParentsTable({ parents, total, page, pageSize, search: initialSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  // Student select state
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentFetching, setStudentFetching] = useState(false);
  const studentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(overrides: Record<string, string | number | null>) {
    const params = new URLSearchParams();
    const merged: Record<string, string> = {
      page: String(page),
      search: initialSearch,
      ...Object.fromEntries(
        Object.entries(overrides).map(([k, v]) => [k, v == null ? "" : String(v)])
      ),
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v); });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const fetchStudents = useCallback(async (query: string) => {
    setStudentFetching(true);
    const data = await searchStudentsForSelect(query);
    setStudentOptions(data);
    setStudentFetching(false);
  }, []);

  const handleStudentSearch = (val: string) => {
    if (studentDebounce.current) clearTimeout(studentDebounce.current);
    studentDebounce.current = setTimeout(() => fetchStudents(val), 300);
  };

  const openForm = async (parent?: Parent) => {
    // Pre-load first 20 students + existing children
    const initial = await searchStudentsForSelect("");
    setStudentOptions(initial);

    if (parent) {
      setEditing(parent);
      form.setFieldsValue({
        fullName: parent.full_name,
        email: parent.email,
        childrenIds: parent.children.map((c) => c.id),
      });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setFormOpen(true);
  };

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
      else { message.success("Родитель обновлён"); setFormOpen(false); navigate({ page: 1 }); }
    } else {
      const res = await createParent({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        childrenIds: values.childrenIds ?? [],
      });
      if (res.error) message.error(res.error);
      else { message.success("Родитель создан"); setFormOpen(false); navigate({ page: 1 }); }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteParent(id);
    if (res.error) message.error(res.error);
    else { message.success("Родитель удалён"); navigate({ page: 1 }); }
  };

  const handleResetPassword = async () => {
    const values = await resetForm.validateFields();
    if (!resetUserId) return;
    const res = await resetPassword(resetUserId, values.newPassword);
    if (res.error) message.error(res.error);
    else { message.success("Пароль сброшен"); setResetOpen(false); resetForm.resetFields(); }
  };

  const columns: ColumnsType<Parent> = [
    {
      title: "ФИО",
      dataIndex: "full_name",
      key: "full_name",
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
              <Tag key={c.id} color="blue" style={{ marginBottom: 2 }}>{c.name}</Tag>
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
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openForm(record)} />
          <Button type="text" size="small" icon={<KeyOutlined />} onClick={() => { setResetUserId(record.id); setResetOpen(true); }} />
          <Popconfirm title="Удалить родителя?" onConfirm={() => handleDelete(record.id)} okText="Удалить" cancelText="Отмена">
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
          Родители <span style={{ fontSize: 14, fontWeight: 400, color: "#8c8c8c" }}>({total})</span>
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
          Добавить
        </Button>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по имени или email..."
        allowClear
        value={searchVal}
        style={{ marginBottom: 16, maxWidth: 360 }}
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

      <Table
        dataSource={parents}
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

      {/* Create/Edit Modal */}
      <Modal
        forceRender={mounted}
        title={editing ? "Редактировать родителя" : "Новый родитель"}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={() => { setFormOpen(false); setEditing(null); form.resetFields(); }}
        confirmLoading={loading}
        okText={editing ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        width={600}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="fullName" label="ФИО" rules={[{ required: true, message: "Введите ФИО" }]}>
            <Input placeholder="Иванова Мария Петровна" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Введите email" }, { type: "email", message: "Некорректный email" }]}
          >
            <Input placeholder="parent@example.com" />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: "Введите пароль" }, { min: 6, message: "Минимум 6 символов" }]}
            >
              <Input.Password placeholder="Пароль" />
            </Form.Item>
          )}
          <Form.Item name="childrenIds" label="Дети (студенты)">
            <Select
              mode="multiple"
              placeholder="Начните вводить имя или email студента..."
              showSearch
              filterOption={false}
              loading={studentFetching}
              onSearch={handleStudentSearch}
              onFocus={() => { if (studentOptions.length === 0) fetchStudents(""); }}
              notFoundContent={studentFetching ? "Поиск..." : "Не найдено"}
              options={studentOptions.map((s) => ({
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
