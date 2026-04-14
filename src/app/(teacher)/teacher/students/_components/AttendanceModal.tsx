"use client";

import React, { useEffect, useState } from "react";
import { Modal, Table, Tag, Statistic, Progress, Row, Col, Spin } from "antd";
import { fetchStudentAttendance } from "../../_actions/teacher-actions";
import { format } from "date-fns";

interface AttendanceRecord {
  status: string;
  method: string | null;
  marked_at: string;
  lesson_id: string;
  lessons: {
    subject_id: string;
    teacher_id: string;
    starts_at: string;
    subjects: { name: string };
  };
}

interface Props {
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}

export default function AttendanceModal({
  studentId,
  studentName,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [present, setPresent] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetchStudentAttendance(studentId).then((res) => {
      setRecords(res.records as unknown as AttendanceRecord[]);
      setTotal(res.total);
      setPresent(res.present);
      setPct(res.pct);
      setLoading(false);
    });
  }, [studentId]);

  const columns = [
    {
      title: "Date",
      key: "date",
      render: (_: unknown, r: AttendanceRecord) =>
        r.lessons?.starts_at
          ? format(new Date(r.lessons.starts_at), "dd.MM.yyyy HH:mm")
          : "—",
    },
    {
      title: "Subject",
      key: "subject",
      render: (_: unknown, r: AttendanceRecord) =>
        r.lessons?.subjects?.name ?? "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string) =>
        status === "present" ? (
          <Tag color="green">Present</Tag>
        ) : (
          <Tag color="red">Absent</Tag>
        ),
    },
  ];

  return (
    <Modal
      title={`Attendance: ${studentName}`}
      open={!!studentId}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic title="Total Lessons" value={total} />
            </Col>
            <Col span={8}>
              <Statistic
                title="Present"
                value={present}
                suffix={`/ ${total}`}
              />
            </Col>
            <Col span={8}>
              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#666" }}>
                  Attendance Rate
                </div>
                <Progress
                  percent={pct}
                  status={pct >= 70 ? "success" : "exception"}
                  format={(p) => `${p}%`}
                />
              </div>
            </Col>
          </Row>

          <Table
            dataSource={records.map((r, i) => ({ ...r, key: i }))}
            columns={columns}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      )}
    </Modal>
  );
}
