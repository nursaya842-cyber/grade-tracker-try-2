"use client";

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
      message.success("Пароль успешно изменён");
      setPwdOpen(false);
      form.resetFields();
    }
  };

  return (
    <div>
      <Typography.Title level={4}>Профиль</Typography.Title>

      <Card style={{ maxWidth: 600 }}>
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="ФИО">{profile.full_name}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
          <Descriptions.Item label="Роль">Родитель</Descriptions.Item>
          <Descriptions.Item label="Дата регистрации">
            {formatDate(profile.created_at)}
          </Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 16 }}>
          <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
            Сменить пароль
          </Button>
        </Space>
      </Card>

      <Modal
        title="Смена пароля"
        open={pwdOpen}
        onCancel={() => { setPwdOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Текущий пароль"
            rules={[{ required: true, message: "Введите текущий пароль" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: "Введите новый пароль" },
              { min: 8, message: "Минимум 8 символов" },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Подтверждение пароля"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Подтвердите пароль" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                  return Promise.reject(new Error("Пароли не совпадают"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setPwdOpen(false); form.resetFields(); }}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={loading}>Сменить</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
