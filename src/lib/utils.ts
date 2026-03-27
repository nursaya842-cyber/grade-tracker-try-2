/**
 * Convert phone number to a fake email for Supabase Auth.
 * Example: "+77001234567" → "+77001234567@university.local"
 */
export function phoneToAuthEmail(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");
  return `${cleaned}@uni.portal`;
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
