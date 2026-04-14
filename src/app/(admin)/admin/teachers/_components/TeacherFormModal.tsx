"use client";
import { useClientMount } from "@/hooks/use-client-mount";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Upload, Button, App } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { createTeacher, updateTeacher } from "../../_actions/teacher-actions";
import { createClient } from "@/lib/supabase/client";

interface Teacher {
  id: string;
  email: string;
  full_name: string;
  diploma_url: string | null;
}

interface Props {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
}

export default function TeacherFormModal({ open, teacher, onClose }: Props) {
  const [form] = Form.useForm();
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const [diplomaPath, setDiplomaPath] = useState<string | null>(null);
  const { message } = App.useApp();
  const isEditing = !!teacher;

  useEffect(() => {
    if (open) {
      if (teacher) {
        form.setFieldsValue({
          fullName: teacher.full_name,
          email: teacher.email,
        });
        setDiplomaPath(teacher.diploma_url);
      } else {
        form.resetFields();
        setDiplomaPath(null);
      }
    }
  }, [open, teacher, form]);

  const handleDiplomaUpload = async (file: File) => {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("diplomas").upload(path, file);
    if (error) {
      message.error("File upload error");
      return false;
    }
    setDiplomaPath(path);
    message.success("File uploaded");
    return false; // prevent default upload behavior
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    if (isEditing) {
      const res = await updateTeacher(teacher.id, {
        fullName: values.fullName,
        email: values.email,
        diplomaUrl: diplomaPath ?? undefined,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Teacher updated");
        onClose();
      }
    } else {
      const res = await createTeacher({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        diplomaUrl: diplomaPath ?? undefined,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Teacher created");
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <Modal
        forceRender={mounted}
      title={isEditing ? "Edit teacher" : "New teacher"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={isEditing ? "Save" : "Create"}
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[{ required: true, message: "Enter full name" }]}
        >
          <Input placeholder="John Smith" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter email" },
            { type: "email", message: "Invalid email" },
          ]}
        >
          <Input placeholder="teacher@university.kz" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Enter password" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
        )}

        <Form.Item label="Diploma (PDF / image)">
          <Upload
            accept=".pdf,.jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handleDiplomaUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>
              {diplomaPath ? "Replace file" : "Upload file"}
            </Button>
          </Upload>
          {diplomaPath && (
            <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>
              File uploaded
            </span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
