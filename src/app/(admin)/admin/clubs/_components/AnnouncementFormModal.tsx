"use client";

import React, { useState } from "react";
import { Modal, Form, Input, DatePicker, TimePicker, Upload, Button, App } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { createAnnouncement } from "../../_actions/club-actions";
import { createClient } from "@/lib/supabase/client";
import dayjs from "dayjs";

interface Props {
  clubId: string | null;
  onClose: () => void;
}

export default function AnnouncementFormModal({ clubId, onClose }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { message } = App.useApp();

  const handlePhotoUpload = async (file: File) => {
    const supabase = createClient();
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("club-photos").upload(path, file);
    if (error) { message.error("Ошибка загрузки"); return false; }
    const { data } = supabase.storage.from("club-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    message.success("Фото загружено");
    return false;
  };

  const handleSubmit = async () => {
    if (!clubId) return;
    const values = await form.validateFields();
    setLoading(true);

    const date = values.date as dayjs.Dayjs;
    const [startTime, endTime] = values.timeRange as [dayjs.Dayjs, dayjs.Dayjs];

    const startsAt = date.hour(startTime.hour()).minute(startTime.minute()).toISOString();
    const endsAt = date.hour(endTime.hour()).minute(endTime.minute()).toISOString();

    const res = await createAnnouncement({
      clubId,
      title: values.title,
      description: values.description,
      photoUrl: photoUrl ?? undefined,
      venue: values.venue,
      startsAt,
      endsAt,
    });

    setLoading(false);
    if (res.error) message.error(res.error);
    else {
      message.success("Объявление создано");
      form.resetFields();
      setPhotoUrl(null);
      onClose();
    }
  };

  return (
    <Modal
      title="Новое объявление"
      open={!!clubId}
      onOk={handleSubmit}
      onCancel={() => { form.resetFields(); setPhotoUrl(null); onClose(); }}
      confirmLoading={loading}
      okText="Создать"
      cancelText="Отмена"
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="title" label="Название" rules={[{ required: true, message: "Введите название" }]}>
          <Input placeholder="Турнир по шахматам" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Описание мероприятия..." />
        </Form.Item>
        <Form.Item name="date" label="Дата" rules={[{ required: true, message: "Укажите дату" }]}>
          <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="timeRange" label="Время" rules={[{ required: true, message: "Укажите время" }]}>
          <TimePicker.RangePicker format="HH:mm" minuteStep={30} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="venue" label="Место">
          <Input placeholder="Аудитория 305" />
        </Form.Item>
        <Form.Item label="Фото">
          <Upload
            accept=".jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handlePhotoUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>{photoUrl ? "Заменить" : "Загрузить"}</Button>
          </Upload>
          {photoUrl && <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>Загружено</span>}
        </Form.Item>
      </Form>
    </Modal>
  );
}
