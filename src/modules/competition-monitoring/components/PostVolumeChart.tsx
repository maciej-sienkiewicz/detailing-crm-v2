/**
 * PostVolumeChart
 * – Trend liczby postów tygodniowo dla wybranych profili konkurencji.
 * – Selekcja profili: dropdown z checkboxami + mini-sparkline (wzorowany na SeasonalityPulse).
 * – Zakres dat: 3M / 6M / 12M / Wszystko — filtrowanie po stronie klienta.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    type TooltipProps,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
    st.accentBlue,
    st.accentGreen,
    '#8B5CF6',
    st.accentAmber,
    '#EC4899',
    '#06B6D4',
    '#F97316',
    '#14B8A6',
];

type DateRange = '3M' | '6M' | '12M' | 'ALL';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string; weeks: number | null }[] = [
    { key: '3M',  label: '3 mies.',  weeks: 13 },
    { key: '6M',  label: '6 mies.',  weeks: 26 },
    { key: '12M', label: '12 mies.', weeks: 52 },
    { key: 'ALL', label: 'Wszystko', weeks: null },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWeekLabel(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    } catch {
        return iso;
    }
}

function filterByRange(weeklyStats: ProfileSummary['weeklyStats'], weeks: number | null) {
    if (weeks === null) return weeklyStats;
    return weeklyStats.slice(-weeks);
}

// ─── Styled Components ────────────────────────────────────────────────────────

const ChartWrapper = styled.div`
    padding: 20px 20px 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
`;

const ChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
`;

const ChartTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

// ─── Controls row (range buttons + dropdown) ─────────────────────────────────

const ControlsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const RangeGroup = styled.div`
    display: flex;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
`;

const RangeBtn = styled.button<{ $active: boolean }>`
    padding: 5px 12px;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    border: none;
    border-right: 1px solid ${st.border};
    background: ${p => p.$active ? st.accentBlue : st.bgCard};
    color: ${p => p.$active ? '#fff' : st.textSecondary};
    transition: all ${st.transition};
    white-space: nowrap;

    &:last-child { border-right: none; }

    &:hover:not([data-active="true"]) {
        background: ${st.bgCardAlt};
        color: ${st.text};
    }
`;

// ─── Profile dropdown ─────────────────────────────────────────────────────────

const DropdownWrapper = styled.div`
    position: relative;
`;

const DropdownToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.textSecondary};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

const DropdownPanel = styled.div<{ $open: boolean }>`
    display: ${p => p.$open ? 'block' : 'none'};
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    width: 300px;
    max-height: 380px;
    overflow-y: auto;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 50;
    padding: 6px 0;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 2px; }
`;

const DropdownDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const DropdownItem = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: ${p => p.$active ? st.accentBlueDim : 'transparent'};
    border: none;
    color: ${st.text};
    font-size: ${st.fontSm};
    cursor: pointer;
    transition: background ${st.transition};
    text-align: left;

    &:hover {
        background: ${p => p.$active ? st.accentBlueDim : st.bgCardAlt};
    }
`;

const Checkbox = styled.div<{ $active: boolean; $color: string }>`
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    border: 2px solid ${p => p.$active ? p.$color : st.border};
    border-radius: 4px;
    background: ${p => p.$active ? p.$color : 'transparent'};
    position: relative;
    transition: all ${st.transition};

    &::after {
        content: '${p => p.$active ? '✓' : ''}';
        position: absolute;
        top: -2px;
        left: 1px;
        font-size: 10px;
        color: #fff;
        font-weight: 700;
    }
`;

const ItemLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
`;

const ItemName = styled.span`
    font-weight: 600;
    font-size: ${st.fontSm};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${st.text};
`;

const ItemMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const SparklineContainer = styled.div`
    width: 56px;
    height: 22px;
    flex-shrink: 0;
`;

const SelectAllBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 12px;
    background: transparent;
    border: none;
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover { background: ${st.accentBlueDim}; }
`;

// ─── Legend chips ─────────────────────────────────────────────────────────────

const LegendRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    min-height: 28px;
`;

const LegendChip = styled.button<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    color: ${st.textSecondary};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${p => p.$color};
        background: ${p => `${p.$color}18`};
        color: ${st.text};
    }
`;

const LegendDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const RemoveIcon = styled.span`
    font-size: 10px;
    color: ${st.textMuted};
    line-height: 1;
`;

const EmptyLegend = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    padding: 4px 0;
`;

// ─── Chart area ───────────────────────────────────────────────────────────────

const EmptyChart = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Mini Sparkline (SVG) ─────────────────────────────────────────────────────

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const W = 56, H = 22, P = 2;

    const points = data.map((v, i) => {
        const x = P + (i / (data.length - 1)) * (W - P * 2);
        const y = H - P - ((v - min) / range) * (H - P * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
        <SparklineContainer>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </SparklineContainer>
    );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#FFFFFF',
            border: `1px solid ${st.border}`,
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            minWidth: 160,
            boxShadow: st.shadowMd,
        }}>
            <p style={{
                margin: '0 0 10px',
                fontWeight: 700,
                color: st.text,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>
                Tydzień od {label}
            </p>
            {payload.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{
                        display: 'inline-block',
                        width: 10, height: 3,
                        borderRadius: 2,
                        background: entry.stroke,
                        flexShrink: 0,
                    }} />
                    <span style={{ color: st.textSecondary, fontSize: 12 }}>@{entry.dataKey}</span>
                    <span style={{ color: st.text, fontWeight: 700, marginLeft: 'auto', paddingLeft: 12 }}>
                        {entry.value ?? '–'}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PostVolumeChart: React.FC<{ summaries: ProfileSummary[] }> = ({ summaries }) => {
    const [dateRange, setDateRange] = useState<DateRange>('12M');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(summaries.map(s => s.id)));
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync when summaries change (e.g. new profile added)
    useEffect(() => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            summaries.forEach(s => { if (!next.has(s.id)) next.add(s.id); });
            return next;
        });
    }, [summaries]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const rangeWeeks = DATE_RANGE_OPTIONS.find(r => r.key === dateRange)?.weeks ?? null;

    const selectedProfiles = useMemo(
        () => summaries.filter(s => selectedIds.has(s.id)),
        [summaries, selectedIds],
    );

    const chartData = useMemo(() => {
        const weeksMap: Record<string, Record<string, number>> = {};
        selectedProfiles.forEach(profile => {
            filterByRange(profile.weeklyStats, rangeWeeks).forEach(stat => {
                if (!weeksMap[stat.weekStart]) weeksMap[stat.weekStart] = {};
                weeksMap[stat.weekStart][profile.username] = stat.postCount;
            });
        });
        // Fill missing weeks with 0 so Recharts doesn't render gaps in the line
        const usernames = selectedProfiles.map(p => p.username);
        return Object.entries(weeksMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([weekStart, counts]) => {
                const filled: Record<string, number | string> = { name: formatWeekLabel(weekStart) };
                usernames.forEach(u => { filled[u] = counts[u] ?? 0; });
                return filled;
            });
    }, [selectedProfiles, rangeWeeks]);

    const toggleProfile = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(summaries.map(s => s.id)));
    const clearAll  = () => setSelectedIds(new Set());

    const allSelected = selectedIds.size === summaries.length;

    return (
        <ChartWrapper>
            {/* ── Header ── */}
            <ChartHeader>
                <ChartTitle>Trend liczby postów tygodniowo</ChartTitle>

                <ControlsRow>
                    {/* Range picker */}
                    <RangeGroup>
                        {DATE_RANGE_OPTIONS.map(opt => (
                            <RangeBtn
                                key={opt.key}
                                $active={dateRange === opt.key}
                                data-active={dateRange === opt.key}
                                onClick={() => setDateRange(opt.key)}
                            >
                                {opt.label}
                            </RangeBtn>
                        ))}
                    </RangeGroup>

                    {/* Profile selector */}
                    <DropdownWrapper ref={dropdownRef}>
                        <DropdownToggle onClick={() => setDropdownOpen(v => !v)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Profile ({selectedIds.size}/{summaries.length})
                        </DropdownToggle>

                        <DropdownPanel $open={dropdownOpen}>
                            <SelectAllBtn onClick={allSelected ? clearAll : selectAll}>
                                {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                            </SelectAllBtn>
                            <DropdownDivider />
                            {summaries.map((profile, idx) => {
                                const color = COLORS[idx % COLORS.length];
                                const active = selectedIds.has(profile.id);
                                const sparkData = filterByRange(profile.weeklyStats, 13)
                                    .map(s => s.postCount);
                                const lastWeek = profile.weeklyStats[profile.weeklyStats.length - 1];
                                return (
                                    <DropdownItem
                                        key={profile.id}
                                        $active={active}
                                        onClick={() => toggleProfile(profile.id)}
                                    >
                                        <Checkbox $active={active} $color={color} />
                                        <ItemLabel>
                                            <ItemName>@{profile.username}</ItemName>
                                            <ItemMeta>
                                                {lastWeek?.postCount ?? 0} postów / ost. tydzień
                                            </ItemMeta>
                                        </ItemLabel>
                                        <MiniSparkline data={sparkData} color={active ? color : st.border} />
                                    </DropdownItem>
                                );
                            })}
                        </DropdownPanel>
                    </DropdownWrapper>
                </ControlsRow>
            </ChartHeader>

            {/* ── Legend chips ── */}
            <LegendRow>
                {selectedProfiles.length === 0
                    ? <EmptyLegend>Brak wybranych profili — kliknij „Profile" aby dodać</EmptyLegend>
                    : selectedProfiles.map((profile, idx) => {
                        const color = COLORS[summaries.findIndex(s => s.id === profile.id) % COLORS.length];
                        return (
                            <LegendChip
                                key={profile.id}
                                $color={color}
                                onClick={() => toggleProfile(profile.id)}
                                title="Kliknij aby ukryć"
                            >
                                <LegendDot $color={color} />
                                @{profile.username}
                                <RemoveIcon>✕</RemoveIcon>
                            </LegendChip>
                        );
                    })}
            </LegendRow>

            {/* ── Chart ── */}
            {selectedProfiles.length === 0 || chartData.length === 0 ? (
                <EmptyChart>
                    {selectedProfiles.length === 0
                        ? 'Wybierz co najmniej jeden profil, aby zobaczyć wykres'
                        : 'Brak danych w wybranym zakresie'}
                </EmptyChart>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={{ stroke: st.border }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            width={28}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: st.border, strokeWidth: 1 }}
                        />
                        {selectedProfiles.map((profile) => {
                            const idx = summaries.findIndex(s => s.id === profile.id);
                            const color = COLORS[idx % COLORS.length];
                            return (
                                <Line
                                    key={profile.id}
                                    type="monotone"
                                    dataKey={profile.username}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            )}
        </ChartWrapper>
    );
};
