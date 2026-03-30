// src/modules/statistics/components/ServiceDelayTable.tsx
import { useState } from 'react';
import styled from 'styled-components';
import type { ServiceDelayItem } from '../types';
import { st } from './StatisticsTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'occurrences' | 'avgDelayDays' | 'delayRatePct';
type SortDir = 'asc' | 'desc';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const TableHead = styled.div`
    display: grid;
    grid-template-columns: 36px 1fr 100px 110px 200px;
    gap: 0;
    padding: 10px 20px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};

    @media (max-width: 800px) {
        grid-template-columns: 36px 1fr 100px 110px;
    }
`;

const Th = styled.button<{ $sortable?: boolean; $active?: boolean; $align?: 'right' }>`
    all: unset;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${p => p.$active ? st.text : st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    cursor: ${p => p.$sortable ? 'pointer' : 'default'};
    text-align: ${p => p.$align === 'right' ? 'right' : 'left'};
    user-select: none;
    transition: color ${st.transition};
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: ${p => p.$align === 'right' ? 'flex-end' : 'flex-start'};

    &:hover {
        color: ${p => p.$sortable ? st.text : st.textMuted};
    }
`;

const SortIcon = styled.span<{ $dir: SortDir; $active: boolean }>`
    font-size: 10px;
    opacity: ${p => p.$active ? 1 : 0.35};
    transition: opacity ${st.transition};
`;

const TableBody = styled.div``;

const Row = styled.div<{ $rank: number }>`
    display: grid;
    grid-template-columns: 36px 1fr 100px 110px 200px;
    gap: 0;
    padding: 14px 20px;
    align-items: center;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${st.bgCardAlt};
    }

    @media (max-width: 800px) {
        grid-template-columns: 36px 1fr 100px 110px;
    }
`;

const Rank = styled.span<{ $rank: number }>`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${p =>
        p.$rank === 1 ? '#B45309' :
        p.$rank === 2 ? st.textSecondary :
        p.$rank === 3 ? '#92400E' :
        st.textMuted};
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: ${p =>
        p.$rank === 1 ? 'rgba(245,158,11,0.15)' :
        p.$rank === 2 ? 'rgba(148,163,184,0.12)' :
        p.$rank === 3 ? 'rgba(180,83,9,0.10)' :
        'transparent'};
`;

const ServiceName = styled.div``;

const Name = styled.span<{ $inactive?: boolean }>`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${p => p.$inactive ? st.textMuted : st.text};
    display: block;
`;

const InactiveBadge = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 6px;
    vertical-align: middle;
`;

const OccurrenceCell = styled.div`
    text-align: right;
`;

const BigNum = styled.span<{ $color?: string }>`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${p => p.$color ?? st.text};
    font-variant-numeric: tabular-nums;
`;

const SmallText = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    display: block;
`;

const DelayCell = styled.div`
    text-align: right;
`;

const BarCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: 800px) {
        display: none;
    }
`;

const BarTrack = styled.div`
    flex: 1;
    height: 8px;
    background: ${st.bgCardAlt};
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid ${st.border};
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
    width: ${p => Math.min(p.$pct, 100)}%;
    height: 100%;
    background: ${p => p.$color};
    border-radius: 4px;
    transition: width 0.4s ease;
`;

const BarLabel = styled.span<{ $color: string }>`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${p => p.$color};
    min-width: 38px;
    text-align: right;
    font-variant-numeric: tabular-nums;
`;

const EmptyRow = styled.div`
    padding: 40px 20px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDays = (d: number) =>
    d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`;

const delayColor = (pct: number): string => {
    if (pct >= 60) return st.accentRed;
    if (pct >= 30) return st.accentAmber;
    return st.accentGreen;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ServiceDelayTableProps {
    services: ServiceDelayItem[];
    isLoading?: boolean;
}

export const ServiceDelayTable = ({ services, isLoading }: ServiceDelayTableProps) => {
    const [sortKey, setSortKey] = useState<SortKey>('occurrences');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = [...services].sort((a, b) => {
        const dir = sortDir === 'desc' ? -1 : 1;
        return (a[sortKey] - b[sortKey]) * dir;
    });

    const sortIcon = (key: SortKey) => (
        <SortIcon $dir={sortDir} $active={sortKey === key}>
            {sortKey === key ? (sortDir === 'desc' ? '▼' : '▲') : '↕'}
        </SortIcon>
    );

    return (
        <Wrapper>
            <TableHead>
                <Th>#</Th>
                <Th>Usługa</Th>
                <Th
                    $sortable
                    $active={sortKey === 'occurrences'}
                    $align="right"
                    onClick={() => handleSort('occurrences')}
                >
                    Wystąpienia {sortIcon('occurrences')}
                </Th>
                <Th
                    $sortable
                    $active={sortKey === 'avgDelayDays'}
                    $align="right"
                    onClick={() => handleSort('avgDelayDays')}
                >
                    Śr. opóźn. {sortIcon('avgDelayDays')}
                </Th>
                <Th
                    $sortable
                    $active={sortKey === 'delayRatePct'}
                    onClick={() => handleSort('delayRatePct')}
                >
                    Udział opóźnień {sortIcon('delayRatePct')}
                </Th>
            </TableHead>

            <TableBody>
                {isLoading && (
                    <EmptyRow>Ładowanie danych…</EmptyRow>
                )}

                {!isLoading && sorted.length === 0 && (
                    <EmptyRow>Brak danych o opóźnieniach w wybranym okresie</EmptyRow>
                )}

                {!isLoading && sorted.map((service, idx) => {
                    const rank = idx + 1;
                    const color = delayColor(service.delayRatePct);

                    return (
                        <Row key={service.serviceId} $rank={rank}>
                            <Rank $rank={rank}>{rank}</Rank>

                            <ServiceName>
                                <Name $inactive={!service.isActive}>
                                    {service.serviceName}
                                    {!service.isActive && <InactiveBadge>nieaktywna</InactiveBadge>}
                                </Name>
                                <SmallText>{service.totalOccurrences} wizyt łącznie</SmallText>
                            </ServiceName>

                            <OccurrenceCell>
                                <BigNum $color={color}>{service.occurrences}</BigNum>
                                <SmallText>opóźnionych</SmallText>
                            </OccurrenceCell>

                            <DelayCell>
                                <BigNum $color={color}>{fmtDays(service.avgDelayDays)}</BigNum>
                                <SmallText>średnio</SmallText>
                            </DelayCell>

                            <BarCell>
                                <BarTrack>
                                    <BarFill $pct={service.delayRatePct} $color={color} />
                                </BarTrack>
                                <BarLabel $color={color}>
                                    {service.delayRatePct.toFixed(0)}%
                                </BarLabel>
                            </BarCell>
                        </Row>
                    );
                })}
            </TableBody>
        </Wrapper>
    );
};
