"use client";

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
      message.error("Ошибка загрузки файла");
      return false;
    }
    setDiplomaPath(path);
    message.success("Файл загружен");
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
        message.success("Преподаватель обновлён");
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
        message.success("Преподаватель создан");
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <Modal
      title={isEditing ? "Редактировать преподавателя" : "Новый преподаватель"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={isEditing ? "Сохранить" : "Создать"}
      cancelText="Отмена"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="fullName"
          label="ФИО"
          rules={[{ required: true, message: "Введите ФИО" }]}
        >
          <Input placeholder="Иванов Иван Иванович" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Введите email" },
            { type: "email", message: "Некорректный email" },
          ]}
        >
          <Input placeholder="teacher@university.kz" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: "Введите пароль" },
              { min: 6, message: "Минимум 6 символов" },
            ]}
          >
            <Input.Password placeholder="Пароль" />
          </Form.Item>
        )}

        <Form.Item label="Диплом (PDF / изображение)">
          <Upload
            accept=".pdf,.jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handleDiplomaUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>
              {diplomaPath ? "Заменить файл" : "Загрузить файл"}
            </Button>
          </Upload>
          {diplomaPath && (
            <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>
              Файл загружен
            </span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
