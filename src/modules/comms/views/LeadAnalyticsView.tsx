// src/modules/comms/views/LeadAnalyticsView.tsx
// Analityka leadów zbudowana wokół pytań, a nie wokół danych, które akurat mamy.
//
// Każda karta zadaje jedno pytanie właściciela studia i odpowiada na nie zdaniem
// po polsku; wykres pod spodem to zdanie uzasadnia. Odwrotna kolejność — wykres,
// a pod nim domysły — dokłada pracy zamiast ją zdejmować, a to jest jedyny powód,
// dla którego ten widok istnieje.
//
// Czego tu świadomie NIE MA:
//
// • Mapy ciepła dzień × godzina. 7 × 24 = 168 komórek; studio z czterdziestoma
//   zapytaniami miesięcznie zapełni je średnio w jednej czwartej, więc rysunek
//   pokazywałby głównie przypadek. Rytm tygodnia i rytm miesiąca mówią to samo
//   na próbie, która wytrzymuje.
// • Prognoz. Do przewidywania trzeba szeregu, który ma sezonowość i długość;
//   przy kilkuset leadach prognoza jest zgadywaniem w przebraniu wykresu.
// • Statystyk per pracownik. To narzędzie dla studia, w którym zapytaniami
//   zajmuje się jedna albo dwie osoby — ranking na takiej próbie ocenia szczęście.
// • Lejka wszystkich sześciu statusów. Powtarzał to, co mówi kafel skuteczności,
//   tylko dłużej.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
    ArrowLeft,
    Banknote,
    CalendarClock,
    Clock3,
    Inbox,
    Target,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { StatTile } from '@/common/components/StatTile';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics } from '../types';
import { EmptyHint, FilterChip, formatGrosze } from '../components/shared';
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
    LOST,
    RESPONSE_LABELS,
    SOURCE_LABELS,
    WEEKDAY_FULL,
    WEEKDAY_LABELS,
    formatDays,
    formatMinutes,
    formatPeriod,
    formatPeriodTick,
    percent,
    points,
} from '../components/analytics/tokens';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

const TileRow = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
`;

/**
 * Dwie kolumny kart na monitorze, jedna na telefonie. Karty, które odpowiadają na
 * jedno pytanie w parze (rytm tygodnia, trend), zajmują całą szerokość — rozdzielone
 * kazałyby porównywać dwa rysunki oddalone od siebie o pół ekranu.
 */
const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 16px;
    align-items: start;
`;

const WideCard = styled(AnalyticsCard)`
    grid-column: 1 / -1;
`;

/** Rytm tygodnia to dwa osobne rysunki obok siebie, nie jeden z dwiema seriami. */
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

/** Odstępstwo: znak, etykieta i liczba — kolor jest tu trzecim sygnałem, nie jedynym. */
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
    // Granicę okna wylicza hook w momencie pobrania. Data policzona tutaj, w trakcie
    // renderu, zmieniałaby się co milisekundę i wraz z nią klucz zapytania — każde
    // przerysowanie widoku strzelałoby do serwera od nowa.
    const { data, isLoading } = useLeadAnalytics(range.days);

    return (
        <ViewContainer>
            <PageHeader
                title="Analityka leadów"
                subtitle={`Ostatnie ${range.key === '365' ? '12 miesięcy' : range.label}`}
                actions={
                    <Link to="/leads">
                        <PageHeaderGhostButton as="span">
                            <ArrowLeft /> Wróć do leadów
                        </PageHeaderGhostButton>
                    </Link>
                }
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RANGES.map((entry) => (
                    <FilterChip
                        key={entry.key}
                        $active={rangeKey === entry.key}
                        onClick={() => setRangeKey(entry.key)}
                    >
                        {entry.label}
                    </FilterChip>
                ))}
            </div>

            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}
            {data && data.totalCreated === 0 && (
                <EmptyHint>Brak zapytań w tym okresie — nie ma czego liczyć.</EmptyHint>
            )}
            {data && data.totalCreated > 0 && <Report data={data} monthly={range.key === '365'} />}
        </ViewContainer>
    );
}

function Report({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const enoughForRhythm = data.totalCreated >= MIN_LEADS_FOR_RHYTHM;
    const inquiryPeak = peakOf(data.inquiriesByWeekday);
    const decisionPeak = peakOf(data.decisionsByWeekday);
    const monthPeak = peakOf(data.inquiriesByMonthDay);

    const weekdayColumns = (stats: { weekday: number; count: number }[], peakIndex: number | null): Column[] =>
        stats.map((entry, index) => ({
            key: String(entry.weekday),
            tick: WEEKDAY_LABELS[index],
            value: entry.count,
            caption: `${WEEKDAY_LABELS[index]}: ${entry.count}`,
            highlighted: index === peakIndex,
        }));

    // Tematy z jednym zapytaniem to nie jest wiedza o tym, w czym wygrywamy —
    // to jedno zdarzenie. Próg trzech odsiewa je, nie ukrywając niczego istotnego.
    const categories = data.categories.filter((entry) => entry.count >= 3).slice(0, 8);
    const bestCategory = [...categories]
        .filter((entry) => entry.conversionRate !== null)
        .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0];
    const worstCategory = [...categories]
        .filter((entry) => entry.conversionRate !== null)
        .sort((a, b) => (a.conversionRate ?? 0) - (b.conversionRate ?? 0))[0];

    const bestSource = [...data.bySource]
        .filter((entry) => entry.winRate !== null && entry.closed >= 5)
        .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];

    const impact = data.responseImpact;
    const responseAnswer = (() => {
        if (impact.verdict === 'NOT_ENOUGH_DATA') {
            return 'Za mało rozstrzygniętych zapytań, żeby cokolwiek stwierdzić. Wróć tu przy szerszym zakresie.';
        }
        if (impact.verdict === 'FASTER_WINS') {
            const gap = (impact.fastWinRate ?? 0) - (impact.slowWinRate ?? 0);
            return (
                <>
                    <strong>Tak — szybka odpowiedź się opłaca.</strong> Odpisując w ciągu doby wygrywasz{' '}
                    {percent(impact.fastWinRate)} zapytań, później {percent(impact.slowWinRate)}. Różnica{' '}
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
        <>
            <TileRow>
                <StatTile
                    icon={Inbox}
                    value={data.totalCreated}
                    label="Zapytania"
                    accentColor="#0ea5e9"
                    bgGradient="linear-gradient(180deg, rgba(14,165,233,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(14,165,233,0.12)"
                    subContent="w wybranym okresie"
                />
                <StatTile
                    icon={Target}
                    value={percent(data.conversionRate)}
                    label="Skuteczność"
                    accentColor="#16a34a"
                    bgGradient="linear-gradient(180deg, rgba(22,163,74,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(22,163,74,0.12)"
                    subContent="wygrane / rozstrzygnięte"
                />
                <StatTile
                    icon={Banknote}
                    value={formatGrosze(data.wonValue)}
                    label="Wygrane"
                    accentColor="#16a34a"
                    bgGradient="linear-gradient(180deg, rgba(22,163,74,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(22,163,74,0.12)"
                />
                {/* Ile pieniędzy przeszło obok. Jedna liczba, zero analizy — i jedyna,
                    która sama z siebie każe otworzyć listę przegranych. */}
                <StatTile
                    icon={TrendingDown}
                    value={formatGrosze(data.lostValue)}
                    label="Przegrane"
                    accentColor="#dc2626"
                    bgGradient="linear-gradient(180deg, rgba(220,38,38,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(220,38,38,0.12)"
                    subContent="wartość utraconych zapytań"
                />
                <StatTile
                    icon={Clock3}
                    value={formatMinutes(data.medianFirstResponseMinutes)}
                    label="Pierwsza odpowiedź"
                    accentColor="#7c3aed"
                    bgGradient="linear-gradient(180deg, rgba(124,58,237,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(124,58,237,0.12)"
                    subContent="mediana czasu reakcji"
                />
                {/* Po ilu dniach ciszy można odpuścić — jedyna liczba, która pozwala
                    przestać wracać do zapytań, z których nic nie będzie. */}
                <StatTile
                    icon={CalendarClock}
                    value={formatDays(data.medianDaysToDecision)}
                    label="Czas do decyzji"
                    accentColor="#0f766e"
                    bgGradient="linear-gradient(180deg, rgba(15,118,110,0.06) 0%, #ffffff 55%)"
                    iconBg="rgba(15,118,110,0.12)"
                    subContent="mediana od zapytania do rezerwacji"
                />
            </TileRow>

            <CardGrid>
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

                <WideCard
                    question="Rytm miesiąca"
                    answer={
                        !enoughForRhythm
                            ? 'Za mało zapytań, żeby rozkład na dni miesiąca cokolwiek znaczył.'
                            : (
                                <>
                                    Szczyt wypada <strong>{monthPeak?.index !== undefined ? monthPeak.index + 1 : '—'}. dnia miesiąca</strong>
                                    {' '}({monthPeak?.count} zapytań).
                                </>
                            )
                    }
                >
                    <ColumnChart
                        columns={data.inquiriesByMonthDay.map((entry) => ({
                            key: String(entry.day),
                            tick: String(entry.day),
                            value: entry.count,
                            caption: `${entry.day}. dnia: ${entry.count} zapytań`,
                            highlighted: entry.day === (monthPeak ? monthPeak.index + 1 : -1),
                        }))}
                        height={100}
                        tickEvery={5}
                    />
                </WideCard>

                <AnalyticsCard
                    question="W czym wygrywamy, w czym przegrywamy"
                    answer={
                        categories.length === 0
                            ? 'Za mało rozstrzygniętych zapytań w poszczególnych usługach.'
                            : (
                                <>
                                    Najlepiej idzie w usłudze{' '}
                                    <strong>{bestCategory?.label ?? '—'}</strong> ({percent(bestCategory?.conversionRate)}),
                                    najgorzej w <strong>{worstCategory?.label ?? '—'}</strong>{' '}
                                    ({percent(worstCategory?.conversionRate)}).
                                </>
                            )
                    }
                >
                    {categories.length === 0 ? (
                        <EmptyChart>Wróć tu, gdy zamkniesz więcej zapytań.</EmptyChart>
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
                        zapytaniach się opiera.
                    </EmptyChart>
                </AnalyticsCard>

                <AnalyticsCard
                    question="Czy coś odstaje"
                    answer={
                        data.vehicleOutliers.length === 0
                            ? 'Nie wykryto odstępstw — żadna marka nie odbiega wyraźnie od Twojej średniej skuteczności.'
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
                                            {' — '}
                                            {outlier.won} z {outlier.closed}
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
                            : 'Za mało rozstrzygniętych zapytań, żeby porównać kanały.'
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

                <AnalyticsCard
                    question="Dlaczego przegrywamy"
                    answer={
                        data.lostReasons.length === 0
                            ? 'Żaden przegrany lead nie ma podanego powodu — bez tego nie da się nic poprawić.'
                            : (
                                <>
                                    Najczęstszy powód to <strong>{data.lostReasons[0].label}</strong>{' '}
                                    ({percent(data.lostReasons[0].share)} przegranych).
                                </>
                            )
                    }
                >
                    {data.lostReasons.length > 0 && (
                        <RankedBars
                            color={LOST}
                            rows={data.lostReasons.map((entry) => ({
                                key: entry.code,
                                label: entry.label,
                                value: entry.count,
                                meta: `${entry.count}, ${percent(entry.share)}`,
                            }))}
                        />
                    )}
                </AnalyticsCard>
            </CardGrid>
        </>
    );
}
