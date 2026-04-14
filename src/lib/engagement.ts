/**
 * Student Engagement Score — computed dynamically from existing data.
 *
 * Formula: 0.35×attendance + 0.30×gpa + 0.20×clubs + 0.15×checkin
 * Output: { score: 0-100, segment, color, label }
 */

export interface EngagementInput {
  attendancePct: number; // 0-100
  gpa: number; // 0-4.0
  eventSignups: number; // count
  checkinAvg: number | null; // avg of last 4 check-ins (1-10), null if no check-ins
}

export interface EngagementResult {
  score: number; // 0-100
  segment: "excellent" | "stable" | "declining" | "at-risk";
  color: string;
  label: string;
}

const WEIGHTS = {
  attendance: 0.35,
  gpa: 0.3,
  club: 0.2,
  checkin: 0.15,
};

export function calculateEngagement(input: EngagementInput): EngagementResult {
  const attendanceNorm = Math.min(input.attendancePct, 100);
  const gpaNorm = (input.gpa / 4.0) * 100;
  const clubNorm = Math.min(input.eventSignups / 3, 1) * 100;
  const checkinNorm = input.checkinAvg !== null
    ? input.checkinAvg * 10 // 1-10 → 10-100
    : 50; // default if no check-ins

  const score = Math.round(
    WEIGHTS.attendance * attendanceNorm +
    WEIGHTS.gpa * gpaNorm +
    WEIGHTS.club * clubNorm +
    WEIGHTS.checkin * checkinNorm
  );

  const clamped = Math.max(0, Math.min(100, score));

  if (clamped >= 80) return { score: clamped, segment: "excellent", color: "#52c41a", label: "Excellent" };
  if (clamped >= 60) return { score: clamped, segment: "stable", color: "#1677ff", label: "Stable" };
  if (clamped >= 40) return { score: clamped, segment: "declining", color: "#faad14", label: "Declining" };
  return { score: clamped, segment: "at-risk", color: "#f5222d", label: "At Risk" };
}
