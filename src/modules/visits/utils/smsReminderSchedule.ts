// Termin przypomnienia SMS przy wizycie („za N dni").
//
// Nowe przypomnienie wychodzi o 16:00 wybranego dnia. Przy edycji okno ustawiało 16:00
// także wtedy, gdy ktoś wcześniej przestawił godzinę w „Zaplanowanych" (np. na 13:20) -
// samo poprawienie treści po cichu zmieniało porę wysyłki. Teraz: niezmieniony dzień
// zostawia termin co do minuty, a zmieniony dzień zachowuje dotychczasową godzinę.

const DEFAULT_HOUR = 16;
const DAY_MS = 86_400_000;

/** Dzień „za N dni" o 16:00 - termin nowego przypomnienia. */
export function scheduledDateFromDays(days: number, now: Date = new Date()): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(DEFAULT_HOUR, 0, 0, 0);
    return d;
}

/** Ile dni do zapisanego terminu - to, co okno pokazuje w polu „za ile dni". */
export function daysFromNowForDate(isoDate: string, now: Date = new Date()): number {
    const diff = new Date(isoDate).getTime() - now.getTime();
    return Math.max(1, Math.round(diff / DAY_MS));
}

/**
 * Termin do zapisu. [existingIso] to termin edytowanego przypomnienia; bez niego
 * liczymy nowy termin o 16:00.
 */
export function reminderScheduledFor(days: number, existingIso?: string | null, now: Date = new Date()): string {
    if (!existingIso) return scheduledDateFromDays(days, now).toISOString();
    if (days === daysFromNowForDate(existingIso, now)) return existingIso;
    const original = new Date(existingIso);
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(original.getHours(), original.getMinutes(), 0, 0);
    return d.toISOString();
}
