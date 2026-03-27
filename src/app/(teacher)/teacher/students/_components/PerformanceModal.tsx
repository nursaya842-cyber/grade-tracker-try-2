"use client";

import React, { useEffect, useState } from "react";
import { Modal, Select, Empty, Spin } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchStudentPerformance } from "../../_actions/teacher-actions";
import { format } from "date-fns";

interface Subject {
  id: string;
  name: string;
}

interface GradeRecord {
  score: number | null;
  graded_at: string;
  lesson_id: string;
  lessons: {
    subject_id: string;
    teacher_id: string;
    starts_at: string;
  };
}

interface Props {
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}

export default function PerformanceModal({
  studentId,
  studentName,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetchStudentPerformance(studentId).then((res) => {
      setSubjects(res.subjects);
      setGrades(res.grades as unknown as GradeRecord[]);
      setSelectedSubject(res.subjects[0]?.id ?? null);
      setLoading(false);
    });
  }, [studentId]);

  const filteredGrades = grades
    .filter(
      (g) =>
        g.lessons?.subject_id === selectedSubject && g.score !== null
    )
    .map((g) => ({
      date: format(new Date(g.lessons.starts_at), "dd.MM"),
      score: g.score,
    }));

  return (
    <Modal
      title={`Оценки: ${studentName}`}
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
          <Select
            style={{ width: "100%", marginBottom: 16 }}
            placeholder="Выберите предмет"
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))}
          />
          {filteredGrades.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredGrades}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Оценка"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="Нет оценок для выбранного предмета" />
          )}
        </>
      )}
    </Modal>
  );
}
