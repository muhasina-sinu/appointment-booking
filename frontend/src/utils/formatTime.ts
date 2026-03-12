/**
 * Convert a 24-hour time string (e.g., "14:00") to 12-hour format (e.g., "2:00 PM").
 */
export function formatTime(time: string): string {
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);

  if (isNaN(hour)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}
