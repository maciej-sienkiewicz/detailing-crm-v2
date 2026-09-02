// src/modules/live-metrics/hooks/applyLiveEvent.ts
/**
 * Nanoszenie pojedynczego zdarzenia na migawkę `/overview` trzymaną w cache'u.
 *
 * Bez tego wykres ruszałby się dopiero co 60 sekund, przy pełnym odświeżeniu. Zdarzenie
 * z WebSocketu podbija te same kubełki, które podbił backend w Redisie, więc obraz jest
 * żywy, a kolejny refetch i tak jest źródłem prawdy i koryguje ewentualny dryf.
 *
 * Funkcja jest czysta: zwraca nową migawkę i nie mutuje wejścia, bo React Query
 * porównuje referencje, żeby wiedzieć, co przerysować.
 */

import type { BusinessEventDto, LiveMetricsOverview, SeriesPoint } from '../types';

const RECENT_EVENTS_CAP = 50;

/**
 * Szerokość kubełka wyprowadzona z samych danych, a nie z założenia o strefie.
 * Backend kubełkuje w strefie studia; liczenie tego po stronie przeglądarki wymagałoby
 * powtórzenia jego arytmetyki i rozjechałoby się przy zmianie czasu.
 */
function bucketSpacingMs(points: SeriesPoint[]): number | null {
    if (points.length < 2) return null;
    const last = Date.parse(points[points.length - 1].at);
    const previous = Date.parse(points[points.length - 2].at);
    const spacing = last - previous;
    return spacing > 0 ? spacing : null;
}

/** Podbija kubełek zawierający `atMs`; dokłada nowe kubełki, gdy czas wyszedł poza serię. */
function bumpBucket(points: SeriesPoint[] | undefined, atMs: number): SeriesPoint[] | undefined {
    if (!points || points.length === 0) return points;

    const lastStart = Date.parse(points[points.length - 1].at);
    const spacing = bucketSpacingMs(points);

    // Najczęstszy przypadek: zdarzenie należy do ostatniego, otwartego kubełka.
    if (atMs >= lastStart && (spacing === null || atMs < lastStart + spacing)) {
        const next = points.slice();
        next[next.length - 1] = { ...next[next.length - 1], count: next[next.length - 1].count + 1 };
        return next;
    }

    // Zdarzenie otwiera kolejny kubełek: dosypujemy zerowe luki i przesuwamy okno,
    // żeby wykres nie rósł w nieskończoność.
    if (atMs >= lastStart && spacing !== null) {
        const next = points.slice();
        let cursor = lastStart + spacing;
        while (cursor + spacing <= atMs) {
            next.push({ at: new Date(cursor).toISOString(), count: 0 });
            cursor += spacing;
        }
        next.push({ at: new Date(cursor).toISOString(), count: 1 });
        return next.slice(next.length - points.length);
    }

    // Zdarzenie starsze niż ostatni kubełek (spóźniona ramka): znajdź właściwy.
    for (let i = points.length - 1; i >= 0; i -= 1) {
        if (atMs >= Date.parse(points[i].at)) {
            const next = points.slice();
            next[i] = { ...next[i], count: next[i].count + 1 };
            return next;
        }
    }
    return points;
}

function bumpMap(
    map: Record<string, SeriesPoint[]>,
    series: string[],
    atMs: number,
): Record<string, SeriesPoint[]> {
    let changed = false;
    const next: Record<string, SeriesPoint[]> = { ...map };
    for (const name of series) {
        const bumped = bumpBucket(map[name], atMs);
        if (bumped && bumped !== map[name]) {
            next[name] = bumped;
            changed = true;
        }
    }
    return changed ? next : map;
}

export function applyLiveEvent(
    overview: LiveMetricsOverview,
    event: BusinessEventDto,
): LiveMetricsOverview {
    const atMs = Date.parse(event.occurredAt);
    if (Number.isNaN(atMs)) return overview;

    const affected = new Set(event.series);

    const stats = overview.stats.map((stat) =>
        affected.has(stat.series)
            ? {
                  ...stat,
                  total: stat.total + 1,
                  today: stat.today + 1,
                  lastHour: stat.lastHour + 1,
                  last15Minutes: stat.last15Minutes + 1,
                  lastEventAt: event.occurredAt,
              }
            : stat,
    );

    // Profil godzinowy jest liczony tylko dla serii bazowych i tylko w strefie studia.
    // Podbijamy go po godzinie odczytanej w tej samej strefie, żeby słupek nie wylądował
    // obok tego, który za chwilę przyśle backend.
    const hourOfDayProfile7d = { ...overview.hourOfDayProfile7d };
    const studioHour = Number(
        new Intl.DateTimeFormat('pl-PL', {
            hour: '2-digit',
            hour12: false,
            timeZone: overview.zone,
        }).format(new Date(atMs)),
    );
    if (Number.isInteger(studioHour) && studioHour >= 0 && studioHour <= 23) {
        for (const name of event.series) {
            const profile = overview.hourOfDayProfile7d[name];
            if (!profile) continue;
            const next = profile.slice();
            next[studioHour] += 1;
            hourOfDayProfile7d[name] = next;
        }
    }

    const alreadySeen = overview.recentEvents.some((seen) => seen.id === event.id);

    return {
        ...overview,
        stats,
        lastHourByMinute: bumpMap(overview.lastHourByMinute, event.series, atMs),
        last24hByHour: bumpMap(overview.last24hByHour, event.series, atMs),
        last30dByDay: bumpMap(overview.last30dByDay, event.series, atMs),
        hourOfDayProfile7d,
        recentEvents: alreadySeen
            ? overview.recentEvents
            : [event, ...overview.recentEvents].slice(0, RECENT_EVENTS_CAP),
    };
}
