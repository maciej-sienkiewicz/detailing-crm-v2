// src/modules/employees/components/worktime/monthFormat.ts
//
// Czyste funkcje list miesięcznych: nazwy miesięcy, godziny, status karty, który miesiąc
// otworzyć domyślnie i która karta jest następna w przeglądzie. Bez Reacta - testowane
// osobno, bo od nich zależy, co menedżer zobaczy jako „krok następny".

import type { PillTone } from '@/common/components/ui';
import type { CardStatus, MonthCardRow, MonthOverview, MonthSheet, MonthStage } from '../../api/worktimeMonthsApi';

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

/** Nazwa pliku przy pobraniu: `lista-obecnosci-2026-09.pdf`, podpisana z dopiskiem. */
export function sheetFileName(period: string, signed: boolean): string {
    return `lista-obecnosci-${period}${signed ? '-podpisana' : ''}.pdf`;
}

/** 9120 → „152 h", 9135 → „152:15 h". Ten sam zapis co w karcie pracownika („8:30"). */
export function hoursText(minutes: number): string {
    const sign = minutes < 0 ? '−' : '';
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${m === 0 ? h : `${h}:${pad(m)}`} h`;
}

/** „152 / 168 h": przepracowane wobec normy. */
export function hoursVsNorm(totalMinutes: number, expectedMinutes: number): string {
    return `${hoursText(totalMinutes).replace(/ h$/, '')} / ${hoursText(expectedMinutes)}`;
}

export function daysLabel(count: number): string {
    if (count === 1) return '1 dzień';
    return `${count} dni`;
}

export const CARD_STATUS: Record<CardStatus, { label: string; tone: PillTone }> = {
    NOT_STARTED: { label: 'Brak wpisów', tone: 'neutral' },
    DRAFT: { label: 'W trakcie', tone: 'neutral' },
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

/**
 * Komu można teraz wysłać przypomnienie. Nie patrzy na `canDecide` - to pole mówi tylko
 * o kartach złożonych i zatwierdzonych (przy niezłożonych backend zawsze daje false);
 * własną kartę odsiewa `selfUserId`.
 */
export function remindable(rows: MonthCardRow[], now: number = Date.now(), selfUserId?: string | null): MonthCardRow[] {
    return rows.filter(r => isNotSubmitted(r.status) && r.userId !== selfUserId && !remindedRecently(r.remindedAt, now));
}

/** Karty, które ten użytkownik może teraz zatwierdzić albo zwrócić. */
export const awaitingDecision = (rows: MonthCardRow[]) =>
    rows.filter(r => r.status === 'SUBMITTED' && r.canDecide);

/** „Zatwierdź złożone bez braków": tylko złożone, bez brakujących dni roboczych. */
export const approvableInBulk = (rows: MonthCardRow[]) =>
    awaitingDecision(rows).filter(r => r.missingWorkingDays === 0);

/**
 * Następna karta do decyzji po `currentUserId`: idzie dalej w kolejności listy i zawija
 * na początek, pomija bieżącą i te, o których już zdecydowano w tym przeglądzie
 * (odświeżony przegląd miesiąca może jeszcze nie zdążyć tego pokazać).
 */
export function nextAwaiting(
    rows: MonthCardRow[],
    currentUserId: string,
    decided: ReadonlySet<string> = new Set(),
): MonthCardRow | null {
    const start = rows.findIndex(r => r.userId === currentUserId);
    for (let step = 1; step <= rows.length; step++) {
        const row = rows[(Math.max(start, 0) + step) % rows.length];
        if (row.userId === currentUserId || decided.has(row.userId)) continue;
        if (row.status === 'SUBMITTED' && row.canDecide) return row;
    }
    return null;
}

/** Etap miesiąca jako indeks pastylek „Karty → Zatwierdzanie → Podpis listy"; 3 = wszystko zrobione. */
export function stageStep(stage: MonthStage): number {
    switch (stage) {
        case 'COLLECTING': return 0;
        case 'REVIEWING': return 1;
        case 'READY_TO_SIGN':
        case 'NEEDS_RESIGN': return 2;
        case 'SIGNED': return 3;
    }
}

/** Lista podpisana: status APPROVED (zatwierdzenie listy wymaga podpisu). */
export const isSigned = (sheet: Pick<MonthSheet, 'status'>) => sheet.status === 'APPROVED';

/**
 * Niepodpisana lista, którą można podpisać bez tworzenia nowej. Nowa lista zastępuje
 * niepodpisaną - a razem z nią przepadłaby prośba o podpis wysłana już na tablet albo
 * SMS-em. Starą bierzemy jednak tylko wtedy, gdy na pewno jest aktualna: wszyscy na niej
 * są i żadna karta nie została zatwierdzona po jej wygenerowaniu (odblokowana
 * i zatwierdzona ponownie karta mogła zmienić godziny).
 */
export function reusableSheet(month: MonthOverview): MonthSheet | null {
    const sheet = month.sheet;
    if (!sheet || sheet.status !== 'GENERATED' || sheet.outdated) return null;
    if (month.stage !== 'READY_TO_SIGN' || sheet.excludedNames.length > 0) return null;
    const generated = Date.parse(sheet.generatedAt);
    const approvedAfter = month.employees.some(r => r.approvedAt && Date.parse(r.approvedAt) > generated);
    return approvedAfter ? null : sheet;
}

/** Czy podpisana lista obejmuje tę osobę (pominięci są w stopce, nie w tabeli). */
export function signedSheetIncludes(month: Pick<MonthOverview, 'sheet'> | null | undefined, name: string): boolean {
    const sheet = month?.sheet;
    return !!sheet && isSigned(sheet) && !sheet.outdated && !sheet.excludedNames.includes(name);
}
