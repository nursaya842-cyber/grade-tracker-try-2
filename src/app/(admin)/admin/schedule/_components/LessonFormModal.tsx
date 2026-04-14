"use client";
import { useClientMount } from "@/hooks/use-client-mount";

import React, { useState, useRef, useCallback } from "react";
import { Modal, Form, Select, DatePicker, TimePicker, Checkbox, Button, Alert, App, Space } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import {
  createLessonSeries,
  searchStudentsForSchedule,
  searchTeachersForSchedule,
} from "../../_actions/schedule-actions";
import dayjs from "dayjs";

const DAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

interface FormOptions {
  subjects: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  formOptions: FormOptions;
}

interface UserOption {
  id: string;
  full_name: string;
  course_year?: number | null;
}

export default function LessonFormModal({ open, onClose, formOptions }: Props) {
  const [form] = Form.useForm();
  const mounted = useClientMount();
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const { message } = App.useApp();

  // Teacher server search
  const [teacherOptions, setTeacherOptions] = useState<UserOption[]>(formOptions.teachers);
  const [teacherFetching, setTeacherFetching] = useState(false);
  const teacherDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Student server search
  const [studentOptions, setStudentOptions] = useState<UserOption[]>([]);
  const [studentFetching, setStudentFetching] = useState(false);
  const studentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTeacherSearch = (val: string) => {
    if (teacherDebounce.current) clearTimeout(teacherDebounce.current);
    teacherDebounce.current = setTimeout(async () => {
      setTeacherFetching(true);
      const data = await searchTeachersForSchedule(val);
      setTeacherOptions(data);
      setTeacherFetching(false);
    }, 300);
  };

  const fetchStudents = useCallback(async (query: string) => {
    setStudentFetching(true);
    const data = await searchStudentsForSchedule(query);
    setStudentOptions(data);
    setStudentFetching(false);
  }, []);

  const handleStudentSearch = (val: string) => {
    if (studentDebounce.current) clearTimeout(studentDebounce.current);
    studentDebounce.current = setTimeout(() => fetchStudents(val), 300);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    setConflicts([]);

    const slots = (values.slots ?? []).map((s: { time: [dayjs.Dayjs, dayjs.Dayjs] }) => ({
      start: s.time[0].format("HH:mm"),
      end: s.time[1].format("HH:mm"),
    }));

    if (slots.length === 0) {
      message.error("Add at least one time slot");
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

    message.success(`Created ${res.lessonCount} lessons`);
    form.resetFields();
    setConflicts([]);
    onClose();
  };

  return (
    <Modal
      forceRender={mounted}
      title="New lesson series"
      open={open}
      onOk={handleSubmit}
      onCancel={() => { setConflicts([]); onClose(); }}
      confirmLoading={loading}
      okText="Create"
      cancelText="Cancel"
      width={640}
    >
      {conflicts.length > 0 && (
        <Alert
          type="error"
          message="Conflicts detected"
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
        <Form.Item name="subjectId" label="Subject" rules={[{ required: true, message: "Select a subject" }]}>
          <Select
            placeholder="Select a subject"
            showSearch
            optionFilterProp="label"
            options={formOptions.subjects.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>

        <Form.Item name="teacherId" label="Teacher" rules={[{ required: true, message: "Select a teacher" }]}>
          <Select
            placeholder="Start typing a teacher name..."
            showSearch
            filterOption={false}
            loading={teacherFetching}
            onSearch={handleTeacherSearch}
            onFocus={() => { if (teacherOptions.length === 0) searchTeachersForSchedule("").then(setTeacherOptions); }}
            notFoundContent={teacherFetching ? "Searching..." : "Not found"}
            options={teacherOptions.map((t) => ({ label: t.full_name, value: t.id }))}
          />
        </Form.Item>

        <Form.Item name="studentIds" label="Students">
          <Select
            mode="multiple"
            placeholder="Start typing a student name or email..."
            showSearch
            filterOption={false}
            loading={studentFetching}
            onSearch={handleStudentSearch}
            onFocus={() => { if (studentOptions.length === 0) fetchStudents(""); }}
            notFoundContent={studentFetching ? "Searching..." : "Start typing a name..."}
            options={studentOptions.map((s) => ({
              label: `${s.full_name}${s.course_year ? ` (Year ${s.course_year})` : ""}`,
              value: s.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="days" label="Days of the week" rules={[{ required: true, message: "Select days" }]}>
          <Checkbox.Group options={DAY_OPTIONS} />
        </Form.Item>

        <Form.List name="slots" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              <label style={{ fontWeight: 500, display: "block", marginBottom: 8 }}>Time slots</label>
              {fields.map(({ key, ...restField }) => (
                <Space key={key} align="start" style={{ marginBottom: 8 }}>
                  <Form.Item
                    {...restField}
                    name={[restField.name, "time"]}
                    rules={[{ required: true, message: "Specify time" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <TimePicker.RangePicker format="HH:mm" minuteStep={30} />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(restField.name)} style={{ color: "#ff4d4f", marginTop: 8 }} />
                  )}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block style={{ marginBottom: 16 }}>
                Add slot
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="dateRange" label="Period" rules={[{ required: true, message: "Specify period" }]}>
          <DatePicker.RangePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
