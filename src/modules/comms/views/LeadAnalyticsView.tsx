// src/modules/comms/views/LeadAnalyticsView.tsx
// Analityka leadów jako rachunek pieniędzy, nie jako raport ze wskaźnikami.
//
// ── Dlaczego nie ma tu ani jednego procentu na pierwszym ekranie ────────────
//
// Właściciel studia myśli w złotówkach. Procent wymaga tłumaczenia na pieniądze,
// zanim cokolwiek znaczy, i nie ma skali odniesienia: „skuteczność 41%" to ocena
// szkolna bez kryteriów. Przy rozrzucie wartości zleceń od czterystu złotych do
// dwunastu tysięcy procent dodatkowo kłamie — miesiąc z dziesięcioma przegranymi
// praniami tapicerki i jedną wygraną powłoką ceramiczną to dziewięć procent
// konwersji i bardzo dobry miesiąc.
//
// ── Cztery pasma i koniec ──────────────────────────────────────────────────
//
// 1. Zdanie-bohater: ile pieniędzy czeka na Twoją odpowiedź. Pierwsza fiksacja
//    wzroku ustawia ramę dla reszty ekranu — liczba PRZESZŁA robi z tego raport,
//    liczba OTWARTA robi z tego warsztat. Tylko drugie ma powód, żeby wracać.
// 2. Rachunek zapytań: jedna belka pieniędzy, które przeszły przez drzwi.
// 3. Gdzie wyciekły: powody straty w złotówkach, każdy klikalny.
// 4. Czytanie tygodniowe: rytm, odstępstwa, usługi, kanały — cicho, poniżej zgięcia.
//
// Ekran się KOŃCZY. Żadnego nieskończonego strumienia kart: taki, który ma koniec,
// zostaje przeczytany, a taki bez końca zostaje przewinięty.
//
// ── Reguły dołożone przy przeprojektowaniu ─────────────────────────────────
//
//  8. Jedna karta = jedno pytanie = jedna odpowiedź zdaniem. Karta bez zdania
//     jest surowcem, nie produktem — analizę zostawia czytelnikowi.
//  9. Prawo Millera: najwyżej 3–4 obiekty do porównania naraz. Sześć wykresów
//     obok siebie to nie wybór, tylko paraliż — dlatego materiał pogłębiony
//     idzie zakładkami, po jednym pytaniu na ekran.
// 10. Prawo bliskości rządzi kartami: odstęp MIĘDZY grupami wyraźnie większy
//     niż wewnątrz grupy, inaczej wszystko czyta się jako jedna ściana.
// 11. Karta niesie głębię. Biel z ramką = powierzchnia robocza, tło strony =
//     kontekst. Treść położona wprost na teksturze tła nie ma ani jednego,
//     ani drugiego — i męczy przy pierwszym akapicie.
// 12. Okres jest właściwością widoku, nie sekcją w nim. Miejsce ma w nagłówku,
//     obok tytułu, a nie jako pasek, który zabiera pierwszy ruch wzroku kwocie.
// 13. Zakresy nazywają się tak, jak nazywa je użytkownik. „Ostatnie 90 dni" nie
//     odpowiada żadnemu wydarzeniu w roku właściciela firmy; miesiąc odpowiada
//     każdemu — księgowa, podatek, pensje i ZUS chodzą w tym rytmie.
// 14. Ruch tylko jako informacja: wejście karty tak, tańczący wykres nie.
//
// ── Czego tu świadomie nie ma ──────────────────────────────────────────────
//
// • Rzędu sześciu kafli o równej wadze. Jeśli wszystko jest wyróżnione, nic nie
//   jest — a ikonka w kolorowym kółku pod pastelowym gradientem to dekoracja
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
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics } from '../types';
import { EmptyHint, PrimaryButton } from '../components/shared';
import { PeriodPicker } from '../components/analytics/PeriodPicker';
import { buildPeriod, type Period } from '../components/analytics/period';
import { Hero, LeakList, MoneyLedger } from '../components/analytics/money';
import {
    AnalyticsCard,
    ColumnChart,
    EmptyChart,
    RankedBars,
    RateLine,
    WinLossBars,
    WinLossLegend,
    type Column,
} from '../components/analytics/charts';
import {
    RESPONSE_LABELS,
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
 * Pasmo pogłębione — nagłówek sekcji, który mówi, że tu kończy się „dziś",
 * a zaczyna „przy okazji". Odstęp nad nim jest wyraźnie większy niż odstępy
 * między kartami wyżej: prawo bliskości robi z tego osobną grupę bez rysowania
 * ani jednej kreski więcej.
 */
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
 * przywraca zasadę „jeden dominujący element", a nic nie ginie — wszystko jest
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

/**
 * Dwa rysunki obok siebie, rozdzielone kreską. Bez niej czternaście słupków
 * czyta się jako jeden wykres, a to są dwie różne serie z dwiema różnymi
 * skalami — „kiedy pytają" i „kiedy się decydują" nie mają wspólnego maksimum.
 */
const SplitCharts = styled.div`
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: 28px;

    h4 {
        margin: 0 0 8px;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.textSecondary};
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
        gap: 18px;
        .rule { display: none; }
    }
`;

const SplitRule = styled.span.attrs({ className: 'rule', 'aria-hidden': true })`
    display: block;
    align-self: stretch;
    background: ${st.border};
`;

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

const peakOf = (stats: { count: number }[]): { index: number; count: number } | null => {
    let best = -1;
    let bestIndex = -1;
    stats.forEach((entry, index) => {
        if (entry.count > best) {
            best = entry.count;
            bestIndex = index;
        }
    });
    return best <= 0 ? null : { index: bestIndex, count: best };
};

export default function LeadAnalyticsView() {
    // Okres ustalany raz, przy wejściu. „Ten miesiąc" jest domyślny, bo to jest
    // pytanie, które właściciel zadaje sobie najczęściej: jak mi idzie TERAZ.
    const [period, setPeriod] = useState<Period>(() => buildPeriod('current', new Date()));
    const { data, isLoading } = useLeadAnalytics(period.from, period.to);

    // Trend rysujemy miesiącami dopiero przy zakresie dłuższym niż kwartał —
    // rok w tygodniach to 52 słupki, w których ginie kształt.
    const monthly = period.to.getTime() - period.from.getTime() > 120 * 24 * 3600 * 1000;

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
            {data && <Report data={data} monthly={monthly} />}
        </ViewContainer>
    );
}

function Report({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const navigate = useNavigate();

    const { awaiting } = data;
    const total = data.wonValue + data.pipelineValue + data.lostValue;
    const wonDelta = data.wonValue - data.wonValuePrevious;

    return (
        <>
            {/* ── Pasmo 1 ─────────────────────────────────────────────────────
                Zaległość, a nie „zarobiłeś". Sprawy niedokończone zostają w głowie
                i wytwarzają ciśnienie powrotu — a ta kwota zmienia się wyłącznie
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
                                    {awaiting.oldest.vehicle && <> — {awaiting.oldest.vehicle}</>}
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
                    // Domknięcie pętli — nagroda za to, co użytkownik zrobił po ostatniej
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
                            Rzadka rzecz — w każdej rozmowie ostatnie słowo należy do klienta.
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
                i podpisane pytaniem, którego dotyczy — nic nie ginie, a wzrok
                ma gdzie usiąść. */}
            <DeepHeading>
                <h2>Skąd się te pieniądze biorą</h2>
                <p>Materiał do przeczytania raz na jakiś czas. Jedno pytanie naraz.</p>
            </DeepHeading>
            <DeepRead data={data} monthly={monthly} />
        </>
    );
}

/** Pytania pogłębione — po jednym na ekran, w kolejności od najczęściej zadawanego. */
const DEEP_TABS = [
    { key: 'trend', label: 'Trend' },
    { key: 'rhythm', label: 'Rytm tygodnia' },
    { key: 'services', label: 'Usługi' },
    { key: 'speed', label: 'Czas odpowiedzi' },
    { key: 'who', label: 'Marki i kanały' },
] as const;

type DeepTab = (typeof DEEP_TABS)[number]['key'];

/**
 * Materiał, który nie zmienia pieniędzy w ciągu tygodnia, więc nie ma prawa
 * konkurować z tym, co zmienia. Prawdziwy i czasem cenny — ale czytany raz na
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
        </>
    );
}

function TrendPanel({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    return (
        <WideCard
            question="Jak to szło w czasie"
            answer={
                data.timeline.length < 2
                    ? 'Okres jest za krótki, żeby mówić o trendzie.'
                    : `Zapytania i skuteczność w kolejnych ${monthly ? 'miesiącach' : 'tygodniach'}.`
            }
        >
            {data.timeline.length >= 2 && (
                <TrendStack>
                    <ColumnChart
                        columns={data.timeline.map((point) => ({
                            key: point.periodStart,
                            tick: formatPeriodTick(point.periodStart, monthly),
                            value: point.created,
                            caption: `${formatPeriod(point.periodStart, monthly)}: ${point.created} zapytań, ${point.won} wygranych`,
                        }))}
                        height={150}
                        tickEvery={data.timeline.length > 16 ? 4 : data.timeline.length > 8 ? 2 : 1}
                    />
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

function RhythmPanel({ data }: { data: LeadAnalytics }) {
    const enough = data.totalCreated >= MIN_LEADS_FOR_RHYTHM;
    const inquiryPeak = peakOf(data.inquiriesByWeekday);
    const decisionPeak = peakOf(data.decisionsByWeekday);

    const columns = (stats: { weekday: number; count: number }[], peakIndex: number | null): Column[] =>
        stats.map((entry, index) => ({
            key: String(entry.weekday),
            tick: WEEKDAY_LABELS[index],
            value: entry.count,
            caption: `${WEEKDAY_LABELS[index]}: ${entry.count}`,
            highlighted: index === peakIndex,
        }));

    return (
        <WideCard
            question="Rytm tygodnia"
            answer={
                !enough
                    ? `Przy ${data.totalCreated} zapytaniach rozkład na dni tygodnia to jeszcze przypadek, nie prawidłowość.`
                    : (
                        <>
                            Najwięcej zapytań przychodzi w{' '}
                            <strong>{inquiryPeak ? WEEKDAY_FULL[inquiryPeak.index] : '—'}</strong>
                            {decisionPeak && (
                                <>
                                    , a decyzje zapadają najczęściej we{' '}
                                    <strong>{WEEKDAY_FULL[decisionPeak.index]}</strong>
                                </>
                            )}
                            .
                        </>
                    )
            }
        >
            <SplitCharts>
                <div>
                    <h4>Kiedy pytają</h4>
                    <ColumnChart
                        columns={columns(data.inquiriesByWeekday, inquiryPeak?.index ?? null)}
                        height={130}
                    />
                </div>
                <SplitRule />
                <div>
                    <h4>Kiedy się decydują</h4>
                    {decisionPeak ? (
                        <ColumnChart columns={columns(data.decisionsByWeekday, decisionPeak.index)} height={130} />
                    ) : (
                        <EmptyChart>Brak rezerwacji z tego okresu.</EmptyChart>
                    )}
                </div>
            </SplitCharts>
        </WideCard>
    );
}

function ServicesPanel({ data }: { data: LeadAnalytics }) {
    // Tematy z jednym zapytaniem to nie jest wiedza o tym, w czym wygrywamy —
    // to jedno zdarzenie.
    const categories = data.categories.filter((entry) => entry.count >= 3).slice(0, 8);
    const rated = categories.filter((entry) => entry.conversionRate !== null);
    const best = [...rated].sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0];
    const worst = [...rated].sort((a, b) => (a.conversionRate ?? 0) - (b.conversionRate ?? 0))[0];

    return (
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
        >
            {categories.length === 0 ? (
                <EmptyChart>Wróć tu, gdy zamkniesz więcej rozmów.</EmptyChart>
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
                    <strong>Tak — szybka odpowiedź się opłaca.</strong> Odpisując w ciągu doby wygrywasz{' '}
                    {percent(impact.fastWinRate)} rozmów, później {percent(impact.slowWinRate)}. Różnica{' '}
                    {points(gap)}.
                </>
            );
        }
        return (
            <>
                <strong>Nie wykryto zależności.</strong> Skuteczność przy odpowiedzi w dobę
                ({percent(impact.fastWinRate)}) i później ({percent(impact.slowWinRate)}) jest zbliżona —
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
                Słupek to skuteczność w danym przedziale, liczba obok — na ilu rozstrzygniętych
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
                        ? 'Nie wykryto odstępstw — żadna marka nie odbiega wyraźnie od Twojej średniej.'
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
                                        {' — '}{outlier.won} z {outlier.closed}
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

/** „1 rozmowie", „3 rozmowach" — miejscownik, bo zdanie brzmi „w 11 rozmowach". */
function conversationWord(count: number): string {
    return count === 1 ? 'rozmowie' : 'rozmowach';
}

/** „1 rozmowa", „3 rozmowy", „11 rozmów" — mianownik, gdy liczba stoi sama. */
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
