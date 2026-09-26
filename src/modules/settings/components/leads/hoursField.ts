// src/modules/settings/components/leads/hoursField.ts
//
// Pole „ile godzin" w progach kolejki leadów.
//
// Wcześniej każde naciśnięcie klawisza szło przez clamp(1..720): wpisanie „800"
// zamieniało się w trakcie pisania w „720", a skasowanie liczby, żeby wpisać nową,
// od razu wstawiało „1". Teraz pole trzyma to, co wpisano, a granice pilnuje
// dopiero opuszczenie pola (i zapis).

/** Zakres przyjmowany przez backend (PATCH /company/lead-alert-config). */
export const MIN_HOURS = 1;
export const MAX_HOURS = 720;

/** Tylko cyfry - bez ułamków, minusów i „e", które przepuszcza <input type="number">. */
export function sanitizeHours(text: string): string {
    return text.replace(/\D/g, '').slice(0, 4);
}

/** Liczba godzin, jeśli tekst jest poprawnym progiem; inaczej null. */
export function parseHours(text: string): number | null {
    if (!/^\d+$/.test(text)) return null;
    const n = Number(text);
    return n >= MIN_HOURS && n <= MAX_HOURS ? n : null;
}

/**
 * Wartość po opuszczeniu pola: poza zakresem - najbliższa granica, puste - to,
 * co było zapisane (pusty próg nie jest wyborem, tylko przerwanym pisaniem).
 */
export function normalizeHours(text: string, fallback: number): string {
    if (!/^\d+$/.test(text)) return String(fallback);
    const n = Number(text);
    return String(Math.min(MAX_HOURS, Math.max(MIN_HOURS, n)));
}

/** „48 godz." → „2 dni", „36" → „1,5 dnia"; pod polem, żeby liczbę dało się przeczytać. */
export function hoursInDays(hours: number): string {
    const days = hours / 24;
    if (days < 1) return `${hours} godz.`;
    if (Number.isInteger(days)) return days === 1 ? '1 dzień' : `${days} dni`;
    return `${days.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} dnia`;
}
