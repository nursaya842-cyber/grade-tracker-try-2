"use client";

import { useState } from "react";
import {
  Typography,
  Tabs,
  Table,
  Button,
  Card,
  List,
  Avatar,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Popconfirm,
  Tag,
  Collapse,
  App,
  Space,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  addClubMember,
  removeClubMember,
  createClubAnnouncement,
  deleteClubAnnouncement,
  fetchAvailableStudents,
} from "../../_actions/student-actions";
import { formatDateTime } from "@/lib/utils";
import type { Dayjs } from "dayjs";

interface Member {
  id: string;
  fullName: string;
  email: string;
}

interface Signup {
  studentId: string;
  fullName: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  signups: Signup[];
}

interface Props {
  clubId: string;
  clubName: string;
  members: Member[];
  announcements: Announcement[];
}

export default function MyClubClient({
  clubId,
  clubName,
  members,
  announcements,
}: Props) {
  const { message } = App.useApp();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const handleOpenAddMember = async () => {
    setAddMemberOpen(true);
    setLoadingStudents(true);
    const students = await fetchAvailableStudents(clubId);
    setAvailableStudents(students);
    setLoadingStudents(false);
  };

  const handleAddMember = async () => {
    if (!selectedStudentId) return;
    setSubmitting(true);
    const result = await addClubMember(clubId, selectedStudentId);
    setSubmitting(false);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Участник добавлен");
      setAddMemberOpen(false);
      setSelectedStudentId(null);
    }
  };

  const handleRemoveMember = async (studentId: string) => {
    const result = await removeClubMember(clubId, studentId);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Участник удалён");
    }
  };

  const handleCreateAnnouncement = async (values: {
    title: string;
    description?: string;
    venue?: string;
    date: Dayjs;
    timeRange: [Dayjs, Dayjs];
  }) => {
    setSubmitting(true);
    const dateStr = values.date.format("YYYY-MM-DD");
    const startTime = values.timeRange[0].format("HH:mm");
    const endTime = values.timeRange[1].format("HH:mm");

    const result = await createClubAnnouncement(clubId, {
      title: values.title,
      description: values.description ?? null,
      photoUrl: null,
      venue: values.venue ?? null,
      startsAt: `${dateStr}T${startTime}:00`,
      endsAt: `${dateStr}T${endTime}:00`,
    });

    setSubmitting(false);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Объявление создано");
      setAnnouncementOpen(false);
      form.resetFields();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const result = await deleteClubAnnouncement(id);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Объявление удалено");
    }
  };

  const memberColumns = [
    {
      title: "Имя",
      dataIndex: "fullName",
      key: "fullName",
      render: (name: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          {name}
        </Space>
      ),
    },
    {
      title: "Телефон",
      dataIndex: "email",
      key: "email",
      width: 160,
    },
    {
      title: "Действия",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Member) => (
        <Popconfirm
          title="Удалить участника?"
          onConfirm={() => handleRemoveMember(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{clubName}</Typography.Title>

      <Tabs
        items={[
          {
            key: "announcements",
            label: "Объявления",
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAnnouncementOpen(true)}
                  style={{ marginBottom: 16 }}
                >
                  Добавить объявление
                </Button>

                {announcements.length === 0 ? (
                  <Card>
                    <Typography.Text type="secondary">
                      Нет объявлений
                    </Typography.Text>
                  </Card>
                ) : (
                  <List
                    dataSource={announcements}
                    renderItem={(a) => (
                      <Card
                        style={{ marginBottom: 12 }}
                        title={a.title}
                        extra={
                          <Space>
                            <Tag icon={<CalendarOutlined />} color="blue">
                              {formatDateTime(a.startsAt)}
                            </Tag>
                            <Popconfirm
                              title="Удалить объявление?"
                              onConfirm={() => handleDeleteAnnouncement(a.id)}
                              okText="Да"
                              cancelText="Нет"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        }
                      >
                        {a.description && (
                          <Typography.Paragraph>
                            {a.description}
                          </Typography.Paragraph>
                        )}
                        {a.venue && (
                          <Typography.Text type="secondary">
                            Место: {a.venue}
                          </Typography.Text>
                        )}
                        <Collapse
                          ghost
                          items={[
                            {
                              key: "signups",
                              label: `Записалось: ${a.signups.length}`,
                              children:
                                a.signups.length > 0 ? (
                                  <List
                                    size="small"
                                    dataSource={a.signups}
                                    renderItem={(s) => (
                                      <List.Item>{s.fullName}</List.Item>
                                    )}
                                  />
                                ) : (
                                  <Typography.Text type="secondary">
                                    Пока никто не записался
                                  </Typography.Text>
                                ),
                            },
                          ]}
                        />
                      </Card>
                    )}
                  />
                )}
              </div>
            ),
          },
          {
            key: "members",
            label: `Участники (${members.length})`,
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenAddMember}
                  style={{ marginBottom: 16 }}
                >
                  Добавить участника
                </Button>
                <Table
                  dataSource={members}
                  columns={memberColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </div>
            ),
          },
        ]}
      />

      {/* Add Member Modal */}
      <Modal
        title="Добавить участника"
        open={addMemberOpen}
        onCancel={() => {
          setAddMemberOpen(false);
          setSelectedStudentId(null);
        }}
        onOk={handleAddMember}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={submitting}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Выберите студента"
          showSearch
          optionFilterProp="label"
          loading={loadingStudents}
          value={selectedStudentId}
          onChange={setSelectedStudentId}
          options={availableStudents.map((s) => ({
            label: s.full_name,
            value: s.id,
          }))}
        />
      </Modal>

      {/* Create Announcement Modal */}
      <Modal
        title="Новое объявление"
        open={announcementOpen}
        onCancel={() => {
          setAnnouncementOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAnnouncement}>
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: "Введите название" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="venue" label="Место">
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: "Выберите дату" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="timeRange"
            label="Время начала — конца"
            rules={[{ required: true, message: "Выберите время" }]}
          >
            <TimePicker.RangePicker
              format="HH:mm"
              minuteStep={30}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setAnnouncementOpen(false);
                  form.resetFields();
                }}
              >
                Отмена
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
