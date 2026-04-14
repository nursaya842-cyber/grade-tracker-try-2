"use client";

import { useState } from "react";
import { Card, Tag, Button, App, Typography, Space } from "antd";
import {
  ExclamationCircleFilled,
  WarningFilled,
  CheckCircleFilled,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { acceptRecommendation, dismissRecommendation } from "./recommendation-actions";

export interface Recommendation {
  id: string;
  rule_id: string;
  category: "academic" | "social" | "admin";
  next_action: string;
  priority_score: number;
  title: string | null;
  action: string | null;
  expected_effect: string | null;
  deadline: string | null;
}

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  academic: { color: "blue", label: "Academic" },
  social: { color: "green", label: "Social" },
  admin: { color: "orange", label: "Administrative" },
};

function getPriorityConfig(score: number): {
  color: string;
  icon: React.ReactNode;
  label: string;
  tagColor: string;
} {
  if (score > 0.7) {
    return {
      color: "#f5222d",
      icon: <ExclamationCircleFilled style={{ color: "#f5222d", fontSize: 18 }} />,
      label: "High Priority",
      tagColor: "red",
    };
  }
  if (score > 0.4) {
    return {
      color: "#faad14",
      icon: <WarningFilled style={{ color: "#faad14", fontSize: 18 }} />,
      label: "Medium Priority",
      tagColor: "orange",
    };
  }
  return {
    color: "#52c41a",
    icon: <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} />,
    label: "Low Priority",
    tagColor: "green",
  };
}

function boldMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export default function RecommendationCard({
  rec,
  onAccept,
}: {
  rec: Recommendation;
  onAccept?: () => void;
}) {
  const { message } = App.useApp();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const cat = CATEGORY_CONFIG[rec.category] ?? CATEGORY_CONFIG.academic;
  const priority = getPriorityConfig(rec.priority_score);

  const title = rec.title ?? rec.next_action.split(".")[0].replace(/\*\*/g, "");

  const handleAccept = async () => {
    setLoading(true);
    const result = await acceptRecommendation(rec.id);
    setLoading(false);
    if (result.error) {
      message.error(result.error);
    } else {
      setDismissed(true);
      onAccept?.();
    }
  };

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
      style={{ borderLeft: `4px solid ${priority.color}`, marginBottom: 8 }}
      styles={{ body: { padding: "12px 16px" } }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <Space size={8} align="start" style={{ flex: 1, flexWrap: "wrap" }}>
          {priority.icon}
          <Typography.Text strong style={{ fontSize: 14 }}>
            {title}
          </Typography.Text>
          <Tag color={cat.color} style={{ margin: 0 }}>{cat.label}</Tag>
          <Tag color={priority.tagColor} style={{ margin: 0 }}>{priority.label}</Tag>
        </Space>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={handleAccept}
          loading={loading}
          style={{ flexShrink: 0 }}
        >
          Accept
        </Button>
      </div>

      {/* Description */}
      <div
        style={{ fontSize: 13, color: "#595959", marginTop: 8, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: boldMarkdown(rec.next_action) }}
      />

      {/* Action */}
      {rec.action && (
        <div style={{ marginTop: 6, fontSize: 13 }}>
          <Typography.Text type="secondary">Action: </Typography.Text>
          <Typography.Text>{rec.action}</Typography.Text>
        </div>
      )}

      {/* Expected effect + deadline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 4 }}>
        {rec.expected_effect && (
          <Typography.Text style={{ fontSize: 12, color: "#52c41a" }}>
            Expected Effect: {rec.expected_effect}
          </Typography.Text>
        )}
        {rec.deadline && (
          <Space size={4}>
            <ClockCircleOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
            <Typography.Text style={{ fontSize: 12, color: "#8c8c8c" }}>
              Deadline: {new Date(rec.deadline).toLocaleDateString("en-US")}
            </Typography.Text>
          </Space>
        )}
      </div>
    </Card>
  );
}
