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
import type { LeadAnalytics, LeadFact } from '../../types';

const isoDay = (base: Date, offsetDays: number): string => {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * [won, open, silent, lost, created, winRate] dla ośmiu kolejnych tygodni.
 *
 * Rozmowy „w grze" pojawiają się WYŁĄCZNIE w dwóch ostatnich tygodniach, bo tyle
 * realnie trwa decyzja o detailingu: kto pyta o mycie, decyduje w dzień, kto
 * o powłokę — po obejrzeniu auta i jednej rozmowie o cenie. Otwarte zapytanie
 * sprzed miesiąca nie jest pipeline'em, tylko czymś, czego nikt nie zamknął;
 * w starszych tygodniach stoi więc w kolumnie „ucichło", i to w małych kwotach,
 * bo to ma być wyjątek, a nie reguła.
 */
const WEEKS: [number, number, number, number, number, number | null][] = [
    [820000, 0, 190000, 1960000, 11, 0.42],
    [1460000, 0, 0, 1180000, 14, 0.58],
    [640000, 0, 320000, 2340000, 9, 0.31],
    [2180000, 0, 0, 1420000, 16, 0.63],
    [1290000, 0, 240000, 2870000, 12, 0.44],
    [2740000, 0, 0, 1060000, 18, 0.72],
    [1930000, 0, 0, 1120000, 15, 0.57],
    [1520000, 0, 0, 480000, 13, 0.61],
];

/**
 * Pieniądze wciąż w grze, doklejane do DWÓCH OSTATNICH tygodni wybranego zakresu —
 * bez względu na to, ile ich w nim jest.
 *
 * Wpisanie ich na sztywno w ostatnie wiersze tablicy wywracało się przy krótszym
 * zakresie: miesięczny wykres brał cztery pierwsze tygodnie i nie miał ani złotówki
 * w grze, co jest odwrotnością prawdy — w grze są zawsze te najświeższe rozmowy.
 */
const OPEN_TAIL: [number, number] = [1840000, 4260000];

// Posortowane jak z backendu: od tych, w których wygrywamy najczęściej.
const DEMO_CATEGORIES = [
    { code: 'cer', label: 'Powłoka ceramiczna', count: 24, completed: 15, lost: 5, conversionRate: 0.75 },
    { code: 'ppf', label: 'Folia ochronna PPF', count: 13, completed: 5, lost: 4, conversionRate: 0.56 },
    { code: 'kor', label: 'Korekta lakieru', count: 21, completed: 9, lost: 8, conversionRate: 0.53 },
    { code: 'myc', label: 'Mycie i pielęgnacja', count: 28, completed: 8, lost: 14, conversionRate: 0.36 },
    { code: 'wnt', label: 'Detailing wnętrza', count: 22, completed: 6, lost: 12, conversionRate: 0.33 },
];

/*
 * Dwie osie pojazdu. Premium wygrywa najczęściej nie dlatego, że klienci
 * są bogatsi, tylko dlatego, że przychodzą po konkretną usługę i porównują
 * ją z ceną serwisu autoryzowanego — a nie z myjnią za rogiem. Budżetowe
 * przegrywają na cenie i to jest normalne, nie do naprawienia.
 */
const DEMO_MARKET_TIERS = [
    { code: 'PREMIUM', label: 'Premium', count: 38, won: 21, lost: 8, winRate: 0.72, averageValue: 486000 },
    { code: 'LUXURY', label: 'Luksusowe', count: 6, won: 3, lost: 2, winRate: 0.60, averageValue: 1240000 },
    { code: 'MAINSTREAM', label: 'Popularne', count: 48, won: 17, lost: 19, winRate: 0.47, averageValue: 172000 },
    { code: 'BUDGET', label: 'Budżetowe', count: 16, won: 3, lost: 11, winRate: 0.21, averageValue: 68000 },
];
const DEMO_SIZE_SEGMENTS = [
    { code: 'SPORT', label: 'Sportowe', count: 7, won: 4, lost: 1, winRate: 0.80, averageValue: 892000 },
    { code: 'SUV', label: 'SUV / crossover', count: 31, won: 15, lost: 7, winRate: 0.68, averageValue: 412000 },
    { code: 'E', label: 'Klasa wyższa (E)', count: 14, won: 6, lost: 4, winRate: 0.60, averageValue: 524000 },
    { code: 'D', label: 'Klasa średnia (D)', count: 26, won: 10, lost: 9, winRate: 0.53, averageValue: 248000 },
    { code: 'C', label: 'Kompakt (C)', count: 22, won: 7, lost: 12, winRate: 0.37, averageValue: 138000 },
    { code: 'B', label: 'Małe (B)', count: 8, won: 2, lost: 5, winRate: 0.29, averageValue: 74000 },
];

/**
 * Surowe fakty do przekrojowego filtrowania „usługa × segment auta" w trybie
 * pokazowym — ten sam kształt, jaki oddaje backend.
 *
 * Rozłożone cyklicznie po usługach i segmentach, z jednym świadomym wyjątkiem:
 * w segmencie Premium × Sportowe wygrane są przycięte, a w Premium × SUV
 * podbite. To jest dokładnie ta historia, po którą sięga się po filtr —
 * „wygrywamy w premium, ale głównie w SUV-ach, nie w sportowych" — a bez niej
 * przykład nie pokazywałby, po co w ogóle filtrować.
 */
// Średnia wycena usługi — te same liczby co w weekdayMatrix poniżej, żeby
// przefiltrowany przekrój w trybie pokazowym trzymał się tej samej ceny.
const DEMO_CATEGORY_VALUE: Record<string, number> = {
    ppf: 984000,
    cer: 421000,
    kor: 186000,
    myc: 34000,
    wnt: 61000,
};

const buildDemoLeadFacts = (): LeadFact[] => {
    const sizeCodes = DEMO_SIZE_SEGMENTS.map((s) => s.code);
    const tierCodes = DEMO_MARKET_TIERS.map((t) => t.code);
    const facts: LeadFact[] = [];
    let sizeCursor = 0;
    let tierCursor = 0;

    DEMO_CATEGORIES.forEach((category) => {
        const open = Math.max(0, category.count - category.completed - category.lost);
        const outcomes: Array<'won' | 'lost' | 'open'> = [
            ...Array(category.completed).fill('won' as const),
            ...Array(category.lost).fill('lost' as const),
            ...Array(open).fill('open' as const),
        ];
        outcomes.forEach((outcome) => {
            facts.push({
                categories: [category.code],
                sizeSegment: sizeCodes[sizeCursor % sizeCodes.length],
                marketTier: tierCodes[tierCursor % tierCodes.length],
                won: outcome === 'won',
                lost: outcome === 'lost',
                value: DEMO_CATEGORY_VALUE[category.code] ?? 0,
            });
            sizeCursor += 1;
            tierCursor += 3;
        });
    });

    facts.forEach((fact, index) => {
        if (fact.marketTier === 'PREMIUM' && fact.sizeSegment === 'SPORT' && fact.won && index % 2 === 0) {
            fact.won = false;
            fact.lost = true;
        }
        if (fact.marketTier === 'PREMIUM' && fact.sizeSegment === 'SUV' && fact.lost && index % 3 === 0) {
            fact.lost = false;
            fact.won = true;
        }
    });

    return facts;
};

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
    const timeline = weeks.map(([wonValue, , silentValue, lostValue, created, winRate], index) => ({
        periodStart: isoDay(from, index * 7),
        created,
        won: Math.round(created * (winRate ?? 0) * 0.6),
        lost: Math.round(created * (1 - (winRate ?? 0)) * 0.5),
        winRate,
        wonValue,
        openValue: index === weeks.length - 1
            ? OPEN_TAIL[1]
            : index === weeks.length - 2 ? OPEN_TAIL[0] : 0,
        silentValue,
        lostValue,
    }));

    return {
        from: from.toISOString(),
        to: to.toISOString(),
        totalCreated: 108,
        byStatus: { NEW: 9, IN_PROGRESS: 14, CONFIRMED: 7, COMPLETED: 41, LOST: 31, NO_SHOW: 6 },
        conversionRate: 0.53,

        wonValue: 12580000,
        lostValue: 12430000,
        // Tylko dwa ostatnie tygodnie: dłużej otwarte rozmowy stoją w „ucichło".
        pipelineValue: 6100000,
        silentValue: 750000,
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
            { code: 'TOO_EXPENSIVE', label: 'Za drogo', value: 4180000, count: 11 },
            { code: 'NO_REPLY', label: 'Nikt nie odpisał', value: 2960000, count: 6 },
            { code: 'NO_AVAILABILITY', label: 'Brak wolnego terminu', value: 2310000, count: 5 },
            { code: 'CHOSE_COMPETITOR', label: 'Wybrał konkurencję', value: 1240000, count: 4 },
            { code: 'SILENT', label: 'Rozmowa ucichła', value: 750000, count: 3 },
            { code: 'TOO_FAR', label: 'Za daleko od studia', value: 620000, count: 3 },
            { code: 'UNKNOWN', label: 'Bez podanego powodu', value: 380000, count: 2 },
        ],

        // Posortowane jak z backendu: od tych, w których wygrywamy najczęściej.
        categories: DEMO_CATEGORIES,

        lostReasons: [
            { code: 'TOO_EXPENSIVE', label: 'Za drogo', count: 11, share: 0.35 },
            { code: 'NO_RESPONSE', label: 'Klient przestał odpowiadać', count: 7, share: 0.23 },
            { code: 'NO_AVAILABILITY', label: 'Brak wolnego terminu', count: 5, share: 0.16 },
            { code: 'CHOSE_COMPETITOR', label: 'Wybrał konkurencję', count: 4, share: 0.13 },
            { code: 'TOO_FAR', label: 'Za daleko od studia', count: 3, share: 0.10 },
            { code: 'OTHER', label: 'Inny powód', count: 1, share: 0.03 },
        ],

        medianFirstResponseMinutes: 143,
        medianDaysToDecision: 4,

        inquiriesByWeekday: [22, 17, 15, 18, 20, 12, 4].map((count, index) => ({ weekday: index + 1, count })),
        decisionsByWeekday: [5, 8, 6, 12, 9, 3, 1].map((count, index) => ({ weekday: index + 1, count })),
        inquiriesByMonthDay: Array.from({ length: 31 }, (_, index) => ({ day: index + 1, count: 0 })),

        /*
         * Rytm tygodnia odwzorowuje sposób, w jaki ludzie realnie planują:
         *
         * • FOLIA PPF i POWŁOKA CERAMICZNA — piątek i sobota. To decyzja na kilka
         *   tysięcy, przy nowym aucie, podejmowana wtedy, gdy właściciel ma czas
         *   usiąść, przeczytać wycenę i pogadać. W środku tygodnia takich rozmów
         *   po prostu nie ma kto prowadzić.
         * • KOREKTA LAKIERU — rozłożona równo. Bierze się z niezadowolenia ze stanu
         *   lakieru, a to nie ma dnia tygodnia; człowiek pisze wtedy, kiedy zauważy.
         * • DETAILING WNĘTRZA — poniedziałek i wtorek. Bezpośrednia konsekwencja
         *   weekendu: dzieci, pies, wyjazd, rozlana kawa w niedzielę.
         * • MYCIE I PIELĘGNACJA — poniedziałek oraz czwartek/piątek. Dwie różne
         *   sprawy: sprzątanie po weekendzie i przygotowanie auta na nadchodzący.
         *
         * Efekt uboczny jest tu treścią: przekątna od lewego dołu do prawej góry.
         * Tanie usługi na początku tygodnia, drogie pod weekend.
         */
        weekdayMatrix: [
            { code: 'ppf', label: 'Folia ochronna PPF', averageValue: 984000, counts: [0, 1, 1, 2, 4, 5, 0], total: 13 },
            { code: 'cer', label: 'Powłoka ceramiczna', averageValue: 421000, counts: [1, 2, 2, 4, 7, 7, 1], total: 24 },
            { code: 'kor', label: 'Korekta lakieru', averageValue: 186000, counts: [3, 3, 3, 4, 3, 4, 1], total: 21 },
            { code: 'myc', label: 'Mycie i pielęgnacja', averageValue: 34000, counts: [8, 3, 2, 6, 7, 2, 0], total: 28 },
            { code: 'wnt', label: 'Detailing wnętrza', averageValue: 61000, counts: [8, 6, 3, 2, 2, 1, 0], total: 22 },
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

        // Dwie osie pojazdu — patrz komentarz przy DEMO_MARKET_TIERS / DEMO_SIZE_SEGMENTS.
        byMarketTier: DEMO_MARKET_TIERS,
        bySizeSegment: DEMO_SIZE_SEGMENTS,
        // Surowe fakty pod filtr karty „Usługi" — patrz buildDemoLeadFacts.
        leadFacts: buildDemoLeadFacts(),

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
