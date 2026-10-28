// src/modules/employees/components/worktime/gridCell.ts
//
// Co stoi w komórce siatki „Wpisy godzin" (WorkTimeGrid) dla jednego dnia karty.

import type { CardDay } from '../../api/worktimeMonthsApi';
import { hoursText } from './monthFormat';

export type CellKind = 'hours' | 'leave' | 'conflict' | 'missing' | null;

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
    // Urlop wygrywa z wpisem: godziny wpisane w dzień urlopu nie wchodzą do sumy, a pytanie
    // siatki brzmi „czy ten dzień jest rozliczony". Taki dzień ma jednak własny wygląd -
    // w siatce wyglądał jak zwykły urlop i 40 h wpisanych w tydzień urlopu nikt nie zauważył.
    if (day.leave) {
        const sick = day.leave.type === 'SICK';
        const text = sick ? 'L4' : 'U';
        if (day.leaveConflict && day.minutes !== null) {
            return { kind: 'conflict', text, description: `${day.leave.label}, wpisane ${hoursText(day.minutes)}` };
        }
        return { kind: 'leave', text, description: day.leave.label };
    }
    if (day.minutes !== null) {
        return { kind: 'hours', text: shortHours(day.minutes), description: hoursText(day.minutes) };
    }
    if (day.missing) return { kind: 'missing', text: '', description: 'brak wpisu' };
    return { kind: null, text: '', description: null };
}
