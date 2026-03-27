"use client";

import { useState } from "react";
import { Card, Tag, Button, App } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { dismissRecommendation } from "./recommendation-actions";

interface Recommendation {
  id: string;
  rule_id: string;
  category: "academic" | "social" | "admin";
  next_action: string;
  priority_score: number;
}

const CATEGORY_CONFIG = {
  academic: { color: "blue", label: "Академик" },
  social: { color: "green", label: "Социальное" },
  admin: { color: "orange", label: "Административное" },
};

function getPriorityColor(score: number): string {
  if (score > 0.7) return "#f5222d";
  if (score > 0.4) return "#faad14";
  return "#52c41a";
}

export default function RecommendationCard({
  rec,
}: {
  rec: Recommendation;
}) {
  const { message } = App.useApp();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const cat = CATEGORY_CONFIG[rec.category];
  const borderColor = getPriorityColor(rec.priority_score);

  const handleDismiss = async () => {
    setLoading(true);
    const result = await dismissRecommendation(rec.id);
    setLoading(false);
    if (result.error) {
      message.error(result.error);
    } else {
      setDismissed(true);
    }
  };

  return (
    <Card
      size="small"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        marginBottom: 8,
      }}
      styles={{ body: { padding: "8px 12px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Tag color={cat.color} style={{ marginBottom: 4 }}>
            {cat.label}
          </Tag>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>{rec.next_action}</div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleDismiss}
          loading={loading}
          style={{ marginLeft: 8, flexShrink: 0 }}
        />
      </div>
    </Card>
  );
}
