// src/modules/comms/components/analytics/tokens.ts
// Formatowanie liczb widoku „Pieniądze w zapytaniach".
//
// Kolory i etykiety dawnych wykresów (kanały, segmenty aut, dni tygodnia) zniknęły razem
// z nimi - widok pokazuje dziś lejek, dwa wiersze i słupki roku.

/** „35 min", „4 godz.", „2 dni" - jednostka dobrana do rzędu wielkości. */
export const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return '-';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 24 * 60) return `${Math.round(minutes / 60)} godz.`;
    const days = Math.round(minutes / (24 * 60));
    return days === 1 ? '1 dzień' : `${days} dni`;
};

export { formatMoney } from '../shared';
