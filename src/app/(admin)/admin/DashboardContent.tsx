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
  admin: { color: "red", label: "Админ" },
  teacher: { color: "blue", label: "Преподаватель" },
  student: { color: "green", label: "Студент" },
};

export default function DashboardContent({ stats, recentUsers }: DashboardProps) {
  const router = useRouter();

  const statCards = [
    {
      title: "Студенты",
      value: stats.students,
      icon: <UserOutlined style={{ fontSize: 24, color: "#1677ff" }} />,
      color: "#e6f4ff",
      link: "/admin/students",
    },
    {
      title: "Преподаватели",
      value: stats.teachers,
      icon: <TeamOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
      link: "/admin/teachers",
    },
    {
      title: "Уроков на этой неделе",
      value: stats.lessonsThisWeek,
      icon: <CalendarOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      color: "#f9f0ff",
      link: "/admin/schedule",
    },
    {
      title: "Несданные отчёты",
      value: stats.pendingReports,
      icon: <FileExclamationOutlined style={{ fontSize: 24, color: "#fa8c16" }} />,
      color: "#fff7e6",
      link: "/admin/risk-dashboard",
    },
  ];

  const columns = [
    {
      title: "Имя",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Роль",
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        const tag = roleTagMap[role] ?? { color: "default", label: role };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>
        Главная
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
            title="Последние пользователи"
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
          <Card title="Быстрый доступ" style={{ borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Преподаватели", link: "/admin/teachers" },
                { label: "Студенты", link: "/admin/students" },
                { label: "Расписание", link: "/admin/schedule" },
                { label: "Клубы", link: "/admin/clubs" },
                { label: "Аналитика", link: "/admin/analytics" },
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
