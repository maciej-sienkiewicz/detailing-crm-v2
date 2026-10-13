// src/modules/employees/components/monthGridDays.ts
//
// Dni siatki „osoby × dni miesiąca" (MonthGrid) - osobno od komponentów, żeby plik
// komponentów eksportował same komponenty (fast refresh).

import { isWeekend } from '../utils/polishHolidays';

const pad = (n: number) => String(n).padStart(2, '0');

/** Wszystkie dni miesiąca `YYYY-MM` jako YYYY-MM-DD. */
export function monthDays(month: string): string[] {
    const [y, m] = month.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** Szerokości kolumn: nazwisko i po jednej kolumnie na dzień. */
export const gridColumns = (dayCount: number) =>
    `minmax(140px, 180px) repeat(${dayCount}, minmax(30px, 1fr))`;

export const isOffDay = (day: string, holidays: Set<string>) => isWeekend(day) || holidays.has(day);
