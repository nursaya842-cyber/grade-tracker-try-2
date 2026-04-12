"use client";

import React, { useState } from "react";
import { Row, Col, Card, Typography, Button, Avatar, Badge, Popconfirm, App, Modal, Form, Input, Select, Space, Collapse, List, Empty } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, NotificationOutlined, TeamOutlined } from "@ant-design/icons";
import { createClub, updateClub, deleteClub } from "../../_actions/club-actions";
import AnnouncementFormModal from "./AnnouncementFormModal";
import AnnouncementsList from "./AnnouncementsList";

interface Club {
  id: string;
  name: string;
  headStudentId: string;
  headName: string;
  memberCount: number;
  memberIds: string[];
}

interface Student {
  id: string;
  full_name: string;
}

export default function ClubsPage({ clubs, students }: { clubs: Club[]; students: Student[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Club | null>(null);
  const [announcementClubId, setAnnouncementClubId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEdit = (c: Club) => {
    setEditing(c);
    form.setFieldsValue({
      name: c.name,
      headStudentId: c.headStudentId,
      memberIds: c.memberIds,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    const res = editing
      ? await updateClub(editing.id, values)
      : await createClub(values);
    setLoading(false);
    if (res.error) message.error(res.error);
    else {
      message.success(editing ? "Клуб обновлён" : "Клуб создан");
      setFormOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteClub(id);
    if (res.error) message.error(res.error);
    else message.success("Клуб удалён");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Клубы</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить</Button>
      </div>

      {clubs.length === 0 ? (
        <Empty description="Нет клубов" />
      ) : (
        <Row gutter={[16, 16]}>
          {clubs.map((club) => (
            <Col xs={24} sm={12} lg={8} key={club.id}>
              <Card
                style={{ borderRadius: 12 }}
                actions={[
                  <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(club)}>Ред.</Button>,
                  <Button key="ann" type="text" icon={<NotificationOutlined />} onClick={() => setAnnouncementClubId(club.id)}>Объяв.</Button>,
                  <Popconfirm key="del" title="Удалить клуб?" onConfirm={() => handleDelete(club.id)} okText="Да" cancelText="Нет">
                    <Button type="text" danger icon={<DeleteOutlined />}>Удал.</Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={<Avatar style={{ background: "#722ed1" }} icon={<TeamOutlined />} />}
                  title={club.name}
                  description={
                    <Space orientation="vertical" size={2}>
                      <span>Глава: {club.headName}</span>
                      <span>Участников: <strong>{club.memberCount}</strong></span>
                    </Space>
                  }
                />
                <Collapse ghost style={{ marginTop: 12 }} items={[{
                  key: "announcements",
                  label: "Объявления",
                  children: <AnnouncementsList clubId={club.id} />,
                }]} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editing ? "Редактировать клуб" : "Новый клуб"}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={() => setFormOpen(false)}
        confirmLoading={loading}
        okText={editing ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Шахматный клуб" />
          </Form.Item>
          <Form.Item name="headStudentId" label="Глава клуба" rules={[{ required: true, message: "Выберите главу" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Выберите студента"
              options={students.map((s) => ({ label: s.full_name, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="memberIds" label="Участники">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Выберите участников"
              options={students.map((s) => ({ label: s.full_name, value: s.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <AnnouncementFormModal
        clubId={announcementClubId}
        onClose={() => setAnnouncementClubId(null)}
      />
    </div>
  );
}
