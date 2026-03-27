"use client";

import React, { useState } from "react";
import { Modal, Form, Select, DatePicker, TimePicker, Checkbox, Button, Alert, App, Space } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { createLessonSeries } from "../../_actions/schedule-actions";
import dayjs from "dayjs";

const DAY_OPTIONS = [
  { label: "Пн", value: 1 },
  { label: "Вт", value: 2 },
  { label: "Ср", value: 3 },
  { label: "Чт", value: 4 },
  { label: "Пт", value: 5 },
  { label: "Сб", value: 6 },
  { label: "Вс", value: 7 },
];

interface FormOptions {
  subjects: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
  students: { id: string; full_name: string; course_year: number | null }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  formOptions: FormOptions;
}

export default function LessonFormModal({ open, onClose, formOptions }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const { message } = App.useApp();

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    setConflicts([]);

    const slots = (values.slots ?? []).map((s: { time: [dayjs.Dayjs, dayjs.Dayjs] }) => ({
      start: s.time[0].format("HH:mm"),
      end: s.time[1].format("HH:mm"),
    }));

    if (slots.length === 0) {
      message.error("Добавьте хотя бы один временной слот");
      setLoading(false);
      return;
    }

    const res = await createLessonSeries({
      subjectId: values.subjectId,
      teacherId: values.teacherId,
      studentIds: values.studentIds ?? [],
      recurrenceRule: { days: values.days, slots },
      startDate: values.dateRange[0].format("YYYY-MM-DD"),
      endDate: values.dateRange[1].format("YYYY-MM-DD"),
    });

    setLoading(false);

    if (res.conflicts && res.conflicts.length > 0) {
      setConflicts(res.conflicts);
      return;
    }

    if (res.error) {
      message.error(res.error);
      return;
    }

    message.success(`Создано ${res.lessonCount} уроков`);
    form.resetFields();
    setConflicts([]);
    onClose();
  };

  return (
    <Modal
      title="Новая серия уроков"
      open={open}
      onOk={handleSubmit}
      onCancel={() => { setConflicts([]); onClose(); }}
      confirmLoading={loading}
      okText="Создать"
      cancelText="Отмена"
      width={640}
      destroyOnHidden
    >
      {conflicts.length > 0 && (
        <Alert
          type="error"
          message="Обнаружены конфликты"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          }
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setConflicts([])}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="subjectId" label="Предмет" rules={[{ required: true, message: "Выберите предмет" }]}>
          <Select
            placeholder="Выберите предмет"
            showSearch
            optionFilterProp="label"
            options={formOptions.subjects.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>

        <Form.Item name="teacherId" label="Преподаватель" rules={[{ required: true, message: "Выберите преподавателя" }]}>
          <Select
            placeholder="Выберите преподавателя"
            showSearch
            optionFilterProp="label"
            options={formOptions.teachers.map((t) => ({ label: t.full_name, value: t.id }))}
          />
        </Form.Item>

        <Form.Item name="studentIds" label="Студенты">
          <Select
            mode="multiple"
            placeholder="Выберите студентов"
            showSearch
            optionFilterProp="label"
            options={formOptions.students.map((s) => ({
              label: `${s.full_name} (${s.course_year ?? "—"} курс)`,
              value: s.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="days" label="Дни недели" rules={[{ required: true, message: "Выберите дни" }]}>
          <Checkbox.Group options={DAY_OPTIONS} />
        </Form.Item>

        <Form.List name="slots" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              <label style={{ fontWeight: 500, display: "block", marginBottom: 8 }}>Временные слоты</label>
              {fields.map((field) => (
                <Space key={field.key} align="start" style={{ marginBottom: 8 }}>
                  <Form.Item
                    {...field}
                    name={[field.name, "time"]}
                    rules={[{ required: true, message: "Укажите время" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <TimePicker.RangePicker format="HH:mm" minuteStep={30} />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(field.name)} style={{ color: "#ff4d4f", marginTop: 8 }} />
                  )}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block style={{ marginBottom: 16 }}>
                Добавить слот
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="dateRange" label="Период" rules={[{ required: true, message: "Укажите период" }]}>
          <DatePicker.RangePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
