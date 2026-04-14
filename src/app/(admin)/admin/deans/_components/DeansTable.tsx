"use client";

import { useState } from "react";
import {
  Table, Button, Input, Typography, Space, Popconfirm, App, Modal, Form, Tag,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/utils";
import { deleteDean, resetDeanPassword } from "../../_actions/dean-actions";
import DeanFormModal from "./DeanFormModal";
import { useClientMount } from "@/hooks/use-client-mount";

interface Faculty {
  id: string;
  name: string;
}

interface Dean {
  id: string;
  email: string;
  full_name: string;
  faculty_id: string | null;
  faculty_name: string | null;
  created_at: string;
}

interface Props {
  deans: Dean[];
  faculties: Faculty[];
}

export default function DeansTable({ deans, faculties }: Props) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDean, setEditingDean] = useState<Dean | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetForm] = Form.useForm();
  const { message } = App.useApp();
  const mounted = useClientMount();

  const filtered = deans.filter(
    (d) =>
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const res = await deleteDean(id);
    if (res.error) message.error(res.error);
    else message.success("Dean deleted");
  };

  const handleResetPassword = async () => {
    const values = await resetForm.validateFields();
    if (!resetUserId) return;
    const res = await resetDeanPassword(resetUserId, values.newPassword);
    if (res.error) message.error(res.error);
    else {
      message.success("Password reset");
      setResetOpen(false);
      resetForm.resetFields();
    }
  };

  const columns: ColumnsType<Dean> = [
    {
      title: "Name",
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
      title: "Faculty",
      dataIndex: "faculty_name",
      key: "faculty_name",
      render: (v: string | null) =>
        v ? <Tag color="purple">{v}</Tag> : <span style={{ color: "#999" }}>—</span>,
      sorter: (a, b) => (a.faculty_name ?? "").localeCompare(b.faculty_name ?? ""),
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
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDean(record);
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
            title="Delete dean?"
            description="The dean account will be deactivated."
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
          Deans
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingDean(null);
            setFormOpen(true);
          }}
        >
          Add
        </Button>
      </div>

      <Input.Search
        placeholder="Search by name or email..."
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

      <DeanFormModal
        open={formOpen}
        dean={editingDean}
        faculties={faculties}
        onClose={() => {
          setFormOpen(false);
          setEditingDean(null);
        }}
      />

      <Modal
        forceRender={mounted}
        title="Reset password"
        open={resetOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetOpen(false);
          resetForm.resetFields();
        }}
        okText="Reset"
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: "Enter password" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password placeholder="New password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
