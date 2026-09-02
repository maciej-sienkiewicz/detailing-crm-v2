// src/modules/live-metrics/components/liveMetricsTheme.ts
// Paleta i etykiety serii. Kolor jest przypisany do BYTU (typ zdarzenia / wartość
// wymiaru), nie do pozycji na wykresie — filtr, który zmienia liczbę serii, nie ma
// prawa przemalować tych, które zostały.

import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { BusinessEventType, SeriesName } from '../types';

/** Hue rozdzielone tak, by sąsiadujące serie dały się odróżnić także na stosie. */
const HUE = {
    blue: st.accentBlue,      // #3B82F6
    green: st.accentGreen,    // #10B981
    amber: st.accentAmber,    // #F59E0B
    violet: '#8B5CF6',
    pink: '#EC4899',
    teal: '#14B8A6',
    slate: '#64748B',
} as const;

interface SeriesMeta {
    label: string;
    color: string;
}

/**
 * Etykieta i kolor dla każdej serii, jaką backend może wystawić.
 * Serie bazowe niosą kolor obszaru; pod-serie mają własne, bo pojawiają się razem
 * na jednym stosie i muszą być rozróżnialne.
 */
export const SERIES_META: Record<SeriesName, SeriesMeta> = {
    RESERVATION_CREATED: { label: 'Rezerwacje', color: HUE.blue },

    VISIT_CREATED: { label: 'Wizyty', color: HUE.amber },
    'VISIT_CREATED:FROM_RESERVATION': { label: 'Z rezerwacji', color: HUE.green },
    'VISIT_CREATED:DIRECT': { label: 'Bezpośrednie', color: HUE.amber },

    SERVICE_CREATED: { label: 'Nowe usługi', color: HUE.violet },
    'SERVICE_CREATED:SERVICE': { label: 'Usługi', color: HUE.violet },
    'SERVICE_CREATED:PACKAGE': { label: 'Pakiety', color: HUE.teal },

    PHOTO_UPLOADED: { label: 'Zdjęcia', color: HUE.teal },
    'PHOTO_UPLOADED:VISIT': { label: 'Wizyta', color: HUE.green },
    'PHOTO_UPLOADED:VEHICLE': { label: 'Pojazd', color: HUE.blue },
    'PHOTO_UPLOADED:CHECKIN': { label: 'Check-in QR', color: HUE.amber },
    'PHOTO_UPLOADED:BATCH_ORDER': { label: 'Zlecenie zbiorcze', color: HUE.slate },

    ACTIVITY_LOGGED: { label: 'Aktywność', color: HUE.pink },
};

const FALLBACK: SeriesMeta = { label: 'Inne', color: HUE.slate };

export const seriesMeta = (series: SeriesName): SeriesMeta => SERIES_META[series] ?? FALLBACK;
export const seriesLabel = (series: SeriesName): string => seriesMeta(series).label;
export const seriesColor = (series: SeriesName): string => seriesMeta(series).color;

/** Kolejność kafli KPI — ta sama, w której backend wylicza typy. */
export const KPI_ORDER: BusinessEventType[] = [
    'RESERVATION_CREATED',
    'VISIT_CREATED',
    'SERVICE_CREATED',
    'PHOTO_UPLOADED',
    'ACTIVITY_LOGGED',
];

/** Ludzkie nazwy atrybutów zdarzenia pokazywanych w strumieniu na żywo. */
export const ATTRIBUTE_LABELS: Record<string, string> = {
    appointmentId: 'rezerwacja',
    visitId: 'wizyta',
    serviceId: 'usługa',
    vehicleId: 'pojazd',
    photoId: 'zdjęcie',
    checkinId: 'check-in',
    entryId: 'pozycja',
    recurrenceSeriesId: 'seria',
    name: 'nazwa',
    module: 'moduł',
    action: 'akcja',
    startDateTime: 'termin',
};
