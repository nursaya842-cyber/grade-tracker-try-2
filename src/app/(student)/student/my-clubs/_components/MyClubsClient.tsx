"use client";

import { Typography, Card, Row, Col, Badge, Empty } from "antd";
import { TeamOutlined, CrownOutlined } from "@ant-design/icons";

interface Club {
  id: string;
  name: string;
  headName: string;
  memberCount: number;
}

export default function MyClubsClient({ clubs }: { clubs: Club[] }) {
  if (clubs.length === 0) {
    return (
      <div>
        <Typography.Title level={4}>My Clubs</Typography.Title>
        <Empty description="You are not a member of any club" />
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={4}>My Clubs</Typography.Title>
      <Row gutter={[16, 16]}>
        {clubs.map((club) => (
          <Col xs={24} sm={12} lg={8} key={club.id}>
            <Badge.Ribbon text={`${club.memberCount} members`} color="blue">
              <Card hoverable>
                <Card.Meta
                  avatar={<TeamOutlined style={{ fontSize: 24, color: "#1677ff" }} />}
                  title={club.name}
                  description={
                    <span>
                      <CrownOutlined style={{ marginRight: 4, color: "#faad14" }} />
                      Head: {club.headName}
                    </span>
                  }
                />
              </Card>
            </Badge.Ribbon>
          </Col>
        ))}
      </Row>
    </div>
  );
}
