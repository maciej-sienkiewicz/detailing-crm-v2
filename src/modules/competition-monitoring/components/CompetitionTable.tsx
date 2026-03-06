import React, { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

// ─── Animations ────────────────────────────────────────────────────────────────

const fadeSlideIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Table ────────────────────────────────────────────────────────────────────

const TableWrapper = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radiusLg};
    border: 1px solid ${st.border};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const TableHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 14px;
    border-bottom: 1px solid ${st.border};
`;

const TableTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const TableCount = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th`
    text-align: left;
    padding: 10px 20px;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    font-weight: 600;
    font-size: ${st.fontXs};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

const ThRight = styled(Th)`
    text-align: right;
`;

const Td = styled.td`
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    color: ${st.text};
    vertical-align: middle;
`;

const TdRight = styled(Td)`
    text-align: right;
`;

const TrAnimated = styled.tr`
    animation: ${fadeSlideIn} 200ms ease both;
    transition: background ${st.transition};

    &:last-child td {
        border-bottom: none;
    }

    &:hover td {
        background: ${st.bgCardAlt};
    }
`;

const ProfileName = styled.div`
    font-weight: 700;
    color: ${st.text};
    font-size: ${st.fontSm};
`;

const ProfileHandle = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 1px;
`;

const StatValue = styled.span`
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

// ─── Trend Cell ───────────────────────────────────────────────────────────────

const TrendCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
`;

const SparklineWrapper = styled.div`
    width: 72px;
    height: 28px;
    flex-shrink: 0;
`;

const TrendBadge = styled.span<{ $up: boolean; $neutral: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;
    background: ${p => p.$neutral
        ? st.bgCardAlt
        : p.$up
            ? st.accentGreenDim
            : st.accentRedDim};
    color: ${p => p.$neutral
        ? st.textMuted
        : p.$up
            ? st.accentGreen
            : st.accentRed};
`;

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: ${st.bgCardAlt};
    border-top: 1px solid ${st.border};
    gap: 12px;
    flex-wrap: wrap;
`;

const PaginationInfo = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const PaginationButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    border-radius: 6px;
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlue : st.bgCard};
    color: ${p => p.$active ? '#fff' : st.textSecondary};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const PaginationEllipsis = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    padding: 0 4px;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

function calcTrend(profile: ProfileSummary) {
    const stats = profile.weeklyStats;
    const last  = stats[stats.length - 1]?.postCount ?? 0;
    const prev  = stats[stats.length - 2]?.postCount ?? 0;
    const pct   = prev === 0 ? null : Math.round(((last - prev) / prev) * 100);
    const up    = pct !== null && pct >= 0;
    const data  = stats.slice(-6).map(s => ({ v: s.postCount }));
    return { pct, up, data };
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    } catch {
        return iso;
    }
}

function renderPageNumbers(current: number, total: number, onClick: (p: number) => void) {
    if (total <= 1) return null;
    const pages: (number | '…')[] = [];

    if (total <= 7) {
        for (let i = 0; i < total; i++) pages.push(i);
    } else {
        pages.push(0);
        if (current > 2) pages.push('…');
        for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
        if (current < total - 3) pages.push('…');
        pages.push(total - 1);
    }

    return pages.map((p, idx) =>
        p === '…'
            ? <PaginationEllipsis key={`e-${idx}`}>···</PaginationEllipsis>
            : <PageBtn key={p} $active={p === current} onClick={() => onClick(p as number)}>{(p as number) + 1}</PageBtn>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    summaries: ProfileSummary[];
}

export const CompetitionTable: React.FC<Props> = ({ summaries }) => {
    const [page, setPage] = useState(0);

    const sortedData = useMemo(() => {
        return [...summaries].sort((a, b) => {
            const lastA = a.weeklyStats[a.weeklyStats.length - 1]?.postCount ?? 0;
            const lastB = b.weeklyStats[b.weeklyStats.length - 1]?.postCount ?? 0;
            return lastB - lastA;
        });
    }, [summaries]);

    const totalPages     = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
    const safePage       = Math.min(page, totalPages - 1);
    const paginatedData  = sortedData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
    const startItem      = safePage * PAGE_SIZE + 1;
    const endItem        = Math.min((safePage + 1) * PAGE_SIZE, sortedData.length);

    const goTo = (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1)));

    return (
        <TableWrapper>
            <TableHeader>
                <TableTitle>Ranking aktywności</TableTitle>
                <TableCount>Sortowanie: posty / ostatni tydzień</TableCount>
            </TableHeader>

            <Table>
                <thead>
                    <tr>
                        <Th style={{ width: 32, textAlign: 'center' }}>#</Th>
                        <Th>Nazwa firmy</Th>
                        <ThRight>Posty (ost. tydzień)</ThRight>
                        <ThRight>Lajki / post</ThRight>
                        <ThRight>Hist. zaangażowanie</ThRight>
                        <ThRight>Trend (4 tyg.)</ThRight>
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((profile, idx) => {
                        const lastStats = profile.weeklyStats[profile.weeklyStats.length - 1];
                        const { pct, up, data } = calcTrend(profile);
                        const rank = safePage * PAGE_SIZE + idx + 1;
                        const trendColor = pct === null ? st.textMuted : up ? st.accentGreen : st.accentRed;

                        return (
                            <TrAnimated key={profile.id} style={{ animationDelay: `${idx * 30}ms` }}>
                                <Td style={{ textAlign: 'center', color: st.textMuted, fontWeight: 600, fontSize: st.fontXs, width: 32 }}>
                                    {rank}
                                </Td>
                                <Td>
                                    <ProfileName>@{profile.username}</ProfileName>
                                    {lastStats?.weekStart && (
                                        <ProfileHandle>tydzień {formatDate(lastStats.weekStart)}</ProfileHandle>
                                    )}
                                </Td>
                                <TdRight>
                                    <StatValue>{lastStats?.postCount ?? 0}</StatValue>
                                </TdRight>
                                <TdRight>
                                    <StatValue>{Math.round(lastStats?.avgLikes ?? 0)}</StatValue>
                                </TdRight>
                                <TdRight>
                                    <StatValue>{Math.round(profile.avgEngagement)}</StatValue>
                                </TdRight>
                                <Td style={{ paddingRight: 20 }}>
                                    <TrendCell>
                                        <SparklineWrapper>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={data}>
                                                    <Line
                                                        type="monotone"
                                                        dataKey="v"
                                                        stroke={trendColor}
                                                        strokeWidth={2}
                                                        dot={false}
                                                        isAnimationActive={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </SparklineWrapper>
                                        <TrendBadge $up={up} $neutral={pct === null}>
                                            {pct === null
                                                ? '–'
                                                : `${up ? '+' : ''}${pct}%`}
                                        </TrendBadge>
                                    </TrendCell>
                                </Td>
                            </TrAnimated>
                        );
                    })}
                </tbody>
            </Table>

            <PaginationBar>
                <PaginationInfo>
                    {startItem}–{endItem} z {sortedData.length} profili
                </PaginationInfo>
                <PaginationButtons>
                    <PageBtn onClick={() => goTo(safePage - 1)} disabled={safePage === 0} title="Poprzednia strona">
                        ‹
                    </PageBtn>
                    {renderPageNumbers(safePage, totalPages, goTo)}
                    <PageBtn onClick={() => goTo(safePage + 1)} disabled={safePage >= totalPages - 1} title="Następna strona">
                        ›
                    </PageBtn>
                </PaginationButtons>
            </PaginationBar>
        </TableWrapper>
    );
};
