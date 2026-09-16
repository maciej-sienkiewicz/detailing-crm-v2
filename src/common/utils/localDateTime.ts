/**
 * Most pomiędzy lokalnym czasem ściennym a instantem UTC.
 *
 * Pickery w tej aplikacji (`DateTimePicker`, QuickEventModal) pracują na
 * napisach `YYYY-MM-DDTHH:mm` BEZ strefy - to czas ścienny, który użytkownik
 * widzi na ekranie. Backend przyjmuje i zwraca `java.time.Instant`, czyli
 * ISO-8601 z przesunięciem (`2026-09-23T18:15:00Z`). Wysłanie napisu wprost
 * z pickera kończy się błędem 400:
 *
 *   Text '2026-09-23T20:15' could not be parsed at index 16
 *
 * Konwersję trzymamy na granicy API, żeby formularze nie musiały o niej
 * wiedzieć - tak samo jak robi to widok kalendarza przy terminie zakończenia.
 *
 * Obie funkcje są idempotentne: instant podany do `instantToLocalDateTime`
 * wraca jako czas ścienny, a czas ścienny podany do `localDateTimeToInstant`
 * jako instant - powtórne wywołanie niczego nie przesuwa.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-09-23T20:15` (czas lokalny) -> `2026-09-23T18:15:00.000Z`. */
export const localDateTimeToInstant = (local: string | null | undefined): string | null => {
    if (!local) return null;
    /* Napis bez strefy jest wg ES2015+ czytany jako czas LOKALNY, więc
       toISOString() zwraca instant odpowiadający temu, co widać na ekranie. */
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** `2026-09-23T18:15:00Z` -> `2026-09-23T20:15` w strefie przeglądarki. */
export const instantToLocalDateTime = (instant: string | null | undefined): string | null => {
    if (!instant) return null;
    const d = new Date(instant);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
