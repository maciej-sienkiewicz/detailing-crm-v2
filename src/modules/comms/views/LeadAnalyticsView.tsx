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
import { ArrowLeft, ArrowRight, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics } from '../types';
import { EmptyHint, FilterChip, PrimaryButton } from '../components/shared';
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

const RangeRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

/** Pasmo 3 i 4 rozdzielone kreską, nie odstępem: tu kończy się „dziś", zaczyna „kiedyś". */
const Divider = styled.hr`
    margin: 6px 0 0;
    border: none;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

/**
 * Czytanie tygodniowe — zwinięte domyślnie.
 *
 * Te dane są prawdziwe i czasem cenne, ale żadna z nich nie zmienia pieniędzy
 * w ciągu tygodnia. Rozłożone na pierwszym ekranie rozmyłyby jedyne trzy liczby,
 * które to potrafią; schowane za jednym kliknięciem nic nie tracą.
 */
const MoreToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg {
        width: 15px;
        height: 15px;
        transition: transform ${p => p.theme.transitions.fast};
    }
    &[aria-expanded='true'] svg { transform: rotate(180deg); }
    &:hover { color: ${p => p.theme.colors.text}; }
`;

const QuietGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    align-items: start;
`;

const WideCard = styled(AnalyticsCard)`
    grid-column: 1 / -1;
`;

const SplitCharts = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    h4 {
        margin: 0 0 8px;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.textSecondary};
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
        gap: 18px;
    }
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

const RANGES = [
    { key: '30', label: '30 dni', days: 30 },
    { key: '90', label: '90 dni', days: 90 },
    { key: '365', label: 'Rok', days: 365 },
] as const;

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
    const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('30');
    const range = RANGES.find((entry) => entry.key === rangeKey)!;
    const { data, isLoading } = useLeadAnalytics(range.days);

    return (
        <ViewContainer>
            <PageHeader
                title="Pieniądze w zapytaniach"
                subtitle={`Rachunek za ostatnie ${range.key === '365' ? '12 miesięcy' : range.label}`}
                actions={
                    <Link to="/leads">
                        <PageHeaderGhostButton as="span">
                            <ArrowLeft /> Wróć do leadów
                        </PageHeaderGhostButton>
                    </Link>
                }
            />

            <RangeRow>
                {RANGES.map((entry) => (
                    <FilterChip
                        key={entry.key}
                        $active={rangeKey === entry.key}
                        onClick={() => setRangeKey(entry.key)}
                    >
                        {entry.label}
                    </FilterChip>
                ))}
            </RangeRow>

            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}
            {data && <Report data={data} monthly={range.key === '365'} />}
        </ViewContainer>
    );
}

function Report({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const navigate = useNavigate();
    const [moreOpen, setMoreOpen] = useState(false);

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

            {/* ── Pasmo 4 ───────────────────────────────────────────────────── */}
            <Divider />
            <MoreToggle
                type="button"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
            >
                <ChevronDown /> {moreOpen ? 'Zwiń czytanie tygodniowe' : 'Czytanie tygodniowe — rytm, usługi, odstępstwa'}
            </MoreToggle>

            {moreOpen && <WeeklyReading data={data} monthly={monthly} />}
        </>
    );
}

/**
 * Materiał, który nie zmienia pieniędzy w ciągu tygodnia, więc nie ma prawa
 * konkurować z tym, co zmienia. Prawdziwy i czasem cenny — ale przeczytany raz na
 * jakiś czas, nie codziennie.
 */
function WeeklyReading({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const enoughForRhythm = data.totalCreated >= MIN_LEADS_FOR_RHYTHM;
    const inquiryPeak = peakOf(data.inquiriesByWeekday);
    const decisionPeak = peakOf(data.decisionsByWeekday);

    const weekdayColumns = (stats: { weekday: number; count: number }[], peakIndex: number | null): Column[] =>
        stats.map((entry, index) => ({
            key: String(entry.weekday),
            tick: WEEKDAY_LABELS[index],
            value: entry.count,
            caption: `${WEEKDAY_LABELS[index]}: ${entry.count}`,
            highlighted: index === peakIndex,
        }));

    // Tematy z jednym zapytaniem to nie jest wiedza o tym, w czym wygrywamy —
    // to jedno zdarzenie.
    const categories = data.categories.filter((entry) => entry.count >= 3).slice(0, 8);
    const rated = categories.filter((entry) => entry.conversionRate !== null);
    const bestCategory = [...rated].sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0];
    const worstCategory = [...rated].sort((a, b) => (a.conversionRate ?? 0) - (b.conversionRate ?? 0))[0];

    const bestSource = [...data.bySource]
        .filter((entry) => entry.winRate !== null && entry.closed >= 5)
        .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];

    const impact = data.responseImpact;
    const responseAnswer = (() => {
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
        <QuietGrid>
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
                            height={130}
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

            <WideCard
                question="Rytm tygodnia"
                answer={
                    !enoughForRhythm
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
                            columns={weekdayColumns(data.inquiriesByWeekday, inquiryPeak?.index ?? null)}
                            height={110}
                        />
                    </div>
                    <div>
                        <h4>Kiedy się decydują</h4>
                        {decisionPeak ? (
                            <ColumnChart
                                columns={weekdayColumns(data.decisionsByWeekday, decisionPeak.index)}
                                height={110}
                            />
                        ) : (
                            <EmptyChart>Brak rezerwacji z tego okresu.</EmptyChart>
                        )}
                    </div>
                </SplitCharts>
            </WideCard>

            <AnalyticsCard
                question="W czym wygrywamy, w czym przegrywamy"
                answer={
                    rated.length === 0
                        ? 'Za mało rozstrzygniętych rozmów w poszczególnych usługach.'
                        : (
                            <>
                                Najlepiej idzie w usłudze <strong>{bestCategory.label}</strong>{' '}
                                ({percent(bestCategory.conversionRate)}), najgorzej w{' '}
                                <strong>{worstCategory.label}</strong> ({percent(worstCategory.conversionRate)}).
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
            </AnalyticsCard>

            <AnalyticsCard question="Czy czas odpowiedzi wpływa na skuteczność" answer={responseAnswer}>
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
            </AnalyticsCard>

            <AnalyticsCard
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
            </AnalyticsCard>

            <AnalyticsCard
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
            </AnalyticsCard>
        </QuietGrid>
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
