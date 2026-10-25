// src/common/components/notifications/appointmentReminderLead.ts
//
// Czas przypomnienia o rezerwacji: osoba wpisuje liczbę i jednostkę („45 minut",
// „3 godziny", „2 dni"), serwer trzyma czas ISO-8601 w postaci `Duration.toString()`
// („PT45M", „PT3H", „PT48H") i przyjmuje od 1 minuty do 30 dni
// (NotificationCategory.APPOINTMENT_REMINDER). Tu jest przejście w obie strony,
// odmiana jednostek i zdanie, kiedy przypomnienie przychodzi.
//
// Zapis budujemy dokładnie tak, jak go zwraca serwer - inaczej wartość pokazana od razu
// po kliknięciu („PT90M") różniłaby się od zapisanej („PT1H30M") i pole by mrugało.

export type LeadUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export const UNITS: LeadUnit[] = ['MINUTES', 'HOURS', 'DAYS'];

const UNIT_MINUTES: Record<LeadUnit, number> = { MINUTES: 1, HOURS: 60, DAYS: 24 * 60 };

export const MAX_LEAD_MINUTES = 30 * 24 * 60;

/** Czas, zanim osoba wpisze własny - ten sam co domyślny na serwerze (NotificationCategory.APPOINTMENT_REMINDER). */
export const DEFAULT_LEAD = 'PT1H';

export const LEAD_ERROR = 'Wpisz od 1 minuty do 30 dni.';

/**
 * Biernik po „przed": „1 godzinę przed", „2 godziny przed", „5 godzin przed".
 * Te same formy stoją w liście jednostek, bo pole czyta się razem z nią jak zdanie.
 */
const FORMS: Record<LeadUnit, [string, string, string]> = {
    MINUTES: ['minutę', 'minuty', 'minut'],
    HOURS: ['godzinę', 'godziny', 'godzin'],
    DAYS: ['dzień', 'dni', 'dni'],
};

/** Liczba i jednostka tak, jak stoją w polach; liczba jako tekst, bo pole bywa puste. */
export interface LeadDraft {
    amount: string;
    unit: LeadUnit;
}

const plural = (n: number, [one, few, many]: [string, string, string]) => {
    if (n === 1) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
    return many;
};

/** Nazwa jednostki do listy przy danej liczbie; bez liczby - forma „wielu". */
export const unitLabel = (unit: LeadUnit, amount: string): string => {
    const n = Number(amount);
    return plural(Number.isInteger(n) && n > 0 ? n : 5, FORMS[unit]);
};

/** „PT1H30M" → 90, „PT24H" i „P1D" → 1440; null dla „OFF" i zapisu, którego nie da się odczytać. */
export function leadMinutes(value: string | null | undefined): number | null {
    const match = value ? /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(value) : null;
    if (!match || !match.slice(1).some(Boolean)) return null;
    const minutes = Number(match[1] ?? 0) * UNIT_MINUTES.DAYS + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
    return minutes > 0 ? minutes : null;
}

/** Minuty → zapis serwera: 45 → „PT45M", 90 → „PT1H30M", 1440 → „PT24H". */
export function toIso(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `PT${hours ? `${hours}H` : ''}${rest ? `${rest}M` : ''}`;
}

/** Największa jednostka, w której czas jest liczbą całkowitą: 90 → 90 minut, 120 → 2 godziny, 2880 → 2 dni. */
export function toDraft(minutes: number): LeadDraft {
    const unit = [...UNITS].reverse().find(u => minutes % UNIT_MINUTES[u] === 0) ?? 'MINUTES';
    return { amount: String(minutes / UNIT_MINUTES[unit]), unit };
}

/** Minuty z pól albo null, gdy liczba nie jest całkowita lub czas wychodzi poza zakres serwera. */
export function draftMinutes(draft: LeadDraft): number | null {
    if (!/^\d+$/.test(draft.amount.trim())) return null;
    const minutes = Number(draft.amount) * UNIT_MINUTES[draft.unit];
    return minutes >= 1 && minutes <= MAX_LEAD_MINUTES ? minutes : null;
}

/** „godzinę", „90 minut", „2 godziny", „dzień", „3 dni". */
function leadPhrase(minutes: number): string {
    const { amount, unit } = toDraft(minutes);
    const n = Number(amount);
    return n === 1 ? FORMS[unit][0] : `${n} ${plural(n, FORMS[unit])}`;
}

/**
 * Rezerwacja całodniowa nie ma godziny - serwer liczy jej przypomnienie od 8:00
 * (AppointmentReminderTiming.ALL_DAY_START). „o 7:15", „dzień wcześniej o 22:00",
 * „3 dni wcześniej o 8:00".
 */
function allDayWhen(minutes: number): string {
    const at = 8 * 60 - minutes;
    const daysBefore = at >= 0 ? 0 : Math.ceil(-at / UNIT_MINUTES.DAYS);
    const clock = at + daysBefore * UNIT_MINUTES.DAYS;
    const time = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
    if (daysBefore === 0) return `o ${time}`;
    if (daysBefore === 1) return `dzień wcześniej o ${time}`;
    return `${daysBefore} dni wcześniej o ${time}`;
}

export function reminderHint(minutes: number): string {
    return `Przypomnienie przychodzi ${leadPhrase(minutes)} przed każdą rezerwacją. `
        + `Przy rezerwacji całodniowej przychodzi ${allDayWhen(minutes)}.`;
}
