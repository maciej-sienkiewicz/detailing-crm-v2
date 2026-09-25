// src/modules/visits/utils/pickupPhrase.ts
//
// Termin odbioru jako zdanie w nagłówku wizyty: „Odbiór w piątek, 26.09 o 15:00".
//
// Wcześniej w nagłówku stał zakres „22 - 26 września 2026" bez godziny, a osobny
// pasek postępu pod nim mówił tylko, na którym etapie jest auto. Pytanie, które
// pada przy ladzie i przez telefon, brzmi „na kiedy?" - i to ono stoi teraz obok
// postępu, z godziną.

import type { VisitStatus } from '../types';

/** Dzień tygodnia w bierniku z przyimkiem - „we wtorek", „w środę". */
const WEEKDAY_PHRASE = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'];

const pad = (n: number) => String(n).padStart(2, '0');

const dayMonth = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** „dziś", „jutro", „w piątek, 26.09" - krótko dla najbliższych dni, z datą dla pozostałych. */
function dayPhrase(d: Date, now: Date): string {
    const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
    if (diff === 0) return 'dziś';
    if (diff === 1) return 'jutro';
    if (diff > 1 && diff < 7) return `${WEEKDAY_PHRASE[d.getDay()]}, ${dayMonth(d)}`;
    const sameYear = d.getFullYear() === now.getFullYear();
    return sameYear ? dayMonth(d) : `${dayMonth(d)}.${d.getFullYear()}`;
}

export interface PickupPhrase {
    text: string;
    /** Termin minął, a auto nadal jest w studiu - bursztyn, „przeczytaj to". */
    overdue: boolean;
}

export function pickupPhrase(
    status: VisitStatus,
    estimatedCompletionDate: string | undefined,
    pickupDate: string | null | undefined,
    now: Date = new Date(),
): PickupPhrase {
    if (status === 'COMPLETED') {
        const handed = pickupDate ? new Date(pickupDate) : null;
        return {
            text: handed && !isNaN(handed.getTime()) ? `Wydano ${dayMonth(handed)} o ${time(handed)}` : 'Pojazd wydany',
            overdue: false,
        };
    }
    if (!estimatedCompletionDate) return { text: 'Termin odbioru nieustalony', overdue: false };
    const d = new Date(estimatedCompletionDate);
    if (isNaN(d.getTime())) return { text: 'Termin odbioru nieustalony', overdue: false };
    if (d.getTime() < now.getTime() && (status === 'IN_PROGRESS' || status === 'READY_FOR_PICKUP')) {
        return { text: `Odbiór miał być ${dayPhrase(d, now)} o ${time(d)}`, overdue: true };
    }
    return { text: `Odbiór ${dayPhrase(d, now)} o ${time(d)}`, overdue: false };
}
