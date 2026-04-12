"use client";

import { useState } from "react";
import {
  Card,
  Descriptions,
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
  Progress,
  Tag,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { changeStudentPassword } from "../../_actions/student-actions";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  course_year: number | null;
  face_photo_url: string | null;
  created_at: string;
}

interface EngagementResult {
  score: number;
  segment: string;
  color: string;
  label: string;
}

interface Stats {
  avgGrade: number;
  gpa: number;
  attendancePct: number;
  signupCount: number;
  engagement: EngagementResult;
}

interface Props {
  profile: Profile;
  photoSignedUrl: string | null;
  stats: Stats;
}

function getRiskBadge(segment: string): { label: string; color: string } {
  if (segment === "at-risk") return { label: "Уровень риска: Высокий", color: "red" };
  if (segment === "declining") return { label: "Уровень риска: Средний", color: "orange" };
  return { label: "Уровень риска: Низкий", color: "green" };
}

function getProgressColor(value: number, thresholds: [number, number]): string {
  if (value >= thresholds[1]) return "#52c41a";
  if (value >= thresholds[0]) return "#faad14";
  return "#f5222d";
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

  const risk = getRiskBadge(stats.engagement.segment);

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

  const academicHealth = Math.round(
    stats.attendancePct * 0.4 + (stats.gpa / 4.0) * 100 * 0.4 + Math.min(stats.signupCount / 5, 1) * 100 * 0.2
  );

  return (
    <div>
      {/* Title row with risk badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Личный кабинет студента</Typography.Title>
        <Tag color={risk.color} style={{ fontSize: 13, padding: "4px 12px" }}>
          {risk.label}
        </Tag>
      </div>

      {/* Stats cards with progress bars */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Academic Health Score</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>
              {academicHealth}
            </div>
            <Progress
              percent={academicHealth}
              showInfo={false}
              strokeColor={getProgressColor(academicHealth, [50, 75])}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Средний балл (GPA)</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: getProgressColor(stats.gpa / 4.0 * 100, [50, 75]) }}>
              {stats.gpa.toFixed(1)}
            </div>
            <Progress
              percent={Math.round(stats.gpa / 4.0 * 100)}
              showInfo={false}
              strokeColor={getProgressColor(stats.gpa / 4.0 * 100, [50, 75])}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Цель: 4.0</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Посещаемость</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: getProgressColor(stats.attendancePct, [60, 80]) }}>
              {stats.attendancePct}%
            </div>
            <Progress
              percent={stats.attendancePct}
              showInfo={false}
              strokeColor={getProgressColor(stats.attendancePct, [60, 80])}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Вовлечённость</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: stats.engagement.color }}>
              {stats.engagement.score}%
            </div>
            <Progress
              percent={stats.engagement.score}
              showInfo={false}
              strokeColor={stats.engagement.color}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Социальная активность: {stats.signupCount} мероп.
            </Typography.Text>
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
            <Descriptions.Item label="Email">
              {profile.email}
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
