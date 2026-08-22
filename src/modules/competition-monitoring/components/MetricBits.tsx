import React from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { MetricTriple } from '../types';

/**
 * Współdzielone klocki UI modułu. Zasada: żadna liczba bez kontekstu,
 * każda metryka renderowana jest z deltą i/lub odniesieniem do konkurencji,
 * opisanym prostym językiem (bez żargonu analitycznego).
 */

// ─── Formatery ────────────────────────────────────────────────────────────────

export const formatNumber = (value: number | null | undefined, decimals = 0): string => {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
    if (Math.abs(value) >= 10_000) return `${(value / 1000).toFixed(0)} tys.`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} tys.`;
    return value.toFixed(decimals);
};

export const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

// ─── Karty i nagłówki ─────────────────────────────────────────────────────────

export const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    padding: 20px 24px;
`;

export const CardTitle = styled.h2`
    margin: 0 0 4px;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.2px;
`;

export const CardHint = styled.p`
    margin: 0 0 16px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.5;
`;

// ─── Delta ────────────────────────────────────────────────────────────────────

const DeltaWrap = styled.span<{ $tone: 'up' | 'down' | 'flat' }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: ${st.fontXs};
    font-weight: 700;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    color: ${p => (p.$tone === 'up' ? st.accentGreen : p.$tone === 'down' ? st.accentRed : st.textMuted)};
    background: ${p => (p.$tone === 'up' ? st.accentGreenDim : p.$tone === 'down' ? st.accentRedDim : st.bgCardAlt)};
`;

/** Zmiana vs poprzedni okres, np. "▲ 12%" / "▼ 5%" / "bez zmian". */
export const DeltaBadge: React.FC<{ deltaPct: number | null; invert?: boolean }> = ({ deltaPct, invert }) => {
    if (deltaPct === null || !Number.isFinite(deltaPct)) {
        return <DeltaWrap $tone="flat">nowe</DeltaWrap>;
    }
    if (Math.abs(deltaPct) < 1) return <DeltaWrap $tone="flat">bez zmian</DeltaWrap>;
    const positive = invert ? deltaPct < 0 : deltaPct > 0;
    return (
        <DeltaWrap $tone={positive ? 'up' : 'down'}>
            {deltaPct > 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(0)}%
        </DeltaWrap>
    );
};

// ─── Komórka metryki (wartość + delta + vs konkurencja) ──────────────────────

const CellWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const CellValueRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
`;

const CellValue = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const CellBenchmark = styled.span<{ $above: boolean | null }>`
    font-size: ${st.fontXs};
    color: ${p => (p.$above === null ? st.textMuted : p.$above ? st.accentGreen : st.accentAmber)};
`;

/**
 * Wartość metryki z pełnym kontekstem. `unit` doklejany do liczby (np. "%"),
 * benchmark opisany po ludzku: "powyżej / poniżej typowego studia".
 */
export const MetricCell: React.FC<{
    metric: MetricTriple;
    decimals?: number;
    unit?: string;
    showBenchmark?: boolean;
}> = ({ metric, decimals = 1, unit = '', showBenchmark = true }) => {
    const above =
        metric.value !== null && metric.benchmark !== null && metric.benchmark !== 0
            ? metric.value >= metric.benchmark
            : null;

    return (
        <CellWrap>
            <CellValueRow>
                <CellValue>
                    {formatNumber(metric.value, decimals)}
                    {metric.value !== null ? unit : ''}
                </CellValue>
                <DeltaBadge deltaPct={metric.deltaPct} />
            </CellValueRow>
            {showBenchmark && metric.benchmark !== null && (
                <CellBenchmark $above={above}>
                    {above === null
                        ? `mediana Twojej grupy: ${formatNumber(metric.benchmark, decimals)}${unit}`
                        : above
                            ? `powyżej mediany Twojej grupy (${formatNumber(metric.benchmark, decimals)}${unit})`
                            : `poniżej mediany Twojej grupy (${formatNumber(metric.benchmark, decimals)}${unit})`}
                </CellBenchmark>
            )}
        </CellWrap>
    );
};

// ─── Stany widoku ─────────────────────────────────────────────────────────────

export const CenterState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 56px 24px;
    text-align: center;
    color: ${st.textSecondary};
    font-size: ${st.fontMd};

    strong { color: ${st.text}; font-size: ${st.fontLg}; }
    span { color: ${st.textMuted}; font-size: ${st.fontSm}; max-width: 440px; line-height: 1.6; }
`;

export const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ig-spin 0.8s linear infinite;

    @keyframes ig-spin {
        to { transform: rotate(360deg); }
    }
`;

// ─── Pigułki / pomocnicze ────────────────────────────────────────────────────

export const Pill = styled.button<{ $active?: boolean }>`
    padding: 6px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover:not(:disabled) { border-color: ${st.borderHover}; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export const SelfTag = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;
`;
