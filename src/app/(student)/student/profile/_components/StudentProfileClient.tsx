"use client";

import { useState } from "react";
import {
  Card,
  Descriptions,
  Statistic,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Avatar,
  App,
  Space,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { changeStudentPassword } from "../../_actions/student-actions";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  course_year: number | null;
  face_photo_url: string | null;
  created_at: string;
}

interface Stats {
  avgGrade: number;
  attendancePct: number;
  signupCount: number;
}

interface Props {
  profile: Profile;
  photoSignedUrl: string | null;
  stats: Stats;
}

export default function StudentProfileClient({
  profile,
  photoSignedUrl,
  stats,
}: Props) {
  const { message } = App.useApp();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setLoading(true);
    const result = await changeStudentPassword(
      values.currentPassword,
      values.newPassword
    );
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

      {/* Mini-stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Средняя оценка"
              value={stats.avgGrade}
              prefix={<TrophyOutlined />}
              precision={1}
              valueStyle={{
                color: stats.avgGrade >= 70 ? "#52c41a" : stats.avgGrade >= 50 ? "#faad14" : "#f5222d",
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Посещаемость"
              value={stats.attendancePct}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: stats.attendancePct >= 70 ? "#52c41a" : "#f5222d",
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Мероприятий"
              value={stats.signupCount}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Profile card */}
      <Card style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <Avatar
            size={80}
            src={photoSignedUrl}
            icon={!photoSignedUrl ? <UserOutlined /> : undefined}
            style={{ flexShrink: 0 }}
          />
          <Descriptions column={1} bordered size="small" style={{ flex: 1 }}>
            <Descriptions.Item label="ФИО">
              {profile.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон">
              {profile.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Курс">
              {profile.course_year ? `${profile.course_year} курс` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Дата регистрации">
              {formatDate(profile.created_at)}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Space>
          <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
            Сменить пароль
          </Button>
        </Space>
      </Card>

      {/* Change password modal */}
      <Modal
        title="Смена пароля"
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
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Пароли не совпадают"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setPwdOpen(false);
                  form.resetFields();
                }}
              >
                Отмена
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Сменить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
