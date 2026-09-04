// src/modules/comms/views/LeadAnalyticsView.tsx
// Analityka leadów jako rachunek pieniędzy, nie jako raport ze wskaźnikami.
//
// ── Dlaczego nie ma tu ani jednego procentu na pierwszym ekranie ────────────
//
// Właściciel studia myśli w złotówkach. Procent wymaga tłumaczenia na pieniądze,
// zanim cokolwiek znaczy, i nie ma skali odniesienia: „skuteczność 41%" to ocena
// szkolna bez kryteriów. Przy rozrzucie wartości zleceń od czterystu złotych do
// dwunastu tysięcy procent dodatkowo kłamie - miesiąc z dziesięcioma przegranymi
// praniami tapicerki i jedną wygraną powłoką ceramiczną to dziewięć procent
// konwersji i bardzo dobry miesiąc.
//
// ── Cztery pasma i koniec ──────────────────────────────────────────────────
//
// 1. Zdanie-bohater: ile pieniędzy czeka na Twoją odpowiedź. Pierwsza fiksacja
//    wzroku ustawia ramę dla reszty ekranu - liczba PRZESZŁA robi z tego raport,
//    liczba OTWARTA robi z tego warsztat. Tylko drugie ma powód, żeby wracać.
// 2. Rachunek zapytań: jedna belka pieniędzy, które przeszły przez drzwi.
// 3. Gdzie wyciekły: powody straty w złotówkach, każdy klikalny.
// 4. Czytanie tygodniowe: rytm, odstępstwa, usługi, kanały - cicho, poniżej zgięcia.
//
// Ekran się KOŃCZY. Żadnego nieskończonego strumienia kart: taki, który ma koniec,
// zostaje przeczytany, a taki bez końca zostaje przewinięty.
//
// ── Reguły dołożone przy przeprojektowaniu ─────────────────────────────────
//
//  8. Jedna karta = jedno pytanie = jedna odpowiedź zdaniem. Karta bez zdania
//     jest surowcem, nie produktem - analizę zostawia czytelnikowi.
//  9. Prawo Millera: najwyżej 3–4 obiekty do porównania naraz. Sześć wykresów
//     obok siebie to nie wybór, tylko paraliż - dlatego materiał pogłębiony
//     idzie zakładkami, po jednym pytaniu na ekran.
// 10. Prawo bliskości rządzi kartami: odstęp MIĘDZY grupami wyraźnie większy
//     niż wewnątrz grupy, inaczej wszystko czyta się jako jedna ściana.
// 11. Karta niesie głębię. Biel z ramką = powierzchnia robocza, tło strony =
//     kontekst. Treść położona wprost na teksturze tła nie ma ani jednego,
//     ani drugiego - i męczy przy pierwszym akapicie.
// 12. Okres jest właściwością widoku, nie sekcją w nim. Miejsce ma w nagłówku,
//     obok tytułu, a nie jako pasek, który zabiera pierwszy ruch wzroku kwocie.
// 13. Zakresy nazywają się tak, jak nazywa je użytkownik. „Ostatnie 90 dni" nie
//     odpowiada żadnemu wydarzeniu w roku właściciela firmy; miesiąc odpowiada
//     każdemu - księgowa, podatek, pensje i ZUS chodzą w tym rytmie.
// 14. Ruch tylko jako informacja: wejście karty tak, tańczący wykres nie.
//
// ── Czego tu świadomie nie ma ──────────────────────────────────────────────
//
// • Rzędu sześciu kafli o równej wadze. Jeśli wszystko jest wyróżnione, nic nie
//   jest - a ikonka w kolorowym kółku pod pastelowym gradientem to dekoracja
//   niosąca zero informacji.
// • Liczby zapytań jako metryki. To wejście, nie wyjście, i wejście, na które
//   z tego ekranu nie ma wpływu. Rośnie niezależnie od pieniędzy, a studio jest
//   ograniczone mocą przerobową, nie popytem: więcej zapytań bez większej mocy
//   to więcej odmów, nie większy przychód.
// • Rozkładu zapytań na dni miesiąca. Nie istnieje mechanizm, przez który trzeci
//   dzień miesiąca miałby generować zapytania; przy tym wolumenie był to wykres
//   szumu z podpisem sugerującym prawidłowość.
// • Lejka sześciu statusów, wykresów kołowych, prognoz.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics } from '../types';
import { EmptyHint, PrimaryButton } from '../components/shared';
import { PeriodPicker } from '../components/analytics/PeriodPicker';
import { buildPeriod, type Period } from '../components/analytics/period';
import { buildDemoAnalytics } from '../components/analytics/demoData';
import { Hero, LeakList, MoneyLedger } from '../components/analytics/money';
import {
    AnalyticsCard,
    ColumnChart,
    EmptyChart,
    MoneyColumns,
    MoneyLegend,
    RankedBars,
    RateLine,
    WeekdayMatrix,
    WinLossBars,
    WinLossLegend,
} from '../components/analytics/charts';
import {
    MARKET_TIER_HINTS,
    RESPONSE_LABELS,
    SIZE_SEGMENT_HINTS,
    SOURCE_LABELS,
    WEEKDAY_FULL,
    WEEKDAY_LABELS,
    formatMoney,
    formatPeriod,
    formatPeriodTick,
    percent,
    points,
} from '../components/analytics/tokens';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

/**
 * Pasmo pogłębione - nagłówek sekcji, który mówi, że tu kończy się „dziś",
 * a zaczyna „przy okazji". Odstęp nad nim jest wyraźnie większy niż odstępy
 * między kartami wyżej: prawo bliskości robi z tego osobną grupę bez rysowania
 * ani jednej kreski więcej.
 */
/**
 * Pusta analityka nie kończy się na „wróć tu potem".
 *
 * Studio, które dopiero zaczyna, widzi tu same komunikaty o braku danych i nie ma
 * jak się dowiedzieć, po co w ogóle ma zbierać leady - a to jest dokładnie ten
 * moment, w którym warto mu to pokazać. Pusty ekran uczy, że tu nic nie ma;
 * wypełniony przykładem uczy, co tu będzie, gdy zapytania zaczną spływać.
 */
const EmptyCard = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;

    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${st.text};
    }
    p {
        margin: 0;
        font-size: 14px;
        line-height: 1.55;
        color: ${st.textSecondary};
        max-width: 58ch;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 28px 18px;
    }
`;

/** Zaproszenie do trybu pokazowego przy szczupłych, ale prawdziwych danych. */
const ThinDataBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: ${st.radius};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    font-size: 13px;
    color: ${st.textSecondary};

    .grow { flex: 1; min-width: 200px; }
`;

/**
 * Pasek trybu pokazowego. Widoczny przez cały czas jego trwania i utrzymany
 * w tonie ostrzeżenia, bo jedynym realnym niebezpieczeństwem tej funkcji jest
 * pomylenie przykładu z własnym wynikiem. Przycisk wyjścia stoi w tym samym
 * pasku: droga powrotna ma być tam, gdzie informacja o tym, że się w czymś jest.
 */
const DemoBanner = styled.div`
    position: sticky;
    top: 8px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: ${st.radius};
    background: ${p => p.theme.colors.warningLight};
    border: 1px solid ${p => p.theme.colors.warning}55;
    box-shadow: ${st.shadowSm};
    font-size: 13px;
    color: #92400e;

    svg { width: 16px; height: 16px; flex-shrink: 0; }
    .grow { flex: 1; min-width: 180px; }
    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

const DemoButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.text};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 9px 16px;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    white-space: nowrap;
    transition: all 160ms ease;

    svg { width: 15px; height: 15px; }
    &:hover { border-color: ${st.borderHover}; box-shadow: ${st.shadowSm}; }
`;

const DeepHeading = styled.div`
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    h2 {
        margin: 0;
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${st.text};
    }
    p {
        margin: 0;
        font-size: 13px;
        color: ${st.textMuted};
    }
`;

/**
 * Zakładki zamiast siatki kart.
 *
 * Sześć wykresów obok siebie nie jest wyborem, tylko paraliżem: wzrok nie ma
 * gdzie usiąść, bo nic nie jest ważniejsze od reszty. Jedno pytanie na ekran
 * przywraca zasadę „jeden dominujący element", a nic nie ginie - wszystko jest
 * o jedno kliknięcie dalej i podpisane pytaniem, którego dotyczy.
 */
const Tabs = styled.div`
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ $active: boolean }>`
    border: 1px solid ${p => (p.$active ? 'transparent' : st.border)};
    background: ${p => (p.$active ? st.text : st.bgCard)};
    color: ${p => (p.$active ? '#f8fafc' : st.textSecondary)};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    padding: 9px 16px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    cursor: pointer;
    transition: all 160ms ease;

    &:hover { border-color: ${p => (p.$active ? 'transparent' : st.borderHover)}; }
`;

const WideCard = styled(AnalyticsCard)``;

// ── Filtr segmentu auta na zakładce „Usługi" ────────────────────────────────
//
// Wygrywamy w premium - ale czy w SUV-ach, czy w sportowych? Bez filtra to
// pytanie nie ma gdzie paść: kafle segmentów pokazują sumę wszystkich aut
// naraz, a sama suma tego rozróżnienia nie widzi. Domyślnie wszystko, filtr
// dokłada precyzję temu, kto już wie, czego szuka.

const SegmentFilterBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
`;

const SegmentFilterField = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: ${st.textMuted};
`;

const SegmentFilterSelect = styled.select`
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${st.text};
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 6px 10px;
    cursor: pointer;
    transition: border-color ${st.transition};

    &:hover { border-color: ${st.borderHover}; }
    &:focus-visible { outline: none; border-color: ${st.borderFocus}; }
`;

const SegmentFilterReset = styled.button`
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${st.accentBlue};
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

type SegmentFilters = { size: string | null; tier: string | null };

function SegmentFilterBarRow({
    data,
    filters,
    onChange,
}: {
    data: LeadAnalytics;
    filters: SegmentFilters;
    onChange: (next: SegmentFilters) => void;
}) {
    const active = filters.size !== null || filters.tier !== null;
    return (
        <SegmentFilterBar>
            <SegmentFilterField>
                Segment rynkowy
                <SegmentFilterSelect
                    value={filters.tier ?? 'ALL'}
                    onChange={(e) => onChange({ ...filters, tier: e.target.value === 'ALL' ? null : e.target.value })}
                >
                    <option value="ALL">Wszystkie</option>
                    {data.byMarketTier.map((row) => (
                        <option key={row.code} value={row.code}>{row.label}</option>
                    ))}
                </SegmentFilterSelect>
            </SegmentFilterField>
            <SegmentFilterField>
                Wielkość
                <SegmentFilterSelect
                    value={filters.size ?? 'ALL'}
                    onChange={(e) => onChange({ ...filters, size: e.target.value === 'ALL' ? null : e.target.value })}
                >
                    <option value="ALL">Wszystkie</option>
                    {data.bySizeSegment.map((row) => (
                        <option key={row.code} value={row.code}>{row.label}</option>
                    ))}
                </SegmentFilterSelect>
            </SegmentFilterField>
            {active && (
                <SegmentFilterReset onClick={() => onChange({ size: null, tier: null })}>
                    Wyczyść filtr
                </SegmentFilterReset>
            )}
        </SegmentFilterBar>
    );
}

/** Fakty spełniające aktywne filtry segmentu - jeden filtr wspólny dla całej zakładki. */
function factsMatching(facts: LeadAnalytics['leadFacts'], filters: SegmentFilters) {
    return facts.filter((fact) =>
        (filters.size === null || fact.sizeSegment === filters.size) &&
        (filters.tier === null || fact.marketTier === filters.tier)
    );
}

/** Wygrane/przegrane po usłudze, przeliczone z surowych faktów pod aktywny filtr. */
function categoryStatsFromFacts(
    facts: LeadAnalytics['leadFacts'],
    labelByCode: Map<string, string>
): LeadAnalytics['categories'] {
    const byCode = new Map<string, { count: number; completed: number; lost: number }>();
    facts.forEach((fact) => {
        const codes = fact.categories.length > 0 ? fact.categories : [NO_TAG_CODE];
        codes.forEach((code) => {
            const row = byCode.get(code) ?? { count: 0, completed: 0, lost: 0 };
            row.count += 1;
            if (fact.won) row.completed += 1;
            if (fact.lost) row.lost += 1;
            byCode.set(code, row);
        });
    });
    return Array.from(byCode.entries())
        .map(([code, row]) => ({
            code: code === NO_TAG_CODE ? null : code,
            label: labelByCode.get(code) ?? code,
            count: row.count,
            completed: row.completed,
            lost: row.lost,
            conversionRate: row.completed + row.lost === 0 ? null : row.completed / (row.completed + row.lost),
        }))
        .sort((a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1) || b.count - a.count);
}

const NO_TAG_CODE = '__none__';

/** Wygrane/przegrane po segmencie auta, przeliczone z surowych faktów pod aktywny filtr drugiej osi. */
function segmentStatsFromFacts(
    facts: LeadAnalytics['leadFacts'],
    axis: 'sizeSegment' | 'marketTier',
    labelByCode: Map<string, string>
): LeadAnalytics['bySizeSegment'] {
    const byCode = new Map<string, { count: number; won: number; lost: number; valueSum: number; priced: number }>();
    facts.forEach((fact) => {
        const code = fact[axis];
        if (code === null) return;
        const row = byCode.get(code) ?? { count: 0, won: 0, lost: 0, valueSum: 0, priced: 0 };
        row.count += 1;
        if (fact.won) row.won += 1;
        if (fact.lost) row.lost += 1;
        if (fact.value > 0) { row.valueSum += fact.value; row.priced += 1; }
        byCode.set(code, row);
    });
    return Array.from(byCode.entries())
        .map(([code, row]) => ({
            code,
            label: labelByCode.get(code) ?? code,
            count: row.count,
            won: row.won,
            lost: row.lost,
            winRate: row.won + row.lost === 0 ? null : row.won / (row.won + row.lost),
            averageValue: row.priced === 0 ? null : Math.round(row.valueSum / row.priced),
        }))
        .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.count - a.count);
}

const TrendStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const OutlierRow = styled.div<{ $above: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surfaceAlt};
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: ${({ $above, theme }) => ($above ? theme.colors.success : theme.colors.error)};
    }
    .name {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .spacer { flex: 1; }
    .rate {
        font-variant-numeric: tabular-nums;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${({ $above, theme }) => ($above ? theme.colors.success : theme.colors.error)};
        white-space: nowrap;
    }
`;

const OutlierList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

/** Poniżej tylu zapytań każdy „najczęstszy dzień" jest przypadkiem, nie prawidłowością. */
const MIN_LEADS_FOR_RHYTHM = 20;

/**
 * Poniżej tylu zapytań w okresie prawie każda karta i tak powie „za mało danych",
 * więc proponujemy podgląd na przykładzie. Próg celowo niski: przy dwunastu
 * zapytaniach część kart już coś znaczy i podsuwanie zmyślonych liczb komuś,
 * kto ma własne, byłoby zabieraniem uwagi prawdziwym danym.
 */
const THIN_DATA_BELOW = 10;

export default function LeadAnalyticsView() {
    // Okres ustalany raz, przy wejściu. „Ten miesiąc" jest domyślny, bo to jest
    // pytanie, które właściciel zadaje sobie najczęściej: jak mi idzie TERAZ.
    const [period, setPeriod] = useState<Period>(() => buildPeriod('current', new Date()));
    // Tryb pokazowy trzymany na widoku, nie w adresie: to jest sposób oglądania,
    // a nie miejsce w aplikacji - nikt nie powinien wysłać komuś odnośnika, który
    // otwiera się na zmyślonych liczbach.
    const [demo, setDemo] = useState(false);
    const { data, isLoading } = useLeadAnalytics(period.from, period.to);

    // Trend rysujemy miesiącami dopiero przy zakresie dłuższym niż kwartał -
    // rok w tygodniach to 52 słupki, w których ginie kształt.
    const monthly = period.to.getTime() - period.from.getTime() > 120 * 24 * 3600 * 1000;

    const thin = Boolean(data) && data!.totalCreated < THIN_DATA_BELOW;
    // Oś czasu przykładu zaczyna się na początku wybranego okresu, żeby podpisy
    // pod wykresem zgadzały się z zakresem w nagłówku. Przykład z datami sprzed
    // roku wyglądałby na zepsuty, a nie na przykład.
    const shown = demo ? buildDemoAnalytics(period.from, period.to) : data;

    return (
        <ViewContainer>
            {/* Okres siedzi w nagłówku, bo jest właściwością całego widoku, tak
                samo jak jego tytuł. Jako pasek pod spodem zabierał pierwszy ruch
                wzroku kwocie, która ma go dostać. */}
            <PageHeader
                title="Pieniądze w zapytaniach"
                subtitle={`Rachunek za ${period.label}`}
                actions={
                    <>
                        <PeriodPicker value={period} onChange={setPeriod} />
                        <Link to="/leads">
                            <PageHeaderGhostButton as="span">
                                <ArrowLeft /> Leady
                            </PageHeaderGhostButton>
                        </Link>
                    </>
                }
            />

            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}

            {/* Pasek trybu pokazowego widoczny przez cały czas jego trwania:
                jedynym realnym niebezpieczeństwem tej funkcji jest pomylenie
                przykładu z własnym wynikiem. */}
            {demo && (
                <DemoBanner role="status">
                    <Sparkles />
                    <span className="grow">
                        <strong>To są przykładowe dane.</strong> Tak wygląda ten widok w studiu,
                        do którego spływa około stu zapytań w miesiącu. Twoje liczby są ukryte.
                    </span>
                    <DemoButton type="button" onClick={() => setDemo(false)}>
                        <EyeOff /> Schowaj
                    </DemoButton>
                </DemoBanner>
            )}

            {/* Zero zapytań: nie ma czego pokazać, więc zamiast sześciu kart
                z komunikatem „brak danych" idzie jedno wyjaśnienie i zaproszenie. */}
            {!demo && data && data.totalCreated === 0 && (
                <EmptyCard>
                    <h2>Jeszcze nic tu nie ma</h2>
                    <p>
                        W wybranym okresie nie wpłynęło ani jedno zapytanie, więc nie ma czego
                        liczyć. Ten widok wypełni się sam, gdy zaczną spływać - a do tego czasu
                        możesz zobaczyć, co będzie tu pokazywał.
                    </p>
                    <DemoButton type="button" onClick={() => setDemo(true)}>
                        <Eye /> Pokaż, jak może wyglądać ten widok
                    </DemoButton>
                </EmptyCard>
            )}

            {/* Zapytania są, ale za mało, żeby większość kart cokolwiek znaczyła.
                Prawdziwe liczby zostają na ekranie - ukrycie ich byłoby gorsze niż
                pokazanie szczupłych. Przykład jest propozycją, nie podmianą. */}
            {!demo && thin && data && data.totalCreated > 0 && (
                <ThinDataBar>
                    <span className="grow">
                        {data.totalCreated} {data.totalCreated === 1 ? 'zapytanie' : 'zapytań'} w tym
                        okresie to za mało, żeby te liczby coś znaczyły.
                    </span>
                    <DemoButton type="button" onClick={() => setDemo(true)}>
                        <Eye /> Pokaż, jak może wyglądać ten widok
                    </DemoButton>
                </ThinDataBar>
            )}

            {shown && (demo || shown.totalCreated > 0) && (
                <Report data={shown} monthly={demo ? false : monthly} />
            )}
        </ViewContainer>
    );
}

function Report({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const navigate = useNavigate();

    const { awaiting } = data;
    const total = data.wonValue + data.pipelineValue + data.silentValue + data.lostValue;
    const wonDelta = data.wonValue - data.wonValuePrevious;

    return (
        <>
            {/* ── Pasmo 1 ─────────────────────────────────────────────────────
                Zaległość, a nie „zarobiłeś". Sprawy niedokończone zostają w głowie
                i wytwarzają ciśnienie powrotu - a ta kwota zmienia się wyłącznie
                dlatego, że użytkownik coś zrobił. Nazwisko i auto w zdaniu obok
                sprawiają, że to jest JEGO klient, a nie abstrakcja, którą wygenerowałby
                dowolny szablon. */}
            {awaiting.count > 0 ? (
                <Hero
                    urgent
                    lead="Czeka na Ciebie"
                    amount={formatMoney(awaiting.value)}
                    body={
                        <>
                            w <strong>{awaiting.count} {conversationWord(awaiting.count)}</strong>, w których
                            piłka jest po Twojej stronie.
                            {awaiting.oldest && (
                                <>
                                    {' '}Najdłużej czeka <strong>{awaiting.oldest.name}</strong>
                                    {awaiting.oldest.vehicle && <> - {awaiting.oldest.vehicle}</>}
                                    {awaiting.oldest.value > 0 && <>, {formatMoney(awaiting.oldest.value)}</>}
                                    {', '}
                                    {dayWord(awaiting.oldest.waitingDays)}.
                                </>
                            )}
                        </>
                    }
                    action={
                        <PrimaryButton type="button" onClick={() => navigate('/leads?awaiting=1')}>
                            Odpisz im <ArrowRight size={14} />
                        </PrimaryButton>
                    }
                    // Domknięcie pętli - nagroda za to, co użytkownik zrobił po ostatniej
                    // wizycie. Osobno od zastrzeżenia o zakresie, bo tamto jest przypisem,
                    // a to jest kwitem.
                    reward={
                        data.confirmedValueThisWeek > 0
                            ? `W tym tygodniu zamieniłeś w rezerwacje ${formatMoney(data.confirmedValueThisWeek)}.`
                            : undefined
                    }
                    note="Liczone niezależnie od wybranego okresu."
                />
            ) : (
                <Hero
                    lead="Nikt nie czeka na odpowiedź"
                    amount={formatMoney(data.pipelineValue)}
                    body={
                        <>
                            Rzadka rzecz - w każdej rozmowie ostatnie słowo należy do klienta.
                            Tyle masz wciąż <strong>w grze</strong>.
                        </>
                    }
                    action={
                        <PrimaryButton type="button" onClick={() => navigate('/leads')}>
                            Zobacz otwarte zapytania <ArrowRight size={14} />
                        </PrimaryButton>
                    }
                />
            )}

            {/* ── Pasmo 2 ─────────────────────────────────────────────────────
                Belka pokazuje pieniądze OKNA, a zdanie-bohater stan bieżący. Przy
                pustym oknie belka narysowałaby trzy zera i wyglądała na awarię,
                więc zamiast niej idzie jedno zdanie. */}
            {total === 0 ? (
                <EmptyHint>W tym okresie nie wpłynęło ani jedno zapytanie.</EmptyHint>
            ) : (
            <MoneyLedger
                total={formatMoney(total)}
                kept={{ amount: formatMoney(data.wonValue), raw: data.wonValue }}
                inPlay={{
                    amount: formatMoney(data.pipelineValue),
                    raw: data.pipelineValue,
                    onClick: () => navigate('/leads'),
                }}
                silent={{
                    amount: formatMoney(data.silentValue),
                    raw: data.silentValue,
                    onClick: () => navigate('/leads?awaiting=1'),
                }}
                gone={{
                    amount: formatMoney(data.lostValue),
                    raw: data.lostValue,
                    onClick: () => navigate('/leads?status=LOST'),
                }}
                delta={
                    data.wonValuePrevious > 0 || data.wonValue > 0 ? (
                        <>
                            Zatrzymane pieniądze:{' '}
                            {wonDelta === 0
                                ? 'tyle samo co w poprzednim okresie.'
                                : `o ${formatMoney(Math.abs(wonDelta))} ${wonDelta > 0 ? 'więcej' : 'mniej'} niż w poprzednim okresie.`}
                        </>
                    ) : null
                }
            />
            )}

            {/* ── Pasmo 3 ───────────────────────────────────────────────────── */}
            {data.leaks.length > 0 && (
                <LeakList
                    rows={data.leaks.map((leak) => ({
                        code: leak.code,
                        label: leak.label,
                        amount: formatMoney(leak.value),
                        raw: leak.value,
                        count: `${leak.count} ${conversationCount(leak.count)}`,
                    }))}
                    onPick={() => navigate('/leads?status=LOST')}
                />
            )}

            {/* ── Pasmo 4 ─────────────────────────────────────────────────────
                Jedno pytanie na ekran. Wszystko jest o jedno kliknięcie dalej
                i podpisane pytaniem, którego dotyczy - nic nie ginie, a wzrok
                ma gdzie usiąść. */}
            <DeepHeading>
                <h2>Skąd się te pieniądze biorą</h2>
                <p>Materiał do przeczytania raz na jakiś czas. Jedno pytanie naraz.</p>
            </DeepHeading>
            <DeepRead data={data} monthly={monthly} />
        </>
    );
}

/** Pytania pogłębione - po jednym na ekran, w kolejności od najczęściej zadawanego. */
const DEEP_TABS = [
    { key: 'trend', label: 'Pieniądze w czasie' },
    { key: 'rhythm', label: 'Kiedy co przychodzi' },
    { key: 'services', label: 'Usługi' },
    { key: 'speed', label: 'Czas odpowiedzi' },
    { key: 'who', label: 'Marki i kanały' },
    // Liczba zapytań na końcu i nigdzie indziej: to jest miara ruchu, nie wyniku,
    // i wpuszczona wyżej przykrywałaby te, które mówią o pieniądzach.
    { key: 'volume', label: 'Liczba zapytań' },
] as const;

type DeepTab = (typeof DEEP_TABS)[number]['key'];

/**
 * Materiał, który nie zmienia pieniędzy w ciągu tygodnia, więc nie ma prawa
 * konkurować z tym, co zmienia. Prawdziwy i czasem cenny - ale czytany raz na
 * jakiś czas, po jednym pytaniu, a nie sześcioma wykresami naraz.
 */
function DeepRead({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const [tab, setTab] = useState<DeepTab>('trend');

    return (
        <>
            <Tabs role="tablist" aria-label="Pytania pogłębione">
                {DEEP_TABS.map((entry) => (
                    <Tab
                        key={entry.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === entry.key}
                        $active={tab === entry.key}
                        onClick={() => setTab(entry.key)}
                    >
                        {entry.label}
                    </Tab>
                ))}
            </Tabs>

            {tab === 'trend' && <TrendPanel data={data} monthly={monthly} />}
            {tab === 'rhythm' && <RhythmPanel data={data} />}
            {tab === 'services' && <ServicesPanel data={data} />}
            {tab === 'speed' && <SpeedPanel data={data} />}
            {tab === 'who' && <WhoPanel data={data} />}
            {tab === 'volume' && <VolumePanel data={data} monthly={monthly} />}
        </>
    );
}

function TrendPanel({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const last = data.timeline[data.timeline.length - 1];
    const previous = data.timeline[data.timeline.length - 2];
    const delta = last && previous ? last.wonValue - previous.wonValue : null;

    return (
        <WideCard
            question="Pieniądze w czasie"
            answer={
                data.timeline.length < 2
                    ? 'Okres jest za krótki, żeby mówić o trendzie.'
                    : delta === null || delta === 0
                        ? `Wartość zapytań i to, ile z nich zatrzymujesz, w kolejnych ${monthly ? 'miesiącach' : 'tygodniach'}.`
                        : (
                            <>
                                W ostatnim {monthly ? 'miesiącu' : 'tygodniu'} zatrzymałeś{' '}
                                <strong>{formatMoney(last.wonValue)}</strong> - o {formatMoney(Math.abs(delta))}{' '}
                                {delta > 0 ? 'więcej' : 'mniej'} niż {monthly ? 'miesiąc' : 'tydzień'} wcześniej.
                            </>
                        )
            }
        >
            {data.timeline.length >= 2 && (
                <TrendStack>
                    {/* Ten sam podział kolorów co w rachunku wyżej - zatrzymane,
                        w grze, stracone. Nie trzeba się go uczyć drugi raz. */}
                    <MoneyColumns
                        columns={data.timeline.map((point) => ({
                            key: point.periodStart,
                            tick: formatPeriodTick(point.periodStart, monthly),
                            won: point.wonValue,
                            open: point.openValue,
                            silent: point.silentValue,
                            lost: point.lostValue,
                            caption: [
                                formatPeriod(point.periodStart, monthly),
                                `zatrzymane ${formatMoney(point.wonValue)}`,
                                point.openValue > 0 ? `w grze ${formatMoney(point.openValue)}` : null,
                                point.silentValue > 0 ? `ucichło ${formatMoney(point.silentValue)}` : null,
                                `stracone ${formatMoney(point.lostValue)}`,
                            ].filter(Boolean).join(', ').replace(',', ':'),
                        }))}
                        tickEvery={data.timeline.length > 16 ? 4 : data.timeline.length > 8 ? 2 : 1}
                    />
                    <MoneyLegend />
                    {/* Osobny rysunek, nie druga oś na tym samym: dwie skale na
                        jednym wykresie dobiera się arbitralnie i produkują
                        zależność, której w danych nie ma. */}
                    <RateLine
                        points={data.timeline.map((point) => ({
                            key: point.periodStart,
                            rate: point.winRate,
                            caption: `${formatPeriod(point.periodStart, monthly)}: skuteczność ${percent(point.winRate)}`,
                        }))}
                    />
                </TrendStack>
            )}
        </WideCard>
    );
}

/**
 * Liczba zapytań - świadomie ostatnia i osobna.
 *
 * To jest miara ruchu, nie wyniku: rośnie niezależnie od pieniędzy, a studio jest
 * ograniczone mocą przerobową, nie popytem. Bywa przydatna („czy reklama w ogóle
 * dowozi"), więc zostaje - ale nie w miejscu, w którym przykrywałaby liczby
 * mówiące o przychodzie.
 */
function VolumePanel({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const total = data.timeline.reduce((sum, point) => sum + point.created, 0);
    return (
        <WideCard
            question="Ile zapytań przychodziło"
            answer={
                data.timeline.length < 2
                    ? 'Okres jest za krótki, żeby mówić o trendzie.'
                    : (
                        <>
                            <strong>{total}</strong> zapytań w tym okresie. Sama liczba nie mówi o pieniądzach -
                            czternaście pytań o mycie i trzy o folię to ta sama liczba i zupełnie inny miesiąc.
                        </>
                    )
            }
        >
            {data.timeline.length >= 2 && (
                <ColumnChart
                    columns={data.timeline.map((point) => ({
                        key: point.periodStart,
                        tick: formatPeriodTick(point.periodStart, monthly),
                        value: point.created,
                        caption: `${formatPeriod(point.periodStart, monthly)}: ${point.created} zapytań`,
                    }))}
                    height={150}
                    tickEvery={data.timeline.length > 16 ? 4 : data.timeline.length > 8 ? 2 : 1}
                />
            )}
        </WideCard>
    );
}

/**
 * Macierz „która usługa, w który dzień".
 *
 * Zwykły słupek „ile zapytań w poniedziałek" mówił tylko, kiedy jest ruch - a ruch
 * sam w sobie nie jest ani przychodem, ani problemem. Wiersze ustawione od
 * najdroższej usługi zamieniają ten sam materiał w pytanie, które ma konsekwencje
 * w grafiku: czy drogie zapytania przychodzą w innych dniach niż tanie.
 */
function RhythmPanel({ data }: { data: LeadAnalytics }) {
    const enough = data.totalCreated >= MIN_LEADS_FOR_RHYTHM;
    const rows = data.weekdayMatrix;

    // Porównujemy droższą połowę wierszy z tańszą. Połowa, nie pojedynczy wiersz:
    // jedna usługa z trzema zapytaniami wskazywałaby dzień przypadkiem.
    const priced = rows.filter((row) => row.averageValue !== null);
    const half = Math.ceil(priced.length / 2);
    const peakDay = (group: typeof rows): number | null => {
        if (group.length === 0) return null;
        const sums = Array.from({ length: 7 }, (_, day) => group.reduce((s, row) => s + row.counts[day], 0));
        const best = Math.max(...sums);
        return best === 0 ? null : sums.indexOf(best);
    };
    const expensiveDay = peakDay(priced.slice(0, half));
    const cheapDay = peakDay(priced.slice(half));

    /*
     * Dzień decyzji jako zdanie, nie jako drugi wykres obok macierzy. Odpowiedź
     * mieści się w sześciu słowach, a osobny rysunek obok niej odbierałby macierzy
     * status jedynego elementu, na którym ma spocząć wzrok.
     */
    const decisionDay = (() => {
        const best = Math.max(...data.decisionsByWeekday.map((entry) => entry.count));
        if (best <= 0) return null;
        return data.decisionsByWeekday.findIndex((entry) => entry.count === best);
    })();

    return (
        <WideCard
            question="Kiedy co przychodzi"
            answer={
                !enough || rows.length === 0
                    ? `Przy ${data.totalCreated} zapytaniach rozkład na dni tygodnia to jeszcze przypadek, nie prawidłowość.`
                    : expensiveDay !== null && cheapDay !== null && expensiveDay !== cheapDay
                        ? (
                            <>
                                O najdroższe usługi klienci pytają najczęściej w{' '}
                                <strong>{WEEKDAY_FULL[expensiveDay]}</strong>, o najtańsze w{' '}
                                <strong>{WEEKDAY_FULL[cheapDay]}</strong>.
                            </>
                        )
                        : 'Drogie i tanie zapytania rozkładają się na tydzień podobnie - nie ma dnia, który wymagałby innej obsady.'
            }
            footnote={
                enough && decisionDay !== null
                    ? <>Decyzje zapadają najczęściej we <strong>{WEEKDAY_FULL[decisionDay]}</strong>.</>
                    : undefined
            }
        >
            {rows.length === 0 ? (
                <EmptyChart>Brak zapytań w tym okresie.</EmptyChart>
            ) : (
                <WeekdayMatrix
                    dayLabels={WEEKDAY_LABELS}
                    rows={rows.map((row) => ({
                        key: row.code ?? row.label,
                        label: row.label,
                        note: row.averageValue === null
                            ? 'brak wycen'
                            : `średnio ${formatMoney(row.averageValue)}`,
                        counts: row.counts,
                        total: row.total,
                    }))}
                    describeCell={(row, dayIndex, count) =>
                        count === 0
                            ? `${row.label}: brak zapytań w ${WEEKDAY_FULL[dayIndex]}`
                            : `${row.label}: ${count} w ${WEEKDAY_FULL[dayIndex]}`
                    }
                />
            )}
        </WideCard>
    );
}

function ServicesPanel({ data }: { data: LeadAnalytics }) {
    // Jeden filtr wspólny dla całej zakładki: „wygrywamy w premium, ale w
    // sportowych czy w SUV-ach?" jest pytaniem o przecięcie dwóch osi naraz,
    // więc filtr musi działać na obie karty pojazdu i na kartę usług jednocześnie.
    const [filters, setFilters] = useState<SegmentFilters>({ size: null, tier: null });
    const filtered = factsMatching(data.leadFacts, filters);

    const categoryLabels = new Map<string, string>(
        data.categories.map((entry) => [entry.code ?? NO_TAG_CODE, entry.label])
    );
    const sizeLabels = new Map(data.bySizeSegment.map((row) => [row.code, row.label]));
    const tierLabels = new Map(data.byMarketTier.map((row) => [row.code, row.label]));

    // Tematy z jednym zapytaniem to nie jest wiedza o tym, w czym wygrywamy -
    // to jedno zdarzenie. Bez filtra kolejność przychodzi z backendu; pod
    // filtrem liczy się z surowych faktów tym samym sposobem.
    const categorySource = filters.size === null && filters.tier === null
        ? data.categories
        : categoryStatsFromFacts(filtered, categoryLabels);
    const categories = categorySource.filter((entry) => entry.count >= 3).slice(0, 8);
    const rated = categories.filter((entry) => entry.conversionRate !== null);
    const best = rated[0];
    const worst = rated[rated.length - 1];
    const filterActive = filters.size !== null || filters.tier !== null;

    return (
        <>
        <WideCard
            question="W czym wygrywamy, w czym przegrywamy"
            answer={
                rated.length === 0
                    ? 'Za mało rozstrzygniętych rozmów w poszczególnych usługach.'
                    : (
                        <>
                            Najlepiej idzie w usłudze <strong>{best.label}</strong>{' '}
                            ({percent(best.conversionRate)}), najgorzej w <strong>{worst.label}</strong>{' '}
                            ({percent(worst.conversionRate)}).
                        </>
                    )
            }
            footnote="Filtr segmentu auta obejmuje tę kartę i obie karty pojazdu poniżej."
        >
            <SegmentFilterBarRow data={data} filters={filters} onChange={setFilters} />
            {categories.length === 0 ? (
                <EmptyChart>
                    {filterActive
                        ? 'Za mało rozstrzygniętych rozmów w tym segmencie - spróbuj szerszego filtra.'
                        : 'Wróć tu, gdy zamkniesz więcej rozmów.'}
                </EmptyChart>
            ) : (
                <>
                    <WinLossBars
                        rows={categories.map((entry) => ({
                            key: entry.code ?? 'none',
                            label: entry.label,
                            won: entry.completed,
                            lost: entry.lost,
                            open: Math.max(0, entry.count - entry.completed - entry.lost),
                            winRate: entry.conversionRate,
                        }))}
                    />
                    <WinLossLegend />
                </>
            )}
        </WideCard>

        {/* Dwie osie pojazdu, bo odpowiadają na dwa różne pytania. Wielkość mówi
            o pracy: ile lakieru, ile wykrojów folii, czy auto zmieści się na
            stanowisku. Klasa rynkowa mówi o rozmowie o cenie - właściciel Dacii
            i właściciel Porsche mogą przyjechać tym samym kompaktem i zupełnie
            inaczej zareagować na wycenę. Każda karta przyjmuje filtr TYLKO z
            drugiej osi: filtrowanie karty wielkości po wielkości pokazałoby
            jeden wiersz równy filtrowi, czyli nic. */}
        <SegmentCard
            question="W jakich autach wygrywamy"
            hint="Klasa marki decyduje o rozmowie o cenie. Najedź na wiersz, żeby zobaczyć przykładowe marki."
            rows={filters.size === null ? data.byMarketTier : segmentStatsFromFacts(filtered, 'marketTier', tierLabels)}
            hints={MARKET_TIER_HINTS}
            crossFilterNote={filters.size !== null ? sizeLabels.get(filters.size) ?? filters.size : null}
        />
        <SegmentCard
            question="Jakiej wielkości auta wygrywamy"
            hint="Wielkość decyduje o nakładzie pracy i o tym, co się zmieści na stanowisku. Najedź na wiersz, żeby zobaczyć przykładowe marki."
            rows={filters.tier === null ? data.bySizeSegment : segmentStatsFromFacts(filtered, 'sizeSegment', sizeLabels)}
            hints={SIZE_SEGMENT_HINTS}
            crossFilterNote={filters.tier !== null ? tierLabels.get(filters.tier) ?? filters.tier : null}
        />
        </>
    );
}

/**
 * Wygrane i przegrane w jednym podziale aut.
 *
 * Segment z jednym rozstrzygniętym zapytaniem to nie jest wiedza o tym, w czym
 * wygrywamy - to jedno zdarzenie, a pokazane obok segmentów z dwudziestoma
 * wygląda na równorzędny wniosek. Próg trzech odsiewa je, nie ukrywając niczego
 * istotnego.
 */
function SegmentCard({
    question,
    hint,
    rows,
    hints,
    crossFilterNote,
}: {
    question: string;
    hint: string;
    rows: LeadAnalytics['bySizeSegment'];
    /** Definicja segmentu z przykładowymi markami - tooltip po najechaniu na wiersz. */
    hints: Record<string, string>;
    /** Etykieta drugiej osi, jeśli filtr jest aktywny - dopisek do pytania karty. */
    crossFilterNote: string | null;
}) {
    const solid = rows.filter((row) => row.won + row.lost >= 3);
    const best = solid.find((row) => row.winRate !== null);

    return (
        <WideCard
            question={crossFilterNote ? `${question} - ${crossFilterNote}` : question}
            answer={
                solid.length === 0
                    ? 'Za mało rozstrzygniętych rozmów, żeby porównać segmenty. Auta rozpoznają się same z korespondencji - wróć tu, gdy uzbiera się ich więcej.'
                    : (
                        <>
                            Najlepiej idzie w segmencie <strong>{best?.label ?? '-'}</strong>{' '}
                            ({percent(best?.winRate)}).
                        </>
                    )
            }
            footnote={solid.length > 0 ? hint : undefined}
        >
            {solid.length > 0 && (
                <>
                    <WinLossBars
                        rows={solid.map((row) => ({
                            key: row.code,
                            label: row.label,
                            note: row.averageValue
                                ? `średnio ${formatMoney(row.averageValue)}`
                                : undefined,
                            hint: hints[row.code] ? `${row.label}: ${hints[row.code]}` : row.label,
                            won: row.won,
                            lost: row.lost,
                            open: Math.max(0, row.count - row.won - row.lost),
                            winRate: row.winRate,
                        }))}
                    />
                    <WinLossLegend />
                </>
            )}
        </WideCard>
    );
}

function SpeedPanel({ data }: { data: LeadAnalytics }) {
    const impact = data.responseImpact;
    const answer = (() => {
        if (impact.verdict === 'NOT_ENOUGH_DATA') {
            return 'Za mało rozstrzygniętych rozmów, żeby cokolwiek stwierdzić. Wróć tu przy szerszym zakresie.';
        }
        if (impact.verdict === 'FASTER_WINS') {
            const gap = (impact.fastWinRate ?? 0) - (impact.slowWinRate ?? 0);
            return (
                <>
                    <strong>Tak - szybka odpowiedź się opłaca.</strong> Odpisując w ciągu doby wygrywasz{' '}
                    {percent(impact.fastWinRate)} rozmów, później {percent(impact.slowWinRate)}. Różnica{' '}
                    {points(gap)}.
                </>
            );
        }
        return (
            <>
                <strong>Nie wykryto zależności.</strong> Skuteczność przy odpowiedzi w dobę
                ({percent(impact.fastWinRate)}) i później ({percent(impact.slowWinRate)}) jest zbliżona -
                o wyniku decyduje coś innego niż tempo.
            </>
        );
    })();

    return (
        <WideCard question="Czy czas odpowiedzi wpływa na skuteczność" answer={answer}>
            <RankedBars
                rows={impact.buckets
                    .filter((bucket) => bucket.count > 0)
                    .map((bucket) => ({
                        key: bucket.key,
                        label: RESPONSE_LABELS[bucket.key] ?? bucket.key,
                        value: bucket.winRate ?? 0,
                        meta: `${percent(bucket.winRate)} z ${bucket.closed}`,
                    }))}
            />
            <EmptyChart>
                Słupek to skuteczność w danym przedziale, liczba obok - na ilu rozstrzygniętych
                rozmowach się opiera.
            </EmptyChart>
        </WideCard>
    );
}

function WhoPanel({ data }: { data: LeadAnalytics }) {
    const bestSource = [...data.bySource]
        .filter((entry) => entry.winRate !== null && entry.closed >= 5)
        .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];

    return (
        <>
            <WideCard
                question="Czy coś odstaje"
                answer={
                    data.vehicleOutliers.length === 0
                        ? 'Nie wykryto odstępstw - żadna marka nie odbiega wyraźnie od Twojej średniej.'
                        : 'Marki, przy których wynik wyraźnie różni się od średniej.'
                }
            >
                {data.vehicleOutliers.length > 0 && (
                    <OutlierList>
                        {data.vehicleOutliers.map((outlier) => {
                            const above = outlier.direction === 'ABOVE';
                            const Icon = above ? TrendingUp : TrendingDown;
                            return (
                                <OutlierRow key={outlier.label} $above={above}>
                                    <Icon />
                                    <span className="name">{outlier.label}</span>
                                    <span>
                                        {above ? 'wygrywamy częściej' : 'przegrywamy częściej'}
                                        {' - '}{outlier.won} z {outlier.closed}
                                    </span>
                                    <span className="spacer" />
                                    <span className="rate">{percent(outlier.winRate)}</span>
                                </OutlierRow>
                            );
                        })}
                    </OutlierList>
                )}
            </WideCard>

            <WideCard
                question="Skąd przychodzą zapytania"
                answer={
                    bestSource
                        ? (
                            <>
                                Najskuteczniejszy kanał to{' '}
                                <strong>{SOURCE_LABELS[bestSource.source] ?? bestSource.source}</strong>{' '}
                                ({percent(bestSource.winRate)}).
                            </>
                        )
                        : 'Za mało rozstrzygniętych rozmów, żeby porównać kanały.'
                }
            >
                <RankedBars
                    rows={data.bySource.map((entry) => ({
                        key: entry.source,
                        label: SOURCE_LABELS[entry.source] ?? entry.source,
                        value: entry.count,
                        meta: `${entry.count}, skut. ${percent(entry.winRate)}`,
                    }))}
                />
            </WideCard>
        </>
    );
}

/** „1 rozmowie", „3 rozmowach" - miejscownik, bo zdanie brzmi „w 11 rozmowach". */
function conversationWord(count: number): string {
    return count === 1 ? 'rozmowie' : 'rozmowach';
}

/** „1 rozmowa", „3 rozmowy", „11 rozmów" - mianownik, gdy liczba stoi sama. */
function conversationCount(count: number): string {
    if (count === 1) return 'rozmowa';
    const rest = count % 10;
    const teens = count % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? 'rozmowy' : 'rozmów';
}

/** „czeka 1 dzień", „czeka 6 dni", „od dziś". */
function dayWord(days: number): string {
    if (days <= 0) return 'od dziś';
    if (days === 1) return 'czeka 1 dzień';
    return `czeka ${days} dni`;
}
