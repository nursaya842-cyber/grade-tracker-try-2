"use client";

import { useClientMount } from "@/hooks/use-client-mount";
import { useState } from "react";
import {
  Card, Descriptions, Button, Modal, Form, Input, Typography, App, Space,
} from "antd";
import { LockOutlined } from "@ant-design/icons";
import { changeParentPassword } from "../../_actions/parent-actions";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function ParentProfileClient({ profile }: { profile: Profile }) {
  const { message } = App.useApp();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const mounted = useClientMount();

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setLoading(true);
    const result = await changeParentPassword(values.currentPassword, values.newPassword);
    setLoading(false);

    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Password changed successfully");
      setPwdOpen(false);
      form.resetFields();
    }
  };

  return (
    <div>
      <Typography.Title level={4}>Profile</Typography.Title>

      <Card style={{ maxWidth: 600 }}>
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="Full Name">{profile.full_name}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
          <Descriptions.Item label="Role">Parent</Descriptions.Item>
          <Descriptions.Item label="Registration Date">
            {formatDate(profile.created_at)}
          </Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 16 }}>
          <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
            Change Password
          </Button>
        </Space>
      </Card>

      <Modal
        forceRender={mounted}
        title="Change Password"
        open={pwdOpen}
        onCancel={() => { setPwdOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: "Please enter your current password" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter your new password" },
              { min: 8, message: "Minimum 8 characters" },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setPwdOpen(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>Change</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
