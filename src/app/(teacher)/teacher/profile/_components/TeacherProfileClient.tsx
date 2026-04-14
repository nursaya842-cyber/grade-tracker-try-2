"use client";
import { useClientMount } from "@/hooks/use-client-mount";

import React, { useState } from "react";
import {
  Card,
  Descriptions,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  App,
  Space,
} from "antd";
import { LockOutlined, FileTextOutlined } from "@ant-design/icons";
import { changePassword } from "../../_actions/teacher-actions";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  diploma_url: string | null;
  created_at: string;
}

interface Props {
  profile: Profile;
  diplomaSignedUrl: string | null;
}

export default function TeacherProfileClient({
  profile,
  diplomaSignedUrl,
}: Props) {
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
    const result = await changePassword(values.currentPassword, values.newPassword);
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
          <Descriptions.Item label="Registration Date">
            {formatDate(profile.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Diploma">
            {diplomaSignedUrl ? (
              <a href={diplomaSignedUrl} target="_blank" rel="noopener noreferrer">
                <Button icon={<FileTextOutlined />} size="small">
                  View Diploma
                </Button>
              </a>
            ) : (
              <Typography.Text type="secondary">Not uploaded</Typography.Text>
            )}
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
        onCancel={() => {
          setPwdOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Enter a new password" },
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
              { required: true, message: "Confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setPwdOpen(false); form.resetFields(); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Change
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
