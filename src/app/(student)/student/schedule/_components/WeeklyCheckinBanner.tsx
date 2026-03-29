"use client";

import { useState } from "react";
import { Card, Button, Modal, Slider, Input, Typography, Space, App, Row, Col } from "antd";
import { FormOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { submitCheckin } from "../../_actions/checkin-actions";

interface Props {
  hasCheckin: boolean;
}

const questions = [
  { key: "stressLevel", label: "Уровень стресса", low: "Нет стресса", high: "Сильный стресс" },
  { key: "motivationLevel", label: "Мотивация к учёбе", low: "Нет мотивации", high: "Высокая" },
  { key: "workloadFeeling", label: "Ощущение нагрузки", low: "Лёгкая", high: "Перегруз" },
  { key: "understanding", label: "Понимание материала", low: "Не понимаю", high: "Всё понятно" },
  { key: "satisfaction", label: "Удовлетворённость обучением", low: "Не доволен", high: "Доволен" },
];

export default function WeeklyCheckinBanner({ hasCheckin }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({
    stressLevel: 5,
    motivationLevel: 5,
    workloadFeeling: 5,
    understanding: 5,
    satisfaction: 5,
  });
  const [notes, setNotes] = useState("");
  const { message } = App.useApp();

  if (hasCheckin) return null;

  const handleSubmit = async () => {
    setLoading(true);
    const res = await submitCheckin({
      stressLevel: values.stressLevel,
      motivationLevel: values.motivationLevel,
      workloadFeeling: values.workloadFeeling,
      understanding: values.understanding,
      satisfaction: values.satisfaction,
      notes: notes || undefined,
    });
    setLoading(false);

    if (res.error) {
      message.error(res.error);
    } else {
      message.success("Спасибо за ответы!");
      setOpen(false);
    }
  };

  return (
    <>
      <Card
        style={{
          marginBottom: 16,
          borderLeft: "4px solid #722ed1",
          background: "#f9f0ff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Space>
            <FormOutlined style={{ fontSize: 20, color: "#722ed1" }} />
            <div>
              <Typography.Text strong>Еженедельный опрос</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Расскажите как прошла ваша неделя — это займёт 1 минуту
              </Typography.Text>
            </div>
          </Space>
          <Button type="primary" onClick={() => setOpen(true)} style={{ background: "#722ed1", borderColor: "#722ed1" }}>
            Пройти опрос
          </Button>
        </div>
      </Card>

      <Modal
        title="Еженедельный Check-in"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        confirmLoading={loading}
        okText="Отправить"
        cancelText="Позже"
        width={560}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
          Оцените от 1 до 10, где 1 — минимум, 10 — максимум
        </Typography.Paragraph>

        {questions.map((q) => (
          <div key={q.key} style={{ marginBottom: 20 }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
              {q.label}
            </Typography.Text>
            <Row align="middle" gutter={8}>
              <Col flex="80px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.low}</Typography.Text>
              </Col>
              <Col flex="auto">
                <Slider
                  min={1}
                  max={10}
                  value={values[q.key]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
                  marks={{ 1: "1", 5: "5", 10: "10" }}
                />
              </Col>
              <Col flex="80px" style={{ textAlign: "right" }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.high}</Typography.Text>
              </Col>
            </Row>
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            Комментарий (необязательно)
          </Typography.Text>
          <Input.TextArea
            rows={2}
            placeholder="Что-то хотите добавить?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
