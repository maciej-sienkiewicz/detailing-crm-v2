// src/modules/live-metrics/components/SeriesChart.tsx
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { seriesColor, seriesLabel } from './liveMetricsTheme';
import { formatClock, formatCount, formatDayShort, formatHourSlot } from './format';
import type { LiveMetricsOverview, RangeKey, SeriesName, SeriesPoint } from '../types';

const RANGE_LABELS: Record<RangeKey, string> = {
    minute: '60 min',
    hour: '24 h',
    day: '30 dni',
};

const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px;
    min-width: 0;
    ${cardEntrance}
`;

const Header = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 4px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Description = styled.p`
    margin: 0 0 14px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    max-width: 62ch;
`;

const RangeSwitch = styled.div`
    display: inline-flex;
    gap: 4px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 3px;
`;

const RangeButton = styled.button<{ $active: boolean }>`
    border: none;
    cursor: pointer;
    padding: 5px 11px;
    border-radius: 6px;
    font-size: ${st.fontXs};
    font-weight: 700;
    background: ${p => (p.$active ? st.bgCard : 'transparent')};
    color: ${p => (p.$active ? st.text : st.textSecondary)};
    box-shadow: ${p => (p.$active ? st.shadowXs : 'none')};
    transition: ${st.transition};

    &:hover { color: ${st.text}; }
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 12px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const LegendItem = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;

    &::before {
        content: '';
        width: 9px;
        height: 9px;
        border-radius: 3px;
        background: ${p => p.$color};
    }
`;

const Empty = styled.div`
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const TooltipBox = styled.div`
    background: ${st.text};
    color: #fff;
    border-radius: ${st.radiusSm};
    padding: 8px 10px;
    font-size: ${st.fontXs};
    box-shadow: ${st.shadowMd};

    b { display: block; margin-bottom: 4px; font-size: ${st.fontSm}; }
`;

const TooltipRow = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-variant-numeric: tabular-nums;

    &::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 2px;
        background: ${p => p.$color};
        margin-right: -8px;
    }

    span:first-of-type { flex: 1; }
`;

interface ChartRow {
    label: string;
    [series: string]: string | number;
}

interface Props {
    title: string;
    description: string;
    overview: LiveMetricsOverview;
    /** Jedna seria = wykres pojedynczy; kilka = stos (suma równa serii bazowej). */
    series: SeriesName[];
    ranges?: RangeKey[];
    defaultRange?: RangeKey;
}

const bucketsFor = (overview: LiveMetricsOverview, range: RangeKey): Record<string, SeriesPoint[]> =>
    range === 'minute'
        ? overview.lastHourByMinute
        : range === 'hour'
          ? overview.last24hByHour
          : overview.last30dByDay;

/**
 * Wykres przyrostu w czasie dla jednej lub kilku serii.
 *
 * Okno minutowe rysujemy obszarem: sześćdziesiąt wąskich słupków obok siebie to szum,
 * a pytanie brzmi „czy teraz coś się dzieje", czyli o kształt. Okna godzinowe i dzienne
 * to słupki, bo każdy kubełek jest osobnym, policzalnym faktem. Kilka serii zawsze idzie
 * na stos, nigdy na drugą oś — dwie skale na jednym wykresie kłamią o proporcjach.
 */
export const SeriesChart = ({
    title,
    description,
    overview,
    series,
    ranges = ['minute', 'hour', 'day'],
    defaultRange,
}: Props) => {
    const [range, setRange] = useState<RangeKey>(defaultRange ?? ranges[0]);
    const zone = overview.zone;

    const rows = useMemo<ChartRow[]>(() => {
        const buckets = bucketsFor(overview, range);
        const reference = buckets[series[0]] ?? [];
        return reference.map((point, index) => {
            const label =
                range === 'minute'
                    ? formatClock(point.at, zone)
                    : range === 'hour'
                      ? formatHourSlot(point.at, zone)
                      : formatDayShort(point.at, zone);
            const row: ChartRow = { label };
            for (const name of series) {
                row[name] = buckets[name]?.[index]?.count ?? 0;
            }
            return row;
        });
    }, [overview, range, series, zone]);

    const hasData = rows.some(row => series.some(name => Number(row[name]) > 0));
    const asArea = range === 'minute' && series.length === 1;
    // Etykiet na osi X musi być tyle, ile da się przeczytać, nie tyle ile kubełków.
    const tickInterval = Math.max(0, Math.ceil(rows.length / 8) - 1);

    const axes = (
        <>
            <CartesianGrid stroke={st.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
                dataKey="label"
                interval={tickInterval}
                tick={{ fill: st.textMuted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: st.border }}
            />
            <YAxis
                allowDecimals={false}
                width={34}
                tick={{ fill: st.textMuted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip
                cursor={{ fill: st.bgCardAlt }}
                content={({ active, payload, label }) =>
                    active && payload?.length ? (
                        <TooltipBox>
                            <b>{label}</b>
                            {payload.map(entry => {
                                const name = String(entry.dataKey);
                                return (
                                    <TooltipRow key={name} $color={seriesColor(name)}>
                                        <span>{seriesLabel(name)}</span>
                                        <span>{formatCount(Number(entry.value ?? 0))}</span>
                                    </TooltipRow>
                                );
                            })}
                        </TooltipBox>
                    ) : null
                }
            />
        </>
    );

    return (
        <Card>
            <Header>
                <Title>{title}</Title>
                {ranges.length > 1 && (
                    <RangeSwitch role="group" aria-label={`Zakres czasu: ${title}`}>
                        {ranges.map(key => (
                            <RangeButton
                                key={key}
                                type="button"
                                $active={key === range}
                                aria-pressed={key === range}
                                onClick={() => setRange(key)}
                            >
                                {RANGE_LABELS[key]}
                            </RangeButton>
                        ))}
                    </RangeSwitch>
                )}
            </Header>
            <Description>{description}</Description>

            {!hasData ? (
                <Empty>Brak zdarzeń w tym oknie</Empty>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    {asArea ? (
                        <AreaChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                            {axes}
                            <Area
                                type="monotone"
                                dataKey={series[0]}
                                stroke={seriesColor(series[0])}
                                strokeWidth={2}
                                fill={seriesColor(series[0])}
                                fillOpacity={0.12}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                            {axes}
                            {series.map(name => (
                                <Bar
                                    key={name}
                                    dataKey={name}
                                    stackId="events"
                                    fill={seriesColor(name)}
                                    radius={[3, 3, 0, 0]}
                                    isAnimationActive={false}
                                />
                            ))}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            )}

            {series.length > 1 && (
                <Legend>
                    {series.map(name => (
                        <LegendItem key={name} $color={seriesColor(name)}>
                            {seriesLabel(name)}
                        </LegendItem>
                    ))}
                </Legend>
            )}
        </Card>
    );
};
