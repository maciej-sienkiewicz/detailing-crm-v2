// src/modules/statistics/api/delayStatsApi.ts
import type { DelayStats, Granularity } from '../types';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DELAY_STATS: DelayStats = {
    period: {
        granularity: 'MONTHLY',
        startDate: '2025-03-01',
        endDate: '2026-03-30',
    },
    overview: {
        avgDelayDays: 2.4,
        medianDelayDays: 1.8,
        visitsWithDelay: 47,
        totalVisitsCompleted: 184,
        delayRatePct: 25.5,
        onTimeRatePct: 74.5,
        trend: [
            { period: 'Mar 25', avgDelayDays: 3.2, visitCount: 14, delayedCount: 5 },
            { period: 'Kwi 25', avgDelayDays: 2.8, visitCount: 16, delayedCount: 5 },
            { period: 'Maj 25', avgDelayDays: 3.5, visitCount: 18, delayedCount: 7 },
            { period: 'Cze 25', avgDelayDays: 2.1, visitCount: 15, delayedCount: 4 },
            { period: 'Lip 25', avgDelayDays: 1.6, visitCount: 13, delayedCount: 3 },
            { period: 'Sie 25', avgDelayDays: 1.9, visitCount: 17, delayedCount: 4 },
            { period: 'Wrz 25', avgDelayDays: 2.3, visitCount: 16, delayedCount: 4 },
            { period: 'Paź 25', avgDelayDays: 2.7, visitCount: 19, delayedCount: 5 },
            { period: 'Lis 25', avgDelayDays: 3.1, visitCount: 14, delayedCount: 4 },
            { period: 'Gru 25', avgDelayDays: 4.2, visitCount: 11, delayedCount: 4 },
            { period: 'Sty 26', avgDelayDays: 1.8, visitCount: 16, delayedCount: 3 },
            { period: 'Lut 26', avgDelayDays: 1.3, visitCount: 15, delayedCount: 2 },
            { period: 'Mar 26', avgDelayDays: 0.9, visitCount: 10, delayedCount: 2 },
        ],
    },
    services: [
        {
            serviceId: 's1',
            serviceName: 'Powłoka ceramiczna',
            isActive: true,
            occurrences: 19,
            totalOccurrences: 38,
            avgDelayDays: 3.6,
            delayRatePct: 50.0,
        },
        {
            serviceId: 's2',
            serviceName: 'Korekta lakieru 2-etapowa',
            isActive: true,
            occurrences: 14,
            totalOccurrences: 27,
            avgDelayDays: 2.9,
            delayRatePct: 51.9,
        },
        {
            serviceId: 's3',
            serviceName: 'Folia ochronna PPF – maska',
            isActive: true,
            occurrences: 11,
            totalOccurrences: 22,
            avgDelayDays: 4.1,
            delayRatePct: 50.0,
        },
        {
            serviceId: 's4',
            serviceName: 'Detailing wnętrza – pełny',
            isActive: true,
            occurrences: 8,
            totalOccurrences: 41,
            avgDelayDays: 1.2,
            delayRatePct: 19.5,
        },
        {
            serviceId: 's5',
            serviceName: 'Pranie tapicerki skórzanej',
            isActive: true,
            occurrences: 7,
            totalOccurrences: 35,
            avgDelayDays: 0.9,
            delayRatePct: 20.0,
        },
        {
            serviceId: 's6',
            serviceName: 'Mycie + wosk ręczny',
            isActive: true,
            occurrences: 5,
            totalOccurrences: 68,
            avgDelayDays: 0.4,
            delayRatePct: 7.4,
        },
        {
            serviceId: 's7',
            serviceName: 'Ozonowanie wnętrza',
            isActive: true,
            occurrences: 4,
            totalOccurrences: 29,
            avgDelayDays: 0.6,
            delayRatePct: 13.8,
        },
        {
            serviceId: 's8',
            serviceName: 'Impregnacja dachówki/kabrioletu',
            isActive: false,
            occurrences: 3,
            totalOccurrences: 9,
            avgDelayDays: 2.2,
            delayRatePct: 33.3,
        },
    ],
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const delayStatsApi = {
    // TODO: replace with real endpoint when backend is ready:
    //   GET /v1/statistics/delays?granularity=&startDate=&endDate=
    getDelayStats: async (
        _granularity: Granularity,
        _startDate: string,
        _endDate: string
    ): Promise<DelayStats> => {
        // Simulate network latency
        await new Promise(r => setTimeout(r, 500));
        return MOCK_DELAY_STATS;
    },
};
