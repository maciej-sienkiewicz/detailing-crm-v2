// src/modules/live-metrics/components/format.ts
// Formatowanie w strefie STUDIA, nie przeglądarki. Backend kubełkuje po lokalnym dniu
// i godzinie studia; gdyby oś rysować w strefie klienta, „o 8:00" na wykresie oznaczałoby
// coś innego niż „o 8:00" w kalendarzu tego samego studia.

const intCache = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `${zone}|${JSON.stringify(options)}`;
    let cached = intCache.get(key);
    if (!cached) {
        try {
            cached = new Intl.DateTimeFormat('pl-PL', { ...options, timeZone: zone });
        } catch {
            // Nieznana strefa z serwera nie może wywrócić widoku — spadamy do lokalnej.
            cached = new Intl.DateTimeFormat('pl-PL', options);
        }
        intCache.set(key, cached);
    }
    return cached;
}

export const formatClock = (iso: string, zone: string): string =>
    formatter(zone, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatHourSlot = (iso: string, zone: string): string =>
    `${formatter(zone, { hour: '2-digit' }).format(new Date(iso))}:00`;

export const formatDayShort = (iso: string, zone: string): string =>
    formatter(zone, { day: '2-digit', month: '2-digit' }).format(new Date(iso));

export const formatCount = (value: number): string => new Intl.NumberFormat('pl-PL').format(value);

/** „przed chwilą" / „12 min temu" — dokładność sekundowa nie wnosi tu nic. */
export function formatRelative(iso: string | null): string {
    if (!iso) return 'brak zdarzeń';
    const seconds = (Date.now() - Date.parse(iso)) / 1000;
    if (Number.isNaN(seconds)) return 'brak zdarzeń';
    if (seconds < 60) return 'przed chwilą';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min temu`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h temu`;
    return `${Math.floor(seconds / 86_400)} dni temu`;
}
