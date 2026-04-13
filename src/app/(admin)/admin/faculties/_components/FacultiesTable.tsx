"use client";

import { useClientMount } from "@/hooks/use-client-mount";
import { useState } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Modal, Form, Tag,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { createFaculty, updateFaculty, deleteFaculty } from "../../_actions/faculty-actions";
import { formatDateTime } from "@/lib/utils";

interface Faculty {
  id: string;
  name: string;
  created_at: string;
  studentCount: number;
}

export default function FacultiesTable({ faculties }: { faculties: Faculty[] }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form] = Form.useForm();
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const filtered = faculties.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    if (editing) {
      const res = await updateFaculty(editing.id, values.name);
      if (res.error) message.error(res.error);
      else {
        message.success("Факультет обновлён");
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
      }
    } else {
      const res = await createFaculty(values.name);
      if (res.error) message.error(res.error);
      else {
        message.success("Факультет создан");
        setModalOpen(false);
        form.resetFields();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteFaculty(id);
    if (res.error) message.error(res.error);
    else message.success("Факультет удалён");
  };

  const columns: ColumnsType<Faculty> = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Студентов",
      dataIndex: "studentCount",
      key: "studentCount",
      width: 120,
      render: (v: number) => <Tag color={v > 0 ? "blue" : "default"}>{v}</Tag>,
      sorter: (a, b) => a.studentCount - b.studentCount,
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
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              form.setFieldsValue({ name: record.name });
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title="Удалить факультет?"
            description="Студенты будут отвязаны от факультета."
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
          Факультеты
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Добавить
        </Button>
      </div>

      <Input.Search
        placeholder="Поиск по названию..."
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

      <Modal
        forceRender={mounted}
        title={editing ? "Редактировать факультет" : "Новый факультет"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={editing ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="name"
            label="Название факультета"
            rules={[{ required: true, message: "Введите название" }]}
          >
            <Input placeholder="Факультет информационных технологий" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
