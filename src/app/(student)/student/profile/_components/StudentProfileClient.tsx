"use client";

import { useClientMount } from "@/hooks/use-client-mount";
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
  Empty,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  AimOutlined,
} from "@ant-design/icons";
import { changeStudentPassword } from "../../_actions/student-actions";
import { formatDate } from "@/lib/utils";
import RecommendationCard from "@/components/recommendations/RecommendationCard";
import type { Recommendation } from "@/components/recommendations/RecommendationCard";

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
  recommendations: Recommendation[];
}

function getRiskBadge(segment: string): { label: string; color: string } {
  if (segment === "at-risk") return { label: "Risk Level: High", color: "red" };
  if (segment === "declining") return { label: "Risk Level: Medium", color: "orange" };
  return { label: "Risk Level: Low", color: "green" };
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
  recommendations,
}: Props) {
  const { message } = App.useApp();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const mounted = useClientMount();
  const [engagementBonus, setEngagementBonus] = useState(0);

  const engagementScore = Math.min(100, stats.engagement.score + engagementBonus);
  const engagementColor = engagementScore >= 80 ? "#52c41a" : engagementScore >= 60 ? "#1677ff" : engagementScore >= 40 ? "#faad14" : "#f5222d";
  const engagementSegment = engagementScore >= 80 ? "excellent" : engagementScore >= 60 ? "stable" : engagementScore >= 40 ? "declining" : "at-risk";
  const risk = getRiskBadge(engagementSegment);

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
      message.success("Password changed successfully");
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
        <Typography.Title level={4} style={{ margin: 0 }}>Student Dashboard</Typography.Title>
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
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Average GPA</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: getProgressColor(stats.gpa / 4.0 * 100, [50, 75]) }}>
              {stats.gpa.toFixed(1)}
            </div>
            <Progress
              percent={Math.round(stats.gpa / 4.0 * 100)}
              showInfo={false}
              strokeColor={getProgressColor(stats.gpa / 4.0 * 100, [50, 75])}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Target: 4.0</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Attendance</Typography.Text>
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
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Engagement</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: engagementColor }}>
              {engagementScore}%
            </div>
            <Progress
              percent={engagementScore}
              showInfo={false}
              strokeColor={engagementColor}
              style={{ marginTop: 8, marginBottom: 0 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Social activity: {stats.signupCount} events
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      {/* Recommendations section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Space align="center">
            <AimOutlined style={{ fontSize: 18, color: "#1677ff" }} />
            <Typography.Title level={5} style={{ margin: 0 }}>
              Personal Recommendations (Next Best Action)
            </Typography.Title>
          </Space>
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 2 }}>
            Based on your data analysis and CVM principles
          </Typography.Text>
        </div>
        {recommendations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No active recommendations — everything looks good!"
            style={{ padding: "24px 0" }}
          />
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onAccept={() => setEngagementBonus((b) => b + 1)}
            />
          ))
        )}
      </div>

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
            <Descriptions.Item label="Full Name">
              {profile.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {profile.email}
            </Descriptions.Item>
            <Descriptions.Item label="Year">
              {profile.course_year ? `Year ${profile.course_year}` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Registration Date">
              {formatDate(profile.created_at)}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Space>
          <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
            Change Password
          </Button>
        </Space>
      </Card>

      {/* Change password modal */}
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
              { required: true, message: "Enter your new password" },
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
              <Button
                onClick={() => {
                  setPwdOpen(false);
                  form.resetFields();
                }}
              >
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
