// src/modules/live-metrics/components/HourProfileChart.tsx
import { useMemo } from 'react';
import styled from 'styled-components';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { seriesColor, seriesLabel } from './liveMetricsTheme';
import { formatCount } from './format';
import type { SeriesName } from '../types';

const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px;
    min-width: 0;
    ${cardEntrance}
`;

const Title = styled.h3`
    margin: 0 0 4px;
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
    font-variant-numeric: tabular-nums;

    b { display: block; margin-bottom: 2px; font-size: ${st.fontSm}; }
`;

interface Props {
    /** 24 liczby, indeks = godzina 0–23 w strefie studia. */
    counts: number[] | undefined;
    series: SeriesName;
    days: number;
    zone: string;
}

/**
 * O której godzinie klienci rezerwują.
 *
 * Doba jest tu osią kategorii, nie osią czasu: pytanie brzmi „która godzina",
 * a nie „kiedy dokładnie", więc 24 słupki czyta się lepiej niż linia.
 */
export const HourProfileChart = ({ counts, series, days, zone }: Props) => {
    const rows = useMemo(
        () =>
            Array.from({ length: 24 }, (_, hour) => ({
                label: `${String(hour).padStart(2, '0')}`,
                count: counts?.[hour] ?? 0,
            })),
        [counts],
    );

    const hasData = rows.some(row => row.count > 0);
    const color = seriesColor(series);

    return (
        <Card>
            <Title>O której klienci rezerwują</Title>
            <Description>
                Rozkład godzinowy z ostatnich {days} dni, czas lokalny studia ({zone}).
            </Description>

            {!hasData ? (
                <Empty>Brak rezerwacji w ostatnich {days} dniach</Empty>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={st.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="label"
                            interval={1}
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
                                        <b>{label}:00</b>
                                        {seriesLabel(series)}: {formatCount(Number(payload[0].value ?? 0))}
                                    </TooltipBox>
                                ) : null
                            }
                        />
                        <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
};
