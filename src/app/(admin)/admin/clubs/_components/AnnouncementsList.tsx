"use client";

import { useEffect, useState } from "react";
import { Tag, Typography, Spin, Empty, Card } from "antd";
import { getAnnouncementsForClub } from "../../_actions/club-actions";
import { formatDateTime } from "@/lib/utils";

export default function AnnouncementsList({ clubId }: { clubId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncementsForClub(clubId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [clubId]);

  if (loading) return <Spin size="small" />;
  if (items.length === 0) return <Empty description="Нет объявлений" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const signups = (item.event_signups as unknown[]) ?? [];
        return (
          <Card key={i} size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Typography.Text strong>{item.title as string}</Typography.Text>
            <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
              {formatDateTime(item.starts_at as string)}
              {item.venue ? <> · Место: {String(item.venue)}</> : null}
            </div>
            <Tag color="blue" style={{ marginTop: 4 }}>{signups.length} записей</Tag>
          </Card>
        );
      })}
    </div>
  );
}
