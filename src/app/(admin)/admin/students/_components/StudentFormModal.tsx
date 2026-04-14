"use client";
import { useClientMount } from "@/hooks/use-client-mount";

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
  const mounted = useClientMount();
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
        message.error("Photo upload error");
        return false;
      }
      setPhotoPath(path);
      message.success("Photo uploaded");
    } catch {
      message.error("Photo compression error");
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
        message.success("Student updated");
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
        message.success("Student created");
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <Modal
        forceRender={mounted}
      title={isEditing ? "Edit student" : "New student"}
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
          <Input placeholder="student@university.kz" />
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

        <Form.Item
          name="facultyId"
          label="Faculty"
        >
          <Select
            placeholder="Select faculty"
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
          label="Year"
          rules={[{ required: true, message: "Select year" }]}
        >
          <Select
            placeholder="Select year"
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              label: `Year ${n}`,
              value: n,
            }))}
          />
        </Form.Item>

        <Form.Item label="Photo (for Face-ID)">
          <Upload
            accept=".jpg,.jpeg,.png"
            maxCount={1}
            beforeUpload={(file) => handlePhotoUpload(file as unknown as File)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>
              {photoPath ? "Replace photo" : "Upload photo"}
            </Button>
          </Upload>
          {photoPath && (
            <span style={{ marginLeft: 8, color: "#52c41a", fontSize: 13 }}>
              Photo uploaded
            </span>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
