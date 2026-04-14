"use client";

import React, { useEffect, useState } from "react";
import { Modal, Select, Table, Empty, Spin } from "antd";
import { getStudentSubjects, getStudentGrades } from "../../_actions/student-actions";
import { formatDate } from "@/lib/utils";

interface Props {
  studentId: string | null;
  onClose: () => void;
}

interface Subject {
  id: string;
  name: string;
}

interface GradeRow {
  lesson_id: string;
  score: number | null;
  graded_at: string;
  lessons: { starts_at: string; subject_id: string };
}

export default function StudentGradesModal({ studentId, onClose }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    if (studentId) {
      setLoadingSubjects(true);
      setSelectedSubject(null);
      setGrades([]);
      getStudentSubjects(studentId).then((res) => {
        setSubjects(res.data ?? []);
        setLoadingSubjects(false);
      });
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId && selectedSubject) {
      setLoadingGrades(true);
      getStudentGrades(studentId, selectedSubject).then((res) => {
        setGrades((res.data as unknown as GradeRow[]) ?? []);
        setLoadingGrades(false);
      });
    }
  }, [studentId, selectedSubject]);

  const columns = [
    {
      title: "Date",
      key: "date",
      render: (_: unknown, record: GradeRow) =>
        formatDate(record.lessons?.starts_at ?? record.graded_at),
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      render: (score: number | null) =>
        score !== null ? score : <span style={{ color: "#999" }}>N/A</span>,
    },
  ];

  return (
    <Modal
      title="Academic Performance"
      open={!!studentId}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
    >
      {loadingSubjects ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : subjects.length === 0 ? (
        <Empty description="Student is not enrolled in any subject" />
      ) : (
        <>
          <Select
            placeholder="Select subject"
            style={{ width: "100%", marginBottom: 16 }}
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))}
          />
          {selectedSubject && (
            <Table
              dataSource={grades}
              columns={columns}
              rowKey="lesson_id"
              loading={loadingGrades}
              pagination={{ pageSize: 10 }}
              size="small"
              locale={{ emptyText: "No grades for this subject" }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
