// src/common/dateTime.ts
// Centralized date-time helpers and FE-BE contract
// Contract: All date-times exchanged with backend MUST be Instant (UTC ISO 8601 with trailing 'Z').
// UI components may use local time (e.g., <input type="datetime-local">) for user convenience.
// Use these helpers to convert between local inputs and backend Instants.

/** Convert a local datetime string (from input[type="datetime-local"]) or Date to Instant (UTC ISO with Z) */
export function toInstant(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(date.getTime())) {
    throw new Error(`toInstant: invalid date input: ${String(input)}`);
  }
  return date.toISOString();
}

/** Convert Instant (UTC ISO with Z) to value compatible with input[type="datetime-local"]: YYYY-MM-DDTHH:mm in local time */
export function fromInstantToLocalInput(instant?: string | null): string {
  if (!instant) return '';
  // Accept both with and without 'Z', rely on Date parser
  const d = new Date(instant);
  if (isNaN(d.getTime())) return '';
  return fromDateToLocalInput(d);
}

/** Format a Date object to 'YYYY-MM-DDTHH:mm' in local time for datetime-local inputs */
export function fromDateToLocalInput(date: Date): string {
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Add hours to a date string or Date and return Instant */
export function addHoursAsInstant(start: string | Date, hours: number): string {
  const d = typeof start === 'string' ? new Date(start) : new Date(start.getTime());
  if (isNaN(d.getTime())) throw new Error('addHoursAsInstant: invalid start');
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
