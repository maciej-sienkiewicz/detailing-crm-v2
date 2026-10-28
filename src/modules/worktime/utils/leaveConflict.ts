// src/modules/worktime/utils/leaveConflict.ts
//
// Godziny pracy wpisane w dzień urlopu albo L4. Wrzesień 2026: pracownik wypełnił cały
// miesiąc po 8 h, także tydzień urlopu, i karta przeszła z 176 h zamiast 136 h - ekran
// doliczał te godziny, a lista obecności (PDF) nie. Teraz backend liczy sumę bez nich,
// oznacza takie dni (`leaveConflict`) i nie przepuszcza karty dalej. Tu tylko słowa
// i daty, wspólne dla karty pracownika i okna przełożonego.

import type { CardDay } from '../types';

const dayMonth = (iso: string) => {
    const [, month, day] = iso.split('-').map(Number);
    return `${day}.${String(month).padStart(2, '0')}`;
};

const nextDay = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Dni sporne jako zakresy: „7–11.09, 14.09". Ten sam zapis co w komunikatach backendu,
 * żeby pracownik i przełożony widzieli te same daty w oknie i w błędzie.
 */
export function leaveConflictDatesText(days: CardDay[]): string {
    const dates = days.filter(d => d.leaveConflict).map(d => d.date).sort();
    const ranges: Array<[string, string]> = [];
    dates.forEach(date => {
        const last = ranges[ranges.length - 1];
        if (last && nextDay(last[1]) === date) last[1] = date;
        else ranges.push([date, date]);
    });
    return ranges
        .map(([from, to]) => {
            if (from === to) return dayMonth(from);
            // Ten sam miesiąc: „7–11.09"; przez koniec miesiąca: „30.09–1.10".
            const start = from.slice(5, 7) === to.slice(5, 7) ? String(Number(from.slice(8))) : dayMonth(from);
            return `${start}–${dayMonth(to)}`;
        })
        .join(', ');
}

/** „W 5 dniach urlopu lub L4 są wpisane godziny pracy: 7–11.09." */
export function leaveConflictTitle(count: number, dates: string): string {
    const where = count === 1 ? 'W 1 dniu urlopu lub L4' : `W ${count} dniach urlopu lub L4`;
    return `${where} są wpisane godziny pracy: ${dates}.`;
}
