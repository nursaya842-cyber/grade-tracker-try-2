"use client";

import { Card, Row, Col, Typography, Statistic, Avatar, Button } from "antd";
import {
  UserOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface Child {
  id: string;
  full_name: string;
  email: string;
  course_year: number | null;
  gpa: number;
  attendancePct: number;
}

export default function ChildrenList({ children }: { children: Child[] }) {
  const router = useRouter();

  if (children.length === 0) {
    return (
      <div>
        <Typography.Title level={4}>Мои дети</Typography.Title>
        <Card>
          <Typography.Text type="secondary">
            Нет привязанных студентов. Обратитесь к администратору.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        Мои дети
      </Typography.Title>

      <Row gutter={[16, 16]}>
        {children.map((child) => (
          <Col xs={24} md={12} lg={8} key={child.id}>
            <Card
              hoverable
              onClick={() => router.push(`/parent/children/${child.id}`)}
              style={{ borderRadius: 12 }}
            >
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <Avatar
                  size={56}
                  icon={<UserOutlined />}
                  style={{ background: "#722ed1", flexShrink: 0 }}
                />
                <div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {child.full_name}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {child.email}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {child.course_year ? `${child.course_year} курс` : ""}
                  </Typography.Text>
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="GPA"
                    value={child.gpa}
                    precision={2}
                    prefix={<TrophyOutlined />}
                    suffix="/ 4.0"
                    styles={{
                      content: {
                        fontSize: 18,
                        color: child.gpa >= 3.0 ? "#52c41a" : child.gpa >= 2.0 ? "#faad14" : "#f5222d",
                      },
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Посещаемость"
                    value={child.attendancePct}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                    styles={{
                      content: {
                        fontSize: 18,
                        color: child.attendancePct >= 70 ? "#52c41a" : "#f5222d",
                      },
                    }}
                  />
                </Col>
              </Row>

              <Button
                type="link"
                style={{ padding: 0, marginTop: 12 }}
                icon={<ArrowRightOutlined />}
              >
                Подробнее
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
