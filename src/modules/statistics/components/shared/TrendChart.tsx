// src/modules/statistics/components/shared/TrendChart.tsx
// Wspólny wykres trendu (słupki wartości + linia liczności) dla Przychodów i Kosztów.
// Pełna szerokość karty, animowane wejście, hover glow i klik w słupek (drill-down).
import { useState } from 'react';
import styled from 'styled-components';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { st } from '../StatisticsTheme';
import { Spinner } from './ui';
import { cardEntrance } from './animations';

const ChartWrapper = styled.div`
    padding: 24px 24px 0;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    min-width: 0;
    ${cardEntrance}
`;

const ChartHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 8px;
`;

const ChartTitle = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const LegendDots = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const LegendDot = styled.span<{ $color: string; $variant?: 'bar' | 'line' }>`
    display: inline-block;
    width: ${p => p.$variant === 'line' ? '20px' : '10px'};
    height: ${p => p.$variant === 'line' ? '3px' : '10px'};
    border-radius: ${p => p.$variant === 'line' ? '2px' : '3px'};
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const EmptyChart = styled.div<{ $height: number }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;
    height: ${p => p.$height}px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    padding-bottom: 24px;
    text-align: center;
`;

// Stały hint pod wykresem — nie ucieka, bo nie jest tooltipem
const ClickHintBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 0 10px;
    border-top: 1px solid ${st.border};
    margin-top: 8px;
    font-size: 11px;
    color: ${st.textMuted};
`;

const HintDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${p => p.$color};
    opacity: 0.25;
    flex-shrink: 0;
`;

// ─── Custom bar shape z hover glow ────────────────────────────────────────────

interface BarShapeProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    isHovered?: boolean;
    hoverColor?: string;
    glowColor?: string;
}

const ActiveBarShape = (props: BarShapeProps) => {
    const { x = 0, y = 0, width = 0, height = 0, fill, isHovered, hoverColor, glowColor } = props;
    if (!height || height <= 0) return null;
    return (
        <g style={{ cursor: 'pointer' }}>
            {isHovered && (
                <rect
                    x={x - 4}
                    y={y - 6}
                    width={width + 8}
                    height={height + 6}
                    rx={8}
                    ry={8}
                    fill={glowColor}
                    opacity={0.14}
                />
            )}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={5}
                ry={5}
                fill={isHovered ? hoverColor : fill}
                opacity={isHovered ? 1 : 0.85}
            />
        </g>
    );
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipEntry {
    dataKey?: string;
    value?: number;
}

interface TrendTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
    valueColor: string;
    countColor: string;
    formatValue: (v: number) => string;
    formatCount: (n: number) => string;
}

const TrendTooltip = ({
    active, payload, label, valueColor, countColor, formatValue, formatCount,
}: TrendTooltipProps) => {
    if (!active || !payload?.length) return null;
    const value = payload.find(e => e.dataKey === 'value');
    const count = payload.find(e => e.dataKey === 'count');
    return (
        <div
            style={{
                background: '#FFFFFF',
                border: `1px solid ${st.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                minWidth: 170,
                boxShadow: st.shadowMd,
                pointerEvents: 'none',
            }}
        >
            <p style={{ margin: '0 0 10px', fontWeight: 700, color: st.text, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            {value && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: valueColor, flexShrink: 0 }} />
                    <span style={{ color: valueColor, fontWeight: 700, fontSize: 15 }}>
                        {formatValue(value.value ?? 0)}
                    </span>
                </div>
            )}
            {count && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 2, background: countColor, flexShrink: 0 }} />
                    <span style={{ color: st.textSecondary, fontSize: 13 }}>
                        {formatCount(count.value ?? 0)}
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface TrendChartPoint {
    period: string;
    /** Główna wartość (słupki) — np. przychód lub koszt brutto */
    value: number;
    /** Liczność (linia) — np. liczba zleceń lub pozycji */
    count: number;
}

interface TrendChartProps {
    data: TrendChartPoint[];
    title: string;
    valueLabel: string;
    countLabel: string;
    formatValue: (v: number) => string;
    formatAxisValue: (v: number) => string;
    formatCount: (n: number) => string;
    /** Kolor słupków (i podświetlenia) */
    valueColor?: string;
    valueHoverColor?: string;
    countColor?: string;
    height?: number;
    isLoading?: boolean;
    emptyText?: string;
    onBarClick?: (period: string) => void;
    clickHint?: string;
}

export const TrendChart = ({
    data,
    title,
    valueLabel,
    countLabel,
    formatValue,
    formatAxisValue,
    formatCount,
    valueColor = st.accentGreen,
    valueHoverColor,
    countColor = st.accentBlue,
    height = 300,
    isLoading = false,
    emptyText = 'Brak danych dla wybranego okresu',
    onBarClick,
    clickHint,
}: TrendChartProps) => {
    const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);
    const hoverColor = valueHoverColor ?? valueColor;

    return (
        <ChartWrapper>
            <ChartHeader>
                <ChartTitle>{title}</ChartTitle>
                <LegendDots>
                    <LegendItem>
                        <LegendDot $color={valueColor} $variant="bar" />
                        {valueLabel}
                    </LegendItem>
                    <LegendItem>
                        <LegendDot $color={countColor} $variant="line" />
                        {countLabel}
                    </LegendItem>
                </LegendDots>
            </ChartHeader>

            {isLoading && <EmptyChart $height={height}><Spinner /></EmptyChart>}
            {!isLoading && data.length === 0 && <EmptyChart $height={height}>{emptyText}</EmptyChart>}

            {!isLoading && data.length > 0 && (
                <>
                    <ResponsiveContainer width="100%" height={height}>
                        <ComposedChart
                            data={data}
                            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                            onMouseMove={state => {
                                const period = state?.activePayload?.[0]?.payload?.period ?? null;
                                setHoveredPeriod(period);
                            }}
                            onMouseLeave={() => setHoveredPeriod(null)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                            <XAxis
                                dataKey="period"
                                tick={{ fontSize: 12, fill: st.textMuted }}
                                tickLine={false}
                                axisLine={{ stroke: st.border }}
                            />
                            <YAxis
                                yAxisId="value"
                                orientation="left"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: st.textMuted }}
                                tickFormatter={formatAxisValue}
                                width={42}
                            />
                            <YAxis
                                yAxisId="count"
                                orientation="right"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: st.textMuted }}
                                allowDecimals={false}
                                width={32}
                            />
                            <Tooltip
                                content={
                                    <TrendTooltip
                                        valueColor={valueColor}
                                        countColor={countColor}
                                        formatValue={formatValue}
                                        formatCount={formatCount}
                                    />
                                }
                                cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                            />
                            <Bar
                                yAxisId="value"
                                dataKey="value"
                                name={valueLabel}
                                fill={valueColor}
                                maxBarSize={48}
                                animationDuration={700}
                                animationEasing="ease-out"
                                onClick={(entry: { period?: string }) => {
                                    if (entry?.period) onBarClick?.(entry.period);
                                }}
                                shape={(props: BarShapeProps & { period?: string }) => (
                                    <ActiveBarShape
                                        {...props}
                                        isHovered={props.period === hoveredPeriod}
                                        hoverColor={hoverColor}
                                        glowColor={valueColor}
                                    />
                                )}
                            >
                                {data.map(entry => (
                                    <Cell key={entry.period} fill={valueColor} />
                                ))}
                            </Bar>
                            <Line
                                yAxisId="count"
                                dataKey="count"
                                name={countLabel}
                                type="monotone"
                                stroke={countColor}
                                strokeWidth={2.5}
                                animationDuration={900}
                                animationEasing="ease-out"
                                dot={{ r: 4, fill: countColor, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {onBarClick && clickHint && (
                        <ClickHintBar>
                            <HintDot $color={valueColor} />
                            {clickHint}
                        </ClickHintBar>
                    )}
                </>
            )}
        </ChartWrapper>
    );
};
