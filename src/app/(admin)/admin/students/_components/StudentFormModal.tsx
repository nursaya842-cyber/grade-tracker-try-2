"use client";

import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Upload, Button, App } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { createStudent, updateStudent } from "../../_actions/student-actions";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

interface Student {
  id: string;
  email: string;
  full_name: string;
  course_year: number | null;
  faculty_id: string | null;
  face_photo_url: string | null;
}

interface Faculty {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  student: Student | null;
  faculties: Faculty[];
  onClose: () => void;
}

export default function StudentFormModal({ open, student, faculties, onClose }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const { message } = App.useApp();
  const isEditing = !!student;

  useEffect(() => {
    if (open) {
      if (student) {
        form.setFieldsValue({
          fullName: student.full_name,
          email: student.email,
          courseYear: student.course_year,
          facultyId: student.faculty_id,
        });
        setPhotoPath(student.face_photo_url);
      } else {
        form.resetFields();
        setPhotoPath(null);
      }
    }
  }, [open, student, form]);

  const handlePhotoUpload = async (file: File) => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
      });

      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("student-photos")
        .upload(path, compressed);

      if (error) {
        message.error("Ошибка загрузки фото");
        return false;
      }
      setPhotoPath(path);
      message.success("Фото загружено");
    } catch {
      message.error("Ошибка сжатия фото");
    }
    return false;
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    if (isEditing) {
      const res = await updateStudent(student.id, {
        fullName: values.fullName,
        email: values.email,
        courseYear: values.courseYear,
        facultyId: values.facultyId,
        facePhotoUrl: photoPath ?? undefined,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Студент обновлён");
        onClose();
      }
    } else {
      const res = await createStudent({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        courseYear: values.courseYear,
        facultyId: values.facultyId,
        facePhotoUrl: photoPath ?? undefined,
      });
      if (res.error) message.error(res.error);
      else {
        message.success("Студент создан");
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <Modal
      title={isEditing ? "Редактировать студента" : "Новый студент"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={isEditing ? "Сохранить" : "Создать"}
      cancelText="Отмена"
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="fullName"
          label="ФИО"
          rules={[{ required: true, message: "Введите ФИО" }]}
        >
          <Input placeholder="Петров Пётр Петрович" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Введите email" },
            { type: "email", message: "Некорректный email" },
          ]}
        >
          <Input placeholder="student@university.kz" />
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

        <Form.Item
          name="facultyId"
          label="Факультет"
        >
          <Select
            placeholder="Выберите факультет"
            allowClear
            showSearch
            optionFilterProp="label"
            options={faculties.map((f) => ({
              label: f.name,
              value: f.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="courseYear"
          label="Курс"
          rules={[{ required: true, message: "Выберите курс" }]}
        >
          <Select
            placeholder="Выберите курс"
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              label: `${n} курс`,
              value: n,
            }))}
          />
        </Form.Item>

        <Form.Item label="Фото (для Face-ID)">
          <Upload
            accept=".jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handlePhotoUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>
              {photoPath ? "Заменить фото" : "Загрузить фото"}
            </Button>
          </Upload>
          {photoPath && (
            <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>
              Фото загружено
            </span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
