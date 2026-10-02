// src/modules/employees/components/worktime/monthFormat.ts
//
// Czyste funkcje list miesięcznych: nazwy miesięcy, godziny, status karty, który miesiąc
// otworzyć domyślnie, adresy widoków i czy listę obecności da się podpisać bez tworzenia
// nowej. Bez Reacta - testowane osobno.

import type { CardStatus, MonthCardRow, MonthOverview, MonthSheet } from '../../api/worktimeMonthsApi';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-09` → „Wrzesień 2026". */
export function periodLabel(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const name = MONTHS[month - 1];
    return name && year ? `${name} ${year}` : period;
}

/** Do zdania: „za wrzesień 2026". */
export const periodInSentence = (period: string) => periodLabel(period).toLowerCase();

export const isPeriod = (value: string | null | undefined): value is string =>
    !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export const periodOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export function addMonths(period: string, delta: number): string {
    const [year, month] = period.split('-').map(Number);
    return periodOf(new Date(year, month - 1 + delta, 1));
}

/**
 * Miesiąc, który widok otwiera bez `?period`: do 10. dnia miesiąca poprzedni, bo wtedy
 * zamyka się karty i podpisuje listę za miniony miesiąc; później - bieżący.
 */
export function defaultPeriod(today: Date = new Date()): string {
    const current = periodOf(today);
    return today.getDate() <= 10 ? addMonths(current, -1) : current;
}

/** Miesiące do wyboru: od bieżącego wstecz. Przyszłych nie ma - nie ma w nich czego zbierać. */
export function monthOptions(today: Date = new Date(), count = 24): string[] {
    const current = periodOf(today);
    return Array.from({ length: count }, (_, i) => addMonths(current, -i));
}

export function employeesLabel(count: number): string {
    return count === 1 ? '1 pracownik' : `${count} pracowników`;
}

/** 9120 → „152 h", 9135 → „152:15 h". Ten sam zapis co w karcie pracownika („8:30"). */
export function hoursText(minutes: number): string {
    const sign = minutes < 0 ? '−' : '';
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${m === 0 ? h : `${h}:${pad(m)}`} h`;
}

/**
 * „137:30 z 152 h": przepracowane wobec normy. Słowem, nie ukośnikiem - „152 / 168 h"
 * czytało się jak ułamek albo dwie osobne liczby.
 */
export function hoursOfNorm(totalMinutes: number, expectedMinutes: number): string {
    return `${hoursText(totalMinutes).replace(/ h$/, '')} z ${hoursText(expectedMinutes)}`;
}

export function daysLabel(count: number): string {
    if (count === 1) return '1 dzień';
    return `${count} dni`;
}

/** „brak 1 dnia", „brak 2 dni" - dopisek w wierszu osoby. */
export function missingDaysText(count: number): string {
    return `brak ${count === 1 ? '1 dnia' : `${count} dni`}`;
}

/** „4 z 7 kart zatwierdzonych" - jedyne podsumowanie miesiąca. */
export function approvedSummary(approved: number, total: number): string {
    return `${approved} z ${total} ${total === 1 ? 'karty zatwierdzonej' : 'kart zatwierdzonych'}`;
}

/**
 * Jedno zdanie pod liczbą godzin na karcie: braki, nadgodziny, urlop. Zera są pomijane -
 * „Nadgodziny: brak" przy każdej karcie to szum, który trzeba przeczytać, żeby go odrzucić.
 */
export function cardFactsSentence(card: Pick<MonthCardRow, 'missingWorkingDays' | 'overtimeMinutes' | 'leaveWorkingDays'>): string {
    const parts: string[] = [];
    if (card.missingWorkingDays > 0) {
        parts.push(card.missingWorkingDays === 1
            ? 'Brakuje 1 dnia roboczego.'
            : `Brakuje ${card.missingWorkingDays} dni roboczych.`);
    }
    if (card.overtimeMinutes > 0) parts.push(`Nadgodziny ${hoursText(card.overtimeMinutes)}.`);
    if (card.leaveWorkingDays > 0) parts.push(`Urlop i L4: ${daysLabel(card.leaveWorkingDays)}.`);
    return parts.join(' ');
}

/** Odcień tekstu statusu. Status jest TEKSTEM, nie pastylką - nie da się w niego kliknąć. */
export type StatusTone = 'warn' | 'ok' | 'danger' | 'muted';

export const CARD_STATUS: Record<CardStatus, { label: string; tone: StatusTone }> = {
    NOT_STARTED: { label: 'Brak wpisów', tone: 'muted' },
    DRAFT: { label: 'W trakcie', tone: 'muted' },
    SUBMITTED: { label: 'Do zatwierdzenia', tone: 'warn' },
    RETURNED: { label: 'Zwrócona', tone: 'danger' },
    APPROVED: { label: 'Zatwierdzona', tone: 'ok' },
};

/** Karta, której pracownik jeszcze nie złożył - do niej idzie przypomnienie. */
export const isNotSubmitted = (status: CardStatus) =>
    status === 'NOT_STARTED' || status === 'DRAFT' || status === 'RETURNED';

/** Backend przypomina tej samej osobie najwyżej raz na 12 h - przycisk mówi to wcześniej. */
export const REMIND_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function remindedRecently(remindedAt: string | null, now: number = Date.now()): boolean {
    if (!remindedAt) return false;
    return now - Date.parse(remindedAt) < REMIND_COOLDOWN_MS;
}

/** Lista podpisana: status APPROVED (zatwierdzenie listy wymaga podpisu). */
export const isSigned = (sheet: Pick<MonthSheet, 'status'>) => sheet.status === 'APPROVED';

/** Czy podpisana lista obejmuje tę osobę (pominięci są w stopce, nie w tabeli). */
export function signedSheetIncludes(month: Pick<MonthOverview, 'sheet'> | null | undefined, name: string): boolean {
    const sheet = month?.sheet;
    return !!sheet && isSigned(sheet) && !sheet.outdated && !sheet.excludedNames.includes(name);
}
