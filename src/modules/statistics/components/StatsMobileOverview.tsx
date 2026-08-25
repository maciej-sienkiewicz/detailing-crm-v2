// src/modules/statistics/components/StatsMobileOverview.tsx
//
// Statystyki na telefonie odpowiadają na inne pytania niż na komputerze.
// Właściciel wyciąga telefon między jednym a drugim autem i chce wiedzieć:
// ile wpłynęło, czy idzie lepiej niż poprzednio i co się najlepiej sprzedaje.
// Praca administracyjna — przypisywanie usług do kategorii, przeciąganie,
// wyszukiwanie — zostaje na komputerze; tutaj byłaby tylko szumem.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from './StatisticsTheme';
import { fmtPLNFromGrosz } from './shared/format';
import { pluralPl } from '@/common/utils/plural';
import type {
    CategoryBreakdownItem, Granularity, ServiceBreakdownItem, StatsDataPoint, StatsTotals,
} from '../types';

// ─── Okresy ───────────────────────────────────────────────────────────────────

const MONTHS = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

/** „2026-08" → „sierpień 2026", „2026-Q3" → „III kw. 2026", „2026-08-25" → „25.08". */
const formatPeriodLabel = (period: string, granularity: Granularity): string => {
    if (granularity === 'YEARLY') return period;
    if (granularity === 'QUARTERLY') {
        const [year, q] = period.split('-Q');
        return q ? `${['I', 'II', 'III', 'IV'][Number(q) - 1] ?? q} kw. ${year}` : period;
    }
    if (granularity === 'DAILY') {
        const [, m, d] = period.split('-');
        return d ? `${d}.${m}` : period;
    }
    if (granularity === 'WEEKLY') return period.replace('-W', ', tydz. ');
    const [year, month] = period.split('-');
    const name = MONTHS[Number(month) - 1];
    return name ? `${name} ${year}` : period;
};

/**
 * Czy okres jeszcze trwa. Porównywanie trwającego miesiąca z zamkniętym
 * zawsze wypada źle i kłamie — trend liczymy tylko na zamkniętych okresach,
 * a bieżący pokazujemy osobno, wprost oznaczony.
 */
const isPeriodInProgress = (period: string, granularity: Granularity): boolean => {
    const now = new Date();
    const year = now.getFullYear();
    if (granularity === 'YEARLY') return period === String(year);
    if (granularity === 'QUARTERLY') return period === `${year}-Q${Math.floor(now.getMonth() / 3) + 1}`;
    if (granularity === 'MONTHLY') return period === `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (granularity === 'DAILY') {
        return period === `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    // WEEKLY: bez pewnego formatu numeru tygodnia zakładamy, że ostatni punkt trwa.
    return false;
};

// ─── Komponent ────────────────────────────────────────────────────────────────

interface Props {
    /** Wykres trendu wstrzykiwany z widoku — tuż po kwocie, przed rankingami. */
    chart?: React.ReactNode;
    points: StatsDataPoint[];
    totals: StatsTotals;
    granularity: Granularity;
    categories: CategoryBreakdownItem[];
    unassigned: ServiceBreakdownItem[];
    selectedCategoryId: string | null;
    onSelectCategory: (id: string | null) => void;
}

const TOP_SERVICES = 6;

/** „1 zlecenie", „3 zlecenia", „96 zleceń" — skrót „zl." mylił się z „zł". */
const orders = (n: number) => `${n.toLocaleString('pl-PL')} ${pluralPl(n, 'zlecenie', 'zlecenia', 'zleceń')}`;

export const StatsMobileOverview = ({
    chart, points, totals, granularity, categories, unassigned, selectedCategoryId, onSelectCategory,
}: Props) => {
    const [allServices, setAllServices] = useState(false);

    const avgOrder = totals.orderCount > 0 ? Math.round(totals.totalRevenueGross / totals.orderCount) : 0;

    /** Ostatni zamknięty okres i poprzedni — na nich liczymy zmianę. */
    const trend = useMemo(() => {
        const inProgress = points.length > 0 && isPeriodInProgress(points[points.length - 1].period, granularity)
            ? points[points.length - 1]
            : null;
        const closed = inProgress ? points.slice(0, -1) : points;
        if (closed.length === 0) return { inProgress, last: null, prev: null, changePct: null };
        const last = closed[closed.length - 1];
        const prev = closed.length > 1 ? closed[closed.length - 2] : null;
        const changePct = prev && prev.totalRevenueGross > 0
            ? ((last.totalRevenueGross - prev.totalRevenueGross) / prev.totalRevenueGross) * 100
            : null;
        return { inProgress, last, prev, changePct };
    }, [points, granularity]);

    /** Kategorie posortowane malejąco + „Nieprzypisane" jako jedna pozycja. */
    const ranking = useMemo(() => {
        const unassignedTotal = unassigned.reduce((sum, s) => sum + s.totals.totalRevenueGross, 0);
        const rows = categories.map(c => ({
            id: c.categoryId,
            name: c.categoryName,
            color: c.color ?? st.accentBlue,
            revenue: c.totals.totalRevenueGross,
            orders: c.totals.orderCount,
        }));
        if (unassignedTotal > 0) {
            rows.push({
                id: '__unassigned__',
                name: 'Bez kategorii',
                color: st.textMuted,
                revenue: unassignedTotal,
                orders: unassigned.reduce((sum, s) => sum + s.totals.orderCount, 0),
            });
        }
        rows.sort((a, b) => b.revenue - a.revenue);
        const max = rows[0]?.revenue ?? 0;
        const sum = rows.reduce((acc, r) => acc + r.revenue, 0);
        return { rows, max, sum };
    }, [categories, unassigned]);

    /** Wszystkie usługi z kategorii i spoza nich, malejąco po przychodzie. */
    const services = useMemo(() => {
        const rows = [
            ...categories.flatMap(c => c.services.map(s => ({ ...s, categoryName: c.categoryName, color: c.color ?? st.accentBlue }))),
            ...unassigned.map(s => ({ ...s, categoryName: null as string | null, color: st.textMuted })),
        ];
        rows.sort((a, b) => b.totals.totalRevenueGross - a.totals.totalRevenueGross);
        return rows;
    }, [categories, unassigned]);

    const visibleServices = allServices ? services : services.slice(0, TOP_SERVICES);

    return (
        <Wrap>
            {/* ── Ile zarobiłem ──────────────────────────────────────────── */}
            <Headline>
                <HeadlineLabel>Przychód brutto w wybranym okresie</HeadlineLabel>
                <HeadlineValue>{fmtPLNFromGrosz(totals.totalRevenueGross)}</HeadlineValue>
                <HeadlineChips>
                    <Chip>{orders(totals.orderCount)}</Chip>
                    <Chip>śr. {fmtPLNFromGrosz(avgOrder)}</Chip>
                </HeadlineChips>

                {trend.last && (
                    <TrendRow>
                        {trend.changePct !== null && (
                            <TrendPill $up={trend.changePct >= 0}>
                                {trend.changePct >= 0 ? '▲' : '▼'}{' '}
                                {Math.abs(trend.changePct).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%
                            </TrendPill>
                        )}
                        <TrendText>
                            <strong>{formatPeriodLabel(trend.last.period, granularity)}</strong>{' '}
                            {fmtPLNFromGrosz(trend.last.totalRevenueGross)}
                            {trend.prev && (
                                <TrendVs>
                                    vs {formatPeriodLabel(trend.prev.period, granularity)}{' '}
                                    {fmtPLNFromGrosz(trend.prev.totalRevenueGross)}
                                </TrendVs>
                            )}
                        </TrendText>
                    </TrendRow>
                )}

                {trend.inProgress && (
                    <InProgress>
                        {formatPeriodLabel(trend.inProgress.period, granularity)} (w toku):{' '}
                        <strong>{fmtPLNFromGrosz(trend.inProgress.totalRevenueGross)}</strong>
                        {' · '}{orders(trend.inProgress.orderCount)}
                    </InProgress>
                )}
            </Headline>

            {/* ── Jak szło w czasie ──────────────────────────────────────── */}
            {chart}

            {/* ── Co się sprzedaje: kategorie ────────────────────────────── */}
            {ranking.rows.length > 0 && (
                <Card>
                    <CardTitle>Kategorie według przychodu</CardTitle>
                    {ranking.rows.map(row => {
                        const isSelected = selectedCategoryId === row.id;
                        const share = ranking.sum > 0 ? (row.revenue / ranking.sum) * 100 : 0;
                        const selectable = row.id !== '__unassigned__';
                        return (
                            <RankRow
                                key={row.id}
                                as={selectable ? 'button' : 'div'}
                                type={selectable ? 'button' : undefined}
                                $selected={isSelected}
                                $selectable={selectable}
                                onClick={selectable ? () => onSelectCategory(isSelected ? null : row.id) : undefined}
                            >
                                <RankTop>
                                    <RankDot $color={row.color} />
                                    <RankName>{row.name}</RankName>
                                    <RankValue>{fmtPLNFromGrosz(row.revenue)}</RankValue>
                                </RankTop>
                                <RankBarTrack>
                                    <RankBarFill
                                        $color={row.color}
                                        style={{ width: `${ranking.max > 0 ? (row.revenue / ranking.max) * 100 : 0}%` }}
                                    />
                                </RankBarTrack>
                                <RankMeta>
                                    {share.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}% przychodu
                                    {' · '}{orders(row.orders)}
                                </RankMeta>
                            </RankRow>
                        );
                    })}
                    {selectedCategoryId && (
                        <ClearRow onClick={() => onSelectCategory(null)}>✕ Pokaż wszystkie kategorie</ClearRow>
                    )}
                </Card>
            )}

            {/* ── Co się sprzedaje: usługi ───────────────────────────────── */}
            {services.length > 0 && (
                <Card>
                    <CardTitle>Najlepiej sprzedające się usługi</CardTitle>
                    {visibleServices.map((s, i) => (
                        <ServiceRow key={s.serviceId}>
                            <ServiceRank>{i + 1}</ServiceRank>
                            <ServiceBody>
                                <ServiceName>{s.serviceName}</ServiceName>
                                <ServiceMeta>
                                    {s.categoryName ?? 'Bez kategorii'} · {orders(s.totals.orderCount)}
                                </ServiceMeta>
                            </ServiceBody>
                            <ServiceValue>{fmtPLNFromGrosz(s.totals.totalRevenueGross)}</ServiceValue>
                        </ServiceRow>
                    ))}
                    {services.length > TOP_SERVICES && (
                        <MoreBtn onClick={() => setAllServices(v => !v)}>
                            {allServices ? 'Pokaż tylko najlepsze' : `Pokaż wszystkie (${services.length})`}
                        </MoreBtn>
                    )}
                </Card>
            )}
        </Wrap>
    );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Headline = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px 18px 16px;
    background: #fff;
    border: 1px solid ${st.border};
    border-top: 3px solid ${st.accentGreen};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
`;

const HeadlineLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const HeadlineValue = styled.div`
    font-size: 30px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.8px;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const HeadlineChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Chip = styled.span`
    padding: 3px 9px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    font-size: 12px;
    font-weight: 600;
    color: ${st.textSecondary};
`;

const TrendRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
`;

const TrendPill = styled.span<{ $up: boolean }>`
    flex-shrink: 0;
    padding: 3px 8px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 700;
    color: ${p => (p.$up ? '#15803d' : '#b91c1c')};
    background: ${p => (p.$up ? '#f0fdf4' : '#fef2f2')};
`;

const TrendText = styled.div`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${st.textSecondary};

    strong { color: ${st.text}; }
`;

const TrendVs = styled.div`
    color: ${st.textMuted};
`;

const InProgress = styled.div`
    font-size: 12.5px;
    color: ${st.textMuted};

    strong { color: ${st.textSecondary}; }
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const CardTitle = styled.div`
    padding: 13px 16px 10px;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const RankRow = styled.button<{ $selected: boolean; $selectable: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    padding: 11px 16px;
    background: ${p => (p.$selected ? st.accentBlueDim : 'transparent')};
    border: none;
    border-top: 1px solid ${st.border};
    font-family: inherit;
    text-align: left;
    cursor: ${p => (p.$selectable ? 'pointer' : 'default')};

    &:active { background: ${p => (p.$selectable ? st.bgCardAlt : 'transparent')}; }
`;

const RankTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RankDot = styled.span<{ $color: string }>`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const RankName = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const RankValue = styled.span`
    font-size: 13.5px;
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const RankBarTrack = styled.div`
    height: 5px;
    border-radius: 3px;
    background: ${st.bgCardAlt};
    overflow: hidden;
`;

const RankBarFill = styled.div<{ $color: string }>`
    height: 100%;
    border-radius: 3px;
    background: ${p => p.$color};
    transition: width 0.3s ease;
`;

const RankMeta = styled.div`
    font-size: 11.5px;
    color: ${st.textMuted};
`;

const ClearRow = styled.button`
    padding: 11px 16px;
    background: transparent;
    border: none;
    border-top: 1px solid ${st.border};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: ${st.accentBlue};
    text-align: left;
    cursor: pointer;
`;

const ServiceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    border-top: 1px solid ${st.border};
`;

const ServiceRank = styled.span`
    width: 20px;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 800;
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const ServiceBody = styled.div`
    flex: 1;
    min-width: 0;
`;

const ServiceName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ServiceMeta = styled.div`
    font-size: 11.5px;
    color: ${st.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ServiceValue = styled.span`
    font-size: 13.5px;
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const MoreBtn = styled.button`
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-top: 1px solid ${st.border};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
`;
