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
      message.success("Member added");
      setAddMemberOpen(false);
      setSelectedStudentId(null);
    }
  };

  const handleRemoveMember = async (studentId: string) => {
    const result = await removeClubMember(clubId, studentId);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Member removed");
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
      message.success("Announcement created");
      setAnnouncementOpen(false);
      form.resetFields();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const result = await deleteClubAnnouncement(id);
    if (result.error) {
      message.error(result.error);
    } else {
      message.success("Announcement deleted");
    }
  };

  const memberColumns = [
    {
      title: "Name",
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
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 160,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Member) => (
        <Popconfirm
          title="Remove member?"
          onConfirm={() => handleRemoveMember(record.id)}
          okText="Yes"
          cancelText="No"
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
            label: "Announcements",
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAnnouncementOpen(true)}
                  style={{ marginBottom: 16 }}
                >
                  Add Announcement
                </Button>

                {announcements.length === 0 ? (
                  <Card>
                    <Typography.Text type="secondary">
                      No announcements
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
                              title="Delete announcement?"
                              onConfirm={() => handleDeleteAnnouncement(a.id)}
                              okText="Yes"
                              cancelText="No"
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
                            Venue: {a.venue}
                          </Typography.Text>
                        )}
                        <Collapse
                          ghost
                          items={[
                            {
                              key: "signups",
                              label: `Signed up: ${a.signups.length}`,
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
                                    No one has signed up yet
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
            label: `Members (${members.length})`,
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenAddMember}
                  style={{ marginBottom: 16 }}
                >
                  Add Member
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
        title="Add Member"
        open={addMemberOpen}
        onCancel={() => {
          setAddMemberOpen(false);
          setSelectedStudentId(null);
        }}
        onOk={handleAddMember}
        okText="Add"
        cancelText="Cancel"
        confirmLoading={submitting}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Select a student"
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
        title="New Announcement"
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
            label="Title"
            rules={[{ required: true, message: "Enter a title" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="venue" label="Venue">
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: "Select a date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="timeRange"
            label="Start — End Time"
            rules={[{ required: true, message: "Select a time" }]}
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
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
