// src/modules/live-metrics/components/KpiTile.tsx
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { seriesColor, seriesLabel } from './liveMetricsTheme';
import { formatCount, formatRelative } from './format';
import type { SeriesPoint, SeriesStats } from '../types';

const flash = keyframes`
    0%   { opacity: 0.30; }
    100% { opacity: 0; }
`;

const Card = styled.div<{ $accent: string }>`
    position: relative;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-top: 3px solid ${p => p.$accent};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 18px 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    color: ${p => p.$accent};
    ${cardEntrance}

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

/**
 * Błysk przy nowym zdarzeniu.
 *
 * Osobny element z `key` równym licznikowi zamiast stanu i efektu: zmiana klucza
 * przemontowuje go, więc animacja startuje od nowa. Stan trzymany po to, żeby po
 * 900 ms sam się wyłączył, wymuszałby setState w efekcie i kaskadę renderów przy
 * każdej ramce z WebSocketu.
 */
const Flash = styled.span<{ $color: string }>`
    position: absolute;
    inset: -1px;
    border-radius: ${st.radius};
    background: ${p => p.$color};
    pointer-events: none;
    opacity: 0;
    animation: ${flash} 900ms ease-out;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

const Label = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const Swatch = styled.span<{ $color: string }>`
    width: 9px;
    height: 9px;
    border-radius: 3px;
    background: ${p => p.$color};
    flex: none;
`;

const Value = styled.div`
    font-size: ${st.fontXxl};
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.6px;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
`;

const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};

    b {
        color: ${st.text};
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
`;

const Spark = styled.svg`
    display: block;
    width: 100%;
    height: 32px;
    margin-top: 8px;
    overflow: visible;
`;

interface Props {
    stats: SeriesStats | undefined;
    /** 60 punktów minutowych serii bazowej — iskierka pod liczbą. */
    minutePoints: SeriesPoint[] | undefined;
    series: string;
}

/**
 * Kafel jednego obszaru: ile dziś, ile w ostatniej godzinie, kiedy ostatnio.
 *
 * Liczba wiodąca to „dziś", bo to jedyna wartość, którą właściciel studia porównuje
 * z czymkolwiek w głowie. Iskierka nie ma osi ani wartości — jest kształtem ostatniej
 * godziny, nie wykresem do odczytu; dokładne liczby są na wykresach niżej.
 */
export const KpiTile = ({ stats, minutePoints, series }: Props) => {
    const color = seriesColor(series);
    const today = stats?.today ?? 0;

    const points = minutePoints ?? [];
    const max = Math.max(1, ...points.map(p => p.count));
    const path = points
        .map((point, index) => {
            const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 50;
            const y = 30 - (point.count / max) * 26;
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <Card $accent={color}>
            <Flash key={today} $color={color} aria-hidden="true" />
            <Label>
                <Swatch $color={color} />
                {seriesLabel(series)}
            </Label>
            <Value>{formatCount(today)}</Value>
            <Meta>
                <span>
                    dziś · <b>{formatCount(stats?.lastHour ?? 0)}</b> w ostatniej godz.
                </span>
                <span>
                    <b>{formatCount(stats?.total ?? 0)}</b> łącznie
                </span>
                <span>{formatRelative(stats?.lastEventAt ?? null)}</span>
            </Meta>
            {points.length > 1 && (
                <Spark viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
                    <path d={`${path} L100 32 L0 32 Z`} fill={color} opacity={0.12} />
                    <path
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                    />
                </Spark>
            )}
        </Card>
    );
};
