"use client";

import React, { useEffect, useState } from "react";
import { Modal, Empty, Spin } from "antd";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getStudentSocialActivity } from "../../_actions/student-actions";

interface Props {
  studentId: string | null;
  onClose: () => void;
}

interface ChartPoint {
  month: string;
  count: number;
}

export default function StudentSocialModal({ studentId, onClose }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      getStudentSocialActivity(studentId).then((res) => {
        const signups = res.data ?? [];

        // Group by month
        const grouped: Record<string, number> = {};
        for (const row of signups) {
          const d = new Date(row.signed_up_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          grouped[key] = (grouped[key] ?? 0) + 1;
        }

        const points: ChartPoint[] = Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count }));

        setData(points);
        setLoading(false);
      });
    }
  }, [studentId]);

  return (
    <Modal
      title="Социальная активность"
      open={!!studentId}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      {loading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : data.length === 0 ? (
        <Empty description="Нет записей на мероприятия" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#722ed1"
              strokeWidth={2}
              name="Записи"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Modal>
  );
}
