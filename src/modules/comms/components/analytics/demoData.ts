// src/modules/comms/components/analytics/demoData.ts
// Przykładowe dane pokazowe dla pustej analityki.
//
// Studio, które dopiero zaczyna, widzi tu same komunikaty „za mało danych" i nie
// ma jak się dowiedzieć, po co w ogóle ma zbierać leady — a to jest dokładnie ten
// moment, w którym warto mu to pokazać. Pusty ekran uczy, że tu nic nie ma;
// wypełniony przykładem uczy, co tu będzie.
//
// Liczby są zmyślone, ale nie losowe: odpowiadają realnemu studiu detailingowemu
// przy sześćdziesięciu kilku zapytaniach miesięcznie, z rozrzutem cen od mycia za
// niecałe trzysta złotych po folię PPF za blisko dziesięć tysięcy. Dane, które nie
// trzymają się prawdopodobieństwa, uczą fałszywych odruchów — właściciel zobaczyłby
// skuteczność 90% i uznał swoją realną za porażkę.
//
// Wszystko jest deterministyczne i wyliczone z podanej daty, bez sięgania po zegar:
// funkcja czysta daje się przetestować, a widok nie zmienia się przy każdym
// przerysowaniu.
import type { LeadAnalytics } from '../../types';

const isoDay = (base: Date, offsetDays: number): string => {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** [won, open, lost, created, winRate] dla ośmiu kolejnych tygodni. */
const WEEKS: [number, number, number, number, number | null][] = [
    [820000, 1240000, 1960000, 11, 0.42],
    [1460000, 980000, 1180000, 14, 0.58],
    [640000, 1720000, 2340000, 9, 0.31],
    [2180000, 1130000, 1420000, 16, 0.63],
    [1290000, 1640000, 2870000, 12, 0.44],
    [2740000, 890000, 1060000, 18, 0.72],
    [1930000, 2310000, 1480000, 15, 0.57],
    [1520000, 3180000, 940000, 13, 0.61],
];

/**
 * Pełny komplet danych analitycznych do trybu pokazowego.
 *
 * Oś czasu układa się na wybranym okresie, żeby podpisy pod wykresem zgadzały się
 * z zakresem widocznym w nagłówku strony — przykład z datami sprzed roku albo
 * wychodzącymi poza wybrany miesiąc wyglądałby na zepsuty, a nie na przykład.
 * Stąd przycięcie liczby tygodni do długości okresu, z dolną granicą czterech:
 * krócej nie ma czego nazywać trendem.
 */
export const buildDemoAnalytics = (from: Date, to: Date): LeadAnalytics => {
    const weeksInPeriod = Math.floor((to.getTime() - from.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
    const weeks = WEEKS.slice(0, Math.min(WEEKS.length, Math.max(4, weeksInPeriod)));
    const timeline = weeks.map(([wonValue, openValue, lostValue, created, winRate], index) => ({
        periodStart: isoDay(from, index * 7),
        created,
        won: Math.round(created * (winRate ?? 0) * 0.6),
        lost: Math.round(created * (1 - (winRate ?? 0)) * 0.5),
        winRate,
        wonValue,
        openValue,
        lostValue,
    }));

    return {
        from: from.toISOString(),
        to: to.toISOString(),
        totalCreated: 108,
        byStatus: { NEW: 9, IN_PROGRESS: 14, CONFIRMED: 7, COMPLETED: 41, LOST: 31, NO_SHOW: 6 },
        conversionRate: 0.53,

        wonValue: 12580000,
        lostValue: 13250000,
        pipelineValue: 13090000,
        wonValuePrevious: 10940000,
        confirmedValueThisWeek: 486000,

        awaiting: {
            value: 5240000,
            count: 9,
            oldest: {
                leadId: 'demo',
                name: 'Marek Kowalczyk',
                vehicle: 'Porsche Cayenne',
                value: 984000,
                waitingDays: 6,
            },
        },

        // Największa pozycja to cena, ale zaraz za nią cisza — i to ona jest tu
        // pointą przykładu: da się ją naprawić w tym tygodniu i za zero złotych.
        leaks: [
            { code: 'PRICE', label: 'Za drogo', value: 5820000, count: 12 },
            { code: 'NO_REPLY', label: 'Nikt nie odpisał', value: 3960000, count: 8 },
            { code: 'SLOT', label: 'Brak terminu', value: 2310000, count: 6 },
            { code: 'UNKNOWN', label: 'Bez podanego powodu', value: 1160000, count: 5 },
        ],

        categories: [
            { code: 'ppf', label: 'Folia ochronna PPF', count: 13, completed: 5, lost: 4, conversionRate: 0.56 },
            { code: 'cer', label: 'Powłoka ceramiczna', count: 24, completed: 15, lost: 5, conversionRate: 0.75 },
            { code: 'kor', label: 'Korekta lakieru', count: 21, completed: 9, lost: 8, conversionRate: 0.53 },
            { code: 'tap', label: 'Pranie tapicerki', count: 22, completed: 6, lost: 12, conversionRate: 0.33 },
            { code: 'myc', label: 'Mycie detailingowe', count: 28, completed: 8, lost: 14, conversionRate: 0.36 },
        ],

        lostReasons: [
            { code: 'PRICE', label: 'Za drogo', count: 12, share: 0.39 },
            { code: 'NO_REPLY', label: 'Nikt nie odpisał', count: 8, share: 0.26 },
            { code: 'SLOT', label: 'Brak terminu', count: 6, share: 0.19 },
            { code: 'OTHER', label: 'Inny powód', count: 5, share: 0.16 },
        ],

        medianFirstResponseMinutes: 143,
        medianDaysToDecision: 4,

        inquiriesByWeekday: [22, 17, 15, 18, 20, 12, 4].map((count, index) => ({ weekday: index + 1, count })),
        decisionsByWeekday: [5, 8, 6, 12, 9, 3, 1].map((count, index) => ({ weekday: index + 1, count })),
        inquiriesByMonthDay: Array.from({ length: 31 }, (_, index) => ({ day: index + 1, count: 0 })),

        // Przekątna od lewego dołu do prawej góry: tanie w poniedziałki, drogie
        // w soboty. To jest ten odczyt, dla którego macierz w ogóle istnieje.
        weekdayMatrix: [
            { code: 'ppf', label: 'Folia ochronna PPF', averageValue: 984000, counts: [0, 1, 0, 2, 3, 6, 1], total: 13 },
            { code: 'cer', label: 'Powłoka ceramiczna', averageValue: 421000, counts: [1, 2, 2, 4, 5, 8, 2], total: 24 },
            { code: 'kor', label: 'Korekta lakieru', averageValue: 186000, counts: [4, 4, 3, 3, 3, 3, 1], total: 21 },
            { code: 'tap', label: 'Pranie tapicerki', averageValue: 61000, counts: [7, 5, 4, 3, 2, 1, 0], total: 22 },
            { code: 'myc', label: 'Mycie detailingowe', averageValue: 28000, counts: [10, 7, 6, 3, 2, 0, 0], total: 28 },
        ],

        responseImpact: {
            buckets: [
                { key: 'UNDER_1H', count: 24, won: 17, closed: 21, winRate: 0.81 },
                { key: 'UNDER_4H', count: 19, won: 11, closed: 17, winRate: 0.65 },
                { key: 'UNDER_24H', count: 22, won: 10, closed: 19, winRate: 0.53 },
                { key: 'OVER_24H', count: 17, won: 4, closed: 15, winRate: 0.27 },
                { key: 'NO_REPLY', count: 8, won: 0, closed: 8, winRate: 0 },
            ],
            verdict: 'FASTER_WINS',
            fastWinRate: 0.67,
            slowWinRate: 0.17,
        },

        vehicleOutliers: [
            { label: 'Porsche', count: 9, won: 6, closed: 7, winRate: 0.86, direction: 'ABOVE' },
            { label: 'Toyota', count: 11, won: 2, closed: 9, winRate: 0.22, direction: 'BELOW' },
        ],

        timeline,

        bySource: [
            { source: 'PHONE', count: 38, won: 21, closed: 31, winRate: 0.68 },
            { source: 'EMAIL', count: 41, won: 16, closed: 34, winRate: 0.47 },
            { source: 'FORM', count: 24, won: 5, closed: 19, winRate: 0.26 },
            { source: 'MANUAL', count: 5, won: 2, closed: 4, winRate: 0.5 },
        ],
    };
};
