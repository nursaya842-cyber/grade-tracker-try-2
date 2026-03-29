/**
 * Normalize email for auth (trim + lowercase).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Convert a 0-100 score to a 4.0 GPA point (Kazakhstan scale).
 */
export function scoreToGpa(score: number): number {
  if (score >= 95) return 4.0;
  if (score >= 90) return 3.67;
  if (score >= 85) return 3.33;
  if (score >= 80) return 3.0;
  if (score >= 75) return 2.67;
  if (score >= 70) return 2.33;
  if (score >= 65) return 2.0;
  if (score >= 60) return 1.67;
  if (score >= 55) return 1.33;
  if (score >= 50) return 1.0;
  return 0;
}

/**
 * Convert a 0-100 score to a letter grade.
 */
export function scoreToLetter(score: number): string {
  if (score >= 95) return "A";
  if (score >= 90) return "A-";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "B-";
  if (score >= 70) return "C+";
  if (score >= 65) return "C";
  if (score >= 60) return "C-";
  if (score >= 55) return "D+";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Calculate GPA from an array of scores (0-100).
 */
export function calculateGpa(scores: number[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + scoreToGpa(s), 0);
  return Math.round((total / scores.length) * 100) / 100;
}

/**
 * Format a date for display in Russian locale.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a datetime for display in Russian locale.
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
