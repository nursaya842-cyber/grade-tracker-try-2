"use client";

import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, App } from "antd";
import { useClientMount } from "@/hooks/use-client-mount";
import { createDean, updateDean } from "../../_actions/dean-actions";

interface Faculty {
  id: string;
  name: string;
}

interface Dean {
  id: string;
  email: string;
  full_name: string;
  faculty_id: string | null;
}

interface Props {
  open: boolean;
  dean: Dean | null;
  faculties: Faculty[];
  onClose: () => void;
}

export default function DeanFormModal({ open, dean, faculties, onClose }: Props) {
  const [form] = Form.useForm();
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const isEditing = !!dean;

  useEffect(() => {
    if (open) {
      if (dean) {
        form.setFieldsValue({
          fullName: dean.full_name,
          email: dean.email,
          facultyId: dean.faculty_id,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, dean, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    if (isEditing) {
      const res = await updateDean(dean.id, {
        fullName: values.fullName,
        email: values.email,
        facultyId: values.facultyId,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Dean updated");
        onClose();
      }
    } else {
      const res = await createDean({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        facultyId: values.facultyId,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Dean created");
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <Modal
      forceRender={mounted}
      title={isEditing ? "Edit Dean" : "New Dean"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={isEditing ? "Save" : "Create"}
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[{ required: true, message: "Enter full name" }]}
        >
          <Input placeholder="John Smith" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter email" },
            { type: "email", message: "Invalid email" },
          ]}
        >
          <Input placeholder="dean@university.kz" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Enter password" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
        )}

        <Form.Item
          name="facultyId"
          label="Faculty"
          rules={[{ required: true, message: "Select a faculty" }]}
        >
          <Select
            placeholder="Select faculty"
            options={faculties.map((f) => ({ value: f.id, label: f.name }))}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
