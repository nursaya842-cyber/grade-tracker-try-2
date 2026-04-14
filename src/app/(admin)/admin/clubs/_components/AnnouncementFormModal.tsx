"use client";
import { useClientMount } from "@/hooks/use-client-mount";

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
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { message } = App.useApp();

  const handlePhotoUpload = async (file: File) => {
    const supabase = createClient();
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("club-photos").upload(path, file);
    if (error) { message.error("Upload failed"); return false; }
    const { data } = supabase.storage.from("club-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    message.success("Photo uploaded");
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
      message.success("Announcement created");
      form.resetFields();
      setPhotoUrl(null);
      onClose();
    }
  };

  return (
    <Modal
        forceRender={mounted}
      title="New Announcement"
      open={!!clubId}
      onOk={handleSubmit}
      onCancel={() => { form.resetFields(); setPhotoUrl(null); onClose(); }}
      confirmLoading={loading}
      okText="Create"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Enter title" }]}>
          <Input placeholder="Chess Tournament" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Event description..." />
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true, message: "Select date" }]}>
          <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="timeRange" label="Time" rules={[{ required: true, message: "Select time" }]}>
          <TimePicker.RangePicker format="HH:mm" minuteStep={30} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="venue" label="Venue">
          <Input placeholder="Room 305" />
        </Form.Item>
        <Form.Item label="Photo">
          <Upload
            accept=".jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handlePhotoUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>{photoUrl ? "Replace" : "Upload"}</Button>
          </Upload>
          {photoUrl && <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>Uploaded</span>}
        </Form.Item>
      </Form>
    </Modal>
  );
}
