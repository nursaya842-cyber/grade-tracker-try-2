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
        message.success("Faculty updated");
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
      }
    } else {
      const res = await createFaculty(values.name);
      if (res.error) message.error(res.error);
      else {
        message.success("Faculty created");
        setModalOpen(false);
        form.resetFields();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteFaculty(id);
    if (res.error) message.error(res.error);
    else message.success("Faculty deleted");
  };

  const columns: ColumnsType<Faculty> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Students",
      dataIndex: "studentCount",
      key: "studentCount",
      width: 120,
      render: (v: number) => <Tag color={v > 0 ? "blue" : "default"}>{v}</Tag>,
      sorter: (a, b) => a.studentCount - b.studentCount,
    },
    {
      title: "Created at",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
      responsive: ["lg"] as const,
    },
    {
      title: "Actions",
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
            title="Delete faculty?"
            description="Students will be unlinked from the faculty."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
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
          Faculties
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
          Add
        </Button>
      </div>

      <Input.Search
        placeholder="Search by name..."
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
        title={editing ? "Edit faculty" : "New faculty"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={editing ? "Save" : "Create"}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="name"
            label="Faculty name"
            rules={[{ required: true, message: "Enter name" }]}
          >
            <Input placeholder="Faculty of Information Technology" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
