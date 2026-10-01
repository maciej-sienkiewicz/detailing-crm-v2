// src/modules/employees/utils/leaveRequestFormat.ts
//
// Słowa i liczby wniosku urlopowego - te same u pracownika i u rozpatrującego.
// Status niesie ODCIEŃ, nie wypełnienie (CLAUDE.md §2): bursztyn „przeczytaj / czeka",
// zieleń „tak", czerwień „nie", szarość - stany bez oceny.

import { pluralPl } from '@/common/utils/plural';
import type { PillTone } from '@/common/components/ui';
import { LEAVE_TYPE_LABELS } from '../components/LeavesTab';
import type { LeaveRequestStatus, LeaveRequestType, OverlappingAbsence } from '../types';

export const LEAVE_REQUEST_STATUS: Record<LeaveRequestStatus, { label: string; tone: PillTone }> = {
    DRAFT: { label: 'Szkic', tone: 'neutral' },
    PENDING: { label: 'Oczekuje', tone: 'warn' },
    APPROVED: { label: 'Zatwierdzony', tone: 'ok' },
    REJECTED: { label: 'Odrzucony', tone: 'danger' },
    WITHDRAWN: { label: 'Wycofany', tone: 'neutral' },
    CANCELLED: { label: 'Odwołany', tone: 'neutral' },
    EXPIRED: { label: 'Wygasł', tone: 'neutral' },
};

/** „Na żądanie" to flaga przy wypoczynkowym, a nie osobny rodzaj - ale dla ludzi jest rodzajem. */
export function leaveRequestTypeLabel(leaveType: LeaveRequestType, onDemand: boolean): string {
    return leaveType === 'ANNUAL' && onDemand ? 'Na żądanie' : LEAVE_TYPE_LABELS[leaveType];
}

/** 1 dzień roboczy, 2-4 dni robocze, 5+ dni roboczych (z wyjątkiem 12-14). */
export function workingDaysLabel(n: number): string {
    return `${n} ${pluralPl(n, 'dzień roboczy', 'dni robocze', 'dni roboczych')}`;
}

/** „1 wniosek czeka", „3 wnioski czekają", „5 wniosków czeka" - liczebnik rządzi i czasownikiem. */
export function pendingRequestsSentence(n: number): string {
    return `${n} ${pluralPl(n, 'wniosek czeka', 'wnioski czekają', 'wniosków czeka')} na decyzję`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const parts = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
};

export const formatDay = (iso: string): string => {
    const { y, m, d } = parts(iso);
    return `${pad(d)}.${pad(m)}.${y}`;
};

/**
 * „03.11–07.11.2026", jeden dzień: „03.11.2026", przełom roku: „28.12.2026–02.01.2027".
 * Myślnik mówi, że to zakres (CLAUDE.md §4) - rok raz, na końcu, gdy jest wspólny.
 */
export function formatLeaveRange(startDate: string, endDate: string): string {
    if (startDate === endDate) return formatDay(startDate);
    const a = parts(startDate);
    const b = parts(endDate);
    if (a.y !== b.y) return `${formatDay(startDate)}–${formatDay(endDate)}`;
    return `${pad(a.d)}.${pad(a.m)}–${pad(b.d)}.${pad(b.m)}.${b.y}`;
}

const MONTHS_GENITIVE = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
/** Dzień tygodnia po „od" / „do" (dopełniacz) i po „w" (biernik); indeks jak getDay(). */
const WEEKDAY_GENITIVE = ['niedzieli', 'poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty'];
const WEEKDAY_ACCUSATIVE = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];

const weekday = (iso: string) => {
    const { y, m, d } = parts(iso);
    return new Date(y, m - 1, d).getDay();
};

/**
 * Termin zdaniem, do podsumowania przed podpisem: „od środy 7 października do piątku
 * 9 października 2026", jeden dzień: „w środę 7 października 2026". Dzień tygodnia
 * jest po to, żeby pomyłkę o tydzień było widać od razu - same cyfry jej nie zdradzą.
 */
export function formatLeaveRangeLong(startDate: string, endDate: string): string {
    const a = parts(startDate);
    const b = parts(endDate);
    const day = (p: { m: number; d: number }) => `${p.d} ${MONTHS_GENITIVE[p.m - 1]}`;
    if (startDate === endDate) return `w ${WEEKDAY_ACCUSATIVE[weekday(startDate)]} ${day(a)} ${a.y}`;
    const from = `${WEEKDAY_GENITIVE[weekday(startDate)]} ${day(a)}${a.y !== b.y ? ` ${a.y}` : ''}`;
    return `od ${from} do ${WEEKDAY_GENITIVE[weekday(endDate)]} ${day(b)} ${b.y}`;
}

/** Liczba różnych osób nieobecnych w terminie wniosku - „kolizja: 2 os.". */
export const collisionCount = (absences: OverlappingAbsence[]): number =>
    new Set(absences.map(a => a.employeeId)).size;

/** Nazwa pliku PDF wniosku: „WU-2026-0012.pdf". */
export const leaveRequestFileName = (number: string): string => `${number.replace(/[^\w-]+/g, '-')}.pdf`;

/** Dzisiejsza data lokalna jako YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
    const { y, m, d } = parts(iso);
    const date = new Date(y, m - 1, d + days);
    return todayIso(date);
}

/** Limity pól z kontraktu: tyle mieści się w stałym polu na wniosku PDF. */
export const LEAVE_REASON_MAX = 250;
export const LEAVE_NOTE_MAX = 250;
export const LEAVE_CANCEL_REASON_MAX = 1000;
