// src/modules/employees/components/leave/leaveKinds.tsx
//
// Rodzaje urlopu tak, jak widzi je człowiek. „Na żądanie" to dla API flaga przy
// wypoczynkowym (`onDemand`), ale dla pracownika - osobny rodzaj z własną regułą
// (także od dziś, najwyżej 4 dni w roku), więc stoi na liście jako osobna karta.
// Ta sama lista u pracownika i u administratora dodającego urlop za kogoś.

import { Baby, CalendarHeart, CalendarX2, Sun, Timer, Users, type LucideIcon } from 'lucide-react';
import type { LeaveRequestType } from '../../types';

export type LeaveKindKey = 'ANNUAL' | 'ON_DEMAND' | 'UNPAID' | 'SPECIAL' | 'CARE' | 'PARENTAL';

export interface LeaveKind {
    key: LeaveKindKey;
    leaveType: LeaveRequestType;
    onDemand: boolean;
    title: string;
    detail: string;
    /** Dopełnienie zdania „Prosisz o …" w podsumowaniu. */
    phrase: string;
    icon: LucideIcon;
}

export const LEAVE_KINDS: LeaveKind[] = [
    { key: 'ANNUAL', leaveType: 'ANNUAL', onDemand: false, title: 'Wypoczynkowy', detail: 'Zaplanowany urlop, najwcześniej od jutra', phrase: 'urlop wypoczynkowy', icon: Sun },
    { key: 'ON_DEMAND', leaveType: 'ANNUAL', onDemand: true, title: 'Na żądanie', detail: 'Także od dziś, najwyżej 4 dni w roku', phrase: 'urlop na żądanie', icon: Timer },
    { key: 'UNPAID', leaveType: 'UNPAID', onDemand: false, title: 'Bezpłatny', detail: 'Bez wynagrodzenia za te dni', phrase: 'urlop bezpłatny', icon: CalendarX2 },
    { key: 'SPECIAL', leaveType: 'SPECIAL', onDemand: false, title: 'Okolicznościowy', detail: 'Ślub, narodziny dziecka, pogrzeb - z podaniem powodu', phrase: 'urlop okolicznościowy', icon: CalendarHeart },
    { key: 'CARE', leaveType: 'CARE', onDemand: false, title: 'Opieka nad dzieckiem', detail: 'Zwolnienie od pracy na opiekę', phrase: 'zwolnienie na opiekę nad dzieckiem', icon: Users },
    { key: 'PARENTAL', leaveType: 'PARENTAL', onDemand: false, title: 'Rodzicielski / wychowawczy', detail: 'Dłuższa nieobecność po narodzinach dziecka', phrase: 'urlop rodzicielski lub wychowawczy', icon: Baby },
];

/** Pola kroku „Termin" - błąd z `field` spoza tej listy (leaveType, onDemand) cofa do kroku „Rodzaj". */
export const TERM_FIELDS = new Set(['startDate', 'endDate', 'reason']);
