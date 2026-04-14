"use client";

import React from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Button } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileExclamationOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

const { Title } = Typography;

interface DashboardProps {
  stats: {
    students: number;
    teachers: number;
    lessonsThisWeek: number;
    pendingReports: number;
  };
  recentUsers: {
    id: string;
    full_name: string;
    role: string;
    email: string;
    created_at: string;
  }[];
}

const roleTagMap: Record<string, { color: string; label: string }> = {
  admin: { color: "red", label: "Admin" },
  teacher: { color: "blue", label: "Teacher" },
  student: { color: "green", label: "Student" },
};

export default function DashboardContent({ stats, recentUsers }: DashboardProps) {
  const router = useRouter();

  const statCards = [
    {
      title: "Students",
      value: stats.students,
      icon: <UserOutlined style={{ fontSize: 24, color: "#1677ff" }} />,
      color: "#e6f4ff",
      link: "/admin/students",
    },
    {
      title: "Teachers",
      value: stats.teachers,
      icon: <TeamOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
      link: "/admin/teachers",
    },
    {
      title: "Lessons This Week",
      value: stats.lessonsThisWeek,
      icon: <CalendarOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      color: "#f9f0ff",
      link: "/admin/schedule",
    },
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      icon: <FileExclamationOutlined style={{ fontSize: 24, color: "#fa8c16" }} />,
      color: "#fff7e6",
      link: "/admin/risk-dashboard",
    },
  ];

  const columns = [
    {
      title: "Name",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        const tag = roleTagMap[role] ?? { color: "default", label: role };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>
        Dashboard
      </Title>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card
              hoverable
              onClick={() => router.push(card.link)}
              style={{ borderRadius: 12 }}
              styles={{ body: { padding: "20px 24px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Statistic title={card.title} value={card.value} />
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Recent Users"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={recentUsers}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Quick Access" style={{ borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Teachers", link: "/admin/teachers" },
                { label: "Students", link: "/admin/students" },
                { label: "Schedule", link: "/admin/schedule" },
                { label: "Clubs", link: "/admin/clubs" },
                { label: "Analytics", link: "/admin/analytics" },
              ].map((item) => (
                <Button
                  key={item.link}
                  type="text"
                  block
                  onClick={() => router.push(item.link)}
                  style={{ textAlign: "left", justifyContent: "space-between", display: "flex" }}
                >
                  {item.label}
                  <ArrowRightOutlined />
                </Button>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
