// src/modules/employees/components/worktime/gridCell.ts
//
// Co stoi w komórce siatki „Wpisy godzin" (WorkTimeGrid) dla jednego dnia karty.

import type { CardDay } from '../../api/worktimeMonthsApi';
import { hoursText } from './monthFormat';

export type CellKind = 'hours' | 'leave' | 'missing' | null;

interface Cell {
    kind: CellKind;
    /** Napis w komórce: „8", „7:30", „U", „L4". */
    text: string;
    /** Dla czytnika ekranu i dymka po najechaniu. */
    description: string | null;
}

/** 480 → „8", 450 → „7:30" - bez „h", w kolumnie 30 px liczy się każdy znak. */
const shortHours = (minutes: number) => hoursText(minutes).replace(/ h$/, '');

export function cellOf(day: CardDay | undefined): Cell {
    if (!day) return { kind: null, text: '', description: null };
    // Urlop wygrywa z wpisem: godziny wpisane w dzień urlopu i tak nie wchodzą do normy,
    // a pytanie siatki brzmi „czy ten dzień jest rozliczony".
    if (day.leave) {
        const sick = day.leave.type === 'SICK';
        return { kind: 'leave', text: sick ? 'L4' : 'U', description: day.leave.label };
    }
    if (day.minutes !== null) {
        return { kind: 'hours', text: shortHours(day.minutes), description: hoursText(day.minutes) };
    }
    if (day.missing) return { kind: 'missing', text: '', description: 'brak wpisu' };
    return { kind: null, text: '', description: null };
}
