// src/modules/live-metrics/types.ts
// Odbicie kontraktu backendu (pl.detailing.crm.livemetrics.api.LiveMetricsDtos).
// Zmiana po stronie serwera musi trafić tutaj — to jedyne miejsce, w którym front
// zna kształt zdarzeń biznesowych.

/** Pięć obszarów śledzonych w czasie rzeczywistym. */
export const BUSINESS_EVENT_TYPES = [
    'RESERVATION_CREATED',
    'VISIT_CREATED',
    'SERVICE_CREATED',
    'PHOTO_UPLOADED',
    'ACTIVITY_LOGGED',
] as const;

export type BusinessEventType = (typeof BUSINESS_EVENT_TYPES)[number];

/** Wymiar wizyty: skąd się wzięła. */
export type VisitOrigin = 'DIRECT' | 'FROM_RESERVATION';
/** Wymiar pozycji cennika. */
export type ServiceKind = 'SERVICE' | 'PACKAGE';
/** Wymiar zdjęcia: do czego zostało przypięte. */
export type PhotoTarget = 'VISIT' | 'VEHICLE' | 'BATCH_ORDER' | 'CHECKIN';

/**
 * Nazwa serii licznika: albo sam typ (`VISIT_CREATED`), albo typ z wartością
 * wymiaru (`VISIT_CREATED:DIRECT`). Backend inkrementuje obie naraz, więc suma
 * pod-serii zawsze równa się serii bazowej.
 */
export type SeriesName = string;

export interface BusinessEventDto {
    id: string;
    tenantId: string;
    type: BusinessEventType;
    /** Serie, których liczniki to zdarzenie podbiło: bazowa i (jeśli jest) pod-seria. */
    series: SeriesName[];
    dimension: string | null;
    dimensionValue: string | null;
    /** ISO-8601. */
    occurredAt: string;
    attributes: Record<string, string>;
}

/** Ramka z `/topic/studio.{studioId}.metrics` oraz ze strumienia SSE. */
export interface LiveMetricsFrame {
    kind: 'BUSINESS_EVENT' | 'HEARTBEAT';
    event?: BusinessEventDto;
    timestamp: string;
}

export interface SeriesPoint {
    /** Początek kubełka, ISO-8601. */
    at: string;
    count: number;
}

export interface SeriesDescriptor {
    series: SeriesName;
    type: BusinessEventType;
    label: string;
    dimension: string | null;
    dimensionValue: string | null;
}

export interface SeriesStats {
    series: SeriesName;
    total: number;
    today: number;
    lastHour: number;
    last15Minutes: number;
    lastEventAt: string | null;
}

export interface LiveMetricsOverview {
    scope: string;
    tenantId: string | null;
    /** Strefa kubełkowania po stronie serwera, np. `Europe/Warsaw`. */
    zone: string;
    generatedAt: string;
    descriptors: SeriesDescriptor[];
    stats: SeriesStats[];
    /** 60 punktów minutowych. */
    lastHourByMinute: Record<SeriesName, SeriesPoint[]>;
    /** 24 punkty godzinowe. */
    last24hByHour: Record<SeriesName, SeriesPoint[]>;
    /** 30 punktów dziennych. */
    last30dByDay: Record<SeriesName, SeriesPoint[]>;
    /** 24 liczby (0–23) z ostatnich 7 dni, per seria bazowa. */
    hourOfDayProfile7d: Record<SeriesName, number[]>;
    recentEvents: BusinessEventDto[];
}

export interface SeriesResponse {
    scope: string;
    series: SeriesName;
    bucket: BucketSize;
    from: string;
    to: string;
    points: SeriesPoint[];
}

export interface HourProfileResponse {
    scope: string;
    series: SeriesName;
    days: number;
    zone: string;
    counts: number[];
}

export type BucketSize = 'minute' | 'hour' | 'day';

/** Okno czasowe wykresu. Każde ma gotowy kubełek w odpowiedzi `/overview`. */
export type RangeKey = 'minute' | 'hour' | 'day';
