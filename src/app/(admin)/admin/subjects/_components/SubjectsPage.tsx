"use client";

import React, { useState } from "react";
import { Table, Button, Typography, Popconfirm, App, Modal, Form, Input, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { createSubject, updateSubject, deleteSubject } from "../../_actions/subject-actions";

interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export default function SubjectsPage({ subjects }: { subjects: Subject[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    form.setFieldsValue({ name: s.name });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    const res = editing
      ? await updateSubject(editing.id, values.name)
      : await createSubject(values.name);
    setLoading(false);
    if (res.error) {
      message.error(res.error.includes("unique") ? "Предмет с таким названием уже существует" : res.error);
    } else {
      message.success(editing ? "Предмет обновлён" : "Предмет создан");
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteSubject(id);
    if (res.error) message.error(res.error);
    else message.success("Предмет удалён");
  };

  const columns: ColumnsType<Subject> = [
    { title: "Название", dataIndex: "name", key: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: "Действия", key: "actions", width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить предмет?" onConfirm={() => handleDelete(record.id)} okText="Удалить" cancelText="Отмена">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Предметы</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить</Button>
      </div>
      <Table dataSource={subjects} columns={columns} rowKey="id" pagination={{ pageSize: 20 }} size="middle" />
      <Modal
        title={editing ? "Редактировать предмет" : "Новый предмет"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText={editing ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Математика" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
