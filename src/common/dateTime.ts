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

/**
 * Czy obie chwile wypadają tego samego dnia w strefie przeglądarki.
 *
 * Tylko taka wizyta może być całodniowa: wizyta na kilka dni ma zawsze godzinę
 * rozpoczęcia i zakończenia. Backend pilnuje tego samego (AppointmentSchedule.resolveAllDay).
 */
export function isSameLocalDay(start: string | Date, end: string | Date): boolean {
  const s = new Date(start);
  const e = new Date(end);
  return s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate();
}

/** Add hours to a date string or Date and return Instant */
export function addHoursAsInstant(start: string | Date, hours: number): string {
  const d = typeof start === 'string' ? new Date(start) : new Date(start.getTime());
  if (isNaN(d.getTime())) throw new Error('addHoursAsInstant: invalid start');
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

/**
 * Czy termin niesie godzinę, którą ktoś ustalił - czy tylko dzień.
 *
 * Rezerwacja całodniowa i termin wybrany w DateTimePickerze „bez godziny" są
 * zapisywane jako północ czasu lokalnego (początek) albo 23:59:59 (koniec dnia).
 * Wizyta z takiej rezerwacji dziedziczy tę północ w `scheduledDate`, a flagi „cały
 * dzień" nie ma - ma ją tylko rezerwacja. Pokazanie tej północy jako godziny dawało
 * w historii klienta „00:00", jakby klient miał przyjechać w nocy.
 *
 * Sprawdzamy sekundy i milisekundy, a nie samą godzinę: znacznik czasu zapisany
 * przez serwer (utworzenie, wysłanie) nie trafia dokładnie w 00:00:00.000, więc
 * prawdziwa godzina nie znika przez przypadek.
 */
export function hasClockTime(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const midnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
  const endOfDay = d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() === 59;
  return !midnight && !endOfDay;
}

/** „14:30" albo pusty napis, gdy termin nie ma godziny ([hasClockTime]). */
export function formatClockTime(value: string | Date | null | undefined): string {
  if (!hasClockTime(value)) return '';
  const d = new Date(value as string | Date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Termin do wyświetlenia: „23.09.2026, 14:30", a bez godziny - samo „23.09.2026". */
export function formatScheduleDateTime(value: string | Date, options: Intl.DateTimeFormatOptions = {
  day: '2-digit', month: '2-digit', year: 'numeric',
}): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('pl-PL', options);
  const time = formatClockTime(d);
  return time ? `${date}, ${time}` : date;
}
