// src/modules/employees/utils/presence.ts
//
// „Ostatnio w aplikacji" i „Ostatnie logowanie" w oknie pracownika i w liście zespołu.
//
// Backend zapisuje aktywność z dokładnością do godziny, więc godzina jest tu
// przybliżeniem - dlatego krótko („dziś, 7:58"), a nie „3 minuty temu", które
// udawałoby dokładność, której nie ma.

const time = (d: Date) => d.toLocaleTimeString('pl-PL', { hour: 'numeric', minute: '2-digit' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** „dziś, 7:58", „wczoraj, 18:42", „28 września", a z innego roku „28 września 2025". */
export function lastSeenShort(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (days <= 0) return `dziś, ${time(d)}`;
    if (days === 1) return `wczoraj, ${time(d)}`;
    return d.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    });
}

/** Pełna data z godziną: „1 października 2026, 18:42". */
export function dateTimeLong(iso: string): string {
    const d = new Date(iso);
    const date = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${date}, ${time(d)}`;
}

/** Aktywny w ciągu ostatniej godziny - zielona kropka przy „Ostatnio w aplikacji". */
export function seenRecently(iso: string | null | undefined, now: Date = new Date()): boolean {
    if (!iso) return false;
    return now.getTime() - new Date(iso).getTime() < 60 * 60 * 1000;
}
