"use client";
import { useClientMount } from "@/hooks/use-client-mount";

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
  const mounted = useClientMount();
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
      message.error(res.error.includes("unique") ? "A subject with this name already exists" : res.error);
    } else {
      message.success(editing ? "Subject updated" : "Subject created");
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteSubject(id);
    if (res.error) message.error(res.error);
    else message.success("Subject deleted");
  };

  const columns: ColumnsType<Subject> = [
    { title: "Name", dataIndex: "name", key: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: "Actions", key: "actions", width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete subject?" onConfirm={() => handleDelete(record.id)} okText="Delete" cancelText="Cancel">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Subjects</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add</Button>
      </div>
      <Table dataSource={subjects} columns={columns} rowKey="id" pagination={{ pageSize: 20 }} size="middle" />
      <Modal
        forceRender={mounted}
        title={editing ? "Edit Subject" : "New Subject"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText={editing ? "Save" : "Create"}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter name" }]}>
            <Input placeholder="Mathematics" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
