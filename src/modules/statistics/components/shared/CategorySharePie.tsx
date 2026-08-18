// src/modules/statistics/components/shared/CategorySharePie.tsx
// Diagram kołowy (donut) udziału kategorii, wspólny dla zakładek Przychody i Koszty.
import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '../StatisticsTheme';
import { fmtPLN, fmtPct } from './format';
import { CatDot, ChartEmpty, Spinner } from './ui';
import { prefersReducedMotion } from './animations';
import type { PieSliceDatum } from './shareSlices';

// ─── Styled ───────────────────────────────────────────────────────────────────

const PieBody = styled.div`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    @media (max-width: 480px) { grid-template-columns: 1fr; justify-items: center; }
`;

const PieLegendList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    max-height: 220px;
    overflow-y: auto;
`;

const legendFadeIn = keyframes`
    from { opacity: 0; transform: translateX(6px); }
    to   { opacity: 1; transform: translateX(0); }
`;

const PieLegendRow = styled.button<{ $active?: boolean; $clickable?: boolean; $index?: number }>`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    background: ${p => p.$active ? st.accentBlueDim : 'transparent'};
    border: none;
    border-radius: ${st.radiusSm};
    font-family: inherit;
    text-align: left;
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    transition: background ${st.transition};
    animation: ${legendFadeIn} 0.35s ease both;
    animation-delay: ${p => 0.1 + (p.$index ?? 0) * 0.05}s;
    @media (prefers-reduced-motion: reduce) { animation: none; }
    &:hover { background: ${p => p.$active ? st.accentBlueDim : (p.$clickable ? st.bg : 'transparent')}; }
`;

const PieLegendName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const PieLegendMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const PieLegendPct = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
    text-align: right;
    min-width: 48px;
`;

const PieSlicePath = styled.path<{ $dimmed: boolean; $clickable: boolean }>`
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    opacity: ${p => p.$dimmed ? 0.35 : 1};
    transition: opacity 0.15s ease;
`;

function donutSlicePath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
    // Clamp a hair below full circle: an arc where start == end renders nothing
    const span = Math.min(a1 - a0, Math.PI * 2 - 0.0001);
    const end = a0 + span;
    const large = span > Math.PI ? 1 : 0;
    const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`;
    return [
        `M ${p(rOut, a0)}`,
        `A ${rOut} ${rOut} 0 ${large} 1 ${p(rOut, end)}`,
        `L ${p(rIn, end)}`,
        `A ${rIn} ${rIn} 0 ${large} 0 ${p(rIn, a0)}`,
        'Z',
    ].join(' ');
}

// ─── Entrance sweep animation ─────────────────────────────────────────────────

const SWEEP_DURATION_MS = 700;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Postęp 0→1 animowany raz po zamontowaniu, donut "rysuje się" ruchem
 * wskazówek zegara. Przy prefers-reduced-motion od razu zwraca 1.
 */
const useSweepProgress = (): number => {
    const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0));

    useEffect(() => {
        if (prefersReducedMotion()) return;
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / SWEEP_DURATION_MS);
            setProgress(easeOutCubic(p));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    return progress;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface CategorySharePieProps {
    slices: PieSliceDatum[];
    isLoading: boolean;
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    ariaLabel: string;
    /** Rzeczownik w legendzie przy liczbie pozycji, np. "poz." / "usł." */
    countNoun?: string;
    /** Podpis pod kwotą w środku donuta */
    centerLabel?: string;
}

export const CategorySharePie = ({
    slices,
    isLoading,
    selectedCategoryId,
    onSelectCategory,
    ariaLabel,
    countNoun = 'poz.',
    centerLabel = 'Łącznie brutto',
}: CategorySharePieProps) => {
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const sweep = useSweepProgress();
    const total = slices.reduce((s, x) => s + x.value, 0);

    if (isLoading) return <ChartEmpty style={{ height: 220 }}><Spinner /></ChartEmpty>;
    if (total <= 0) return <ChartEmpty style={{ height: 220 }}>Brak danych dla wybranego okresu</ChartEmpty>;

    const size = 220, cx = size / 2, cy = size / 2, rOut = 104, rIn = 66;
    // Kąty przemnożone przez sweep: przy wejściu donut rysuje się od godziny 12.
    const { arcs } = slices.reduce<{ angle: number; arcs: (PieSliceDatum & { a0: number; a1: number })[] }>(
        (acc, s) => {
            const a1 = acc.angle + (s.value / total) * Math.PI * 2 * sweep;
            acc.arcs.push({ ...s, a0: acc.angle, a1 });
            return { angle: a1, arcs: acc.arcs };
        },
        { angle: -Math.PI / 2, arcs: [] }
    );

    const hovered = hoverKey ? slices.find(s => s.key === hoverKey) : undefined;
    const active = hovered
        ?? (selectedCategoryId ? slices.find(s => s.categoryId === selectedCategoryId) : undefined);

    const handleSliceClick = (s: PieSliceDatum) => {
        if (!s.categoryId) return;
        onSelectCategory(selectedCategoryId === s.categoryId ? null : s.categoryId);
    };

    return (
        <PieBody>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
                {arcs.map(s => (
                    <PieSlicePath
                        key={s.key}
                        d={donutSlicePath(cx, cy, rOut, rIn, s.a0, s.a1)}
                        fill={s.color}
                        stroke="#fff"
                        strokeWidth={2}
                        $clickable={!!s.categoryId}
                        $dimmed={
                            (hoverKey !== null && hoverKey !== s.key) ||
                            (hoverKey === null && selectedCategoryId !== null && selectedCategoryId !== s.categoryId)
                        }
                        onMouseEnter={() => setHoverKey(s.key)}
                        onMouseLeave={() => setHoverKey(k => (k === s.key ? null : k))}
                        onClick={() => handleSliceClick(s)}
                    >
                        <title>{`${s.name}: ${fmtPLN(s.value)} (${fmtPct(s.value, total)})`}</title>
                    </PieSlicePath>
                ))}
                {active ? (
                    <g opacity={sweep}>
                        <text x={cx} y={cy - 8} textAnchor="middle"
                              style={{ fontSize: 22, fontWeight: 800, fill: st.text, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtPct(active.value, total)}
                        </text>
                        <text x={cx} y={cy + 14} textAnchor="middle"
                              style={{ fontSize: 11, fontWeight: 600, fill: st.textMuted }}>
                            {active.name.length > 22 ? `${active.name.slice(0, 21)}...` : active.name}
                        </text>
                    </g>
                ) : (
                    <g opacity={sweep}>
                        <text x={cx} y={cy - 8} textAnchor="middle"
                              style={{ fontSize: 17, fontWeight: 800, fill: st.text, fontVariantNumeric: 'tabular-nums' }}>
                            {total.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł
                        </text>
                        <text x={cx} y={cy + 14} textAnchor="middle"
                              style={{ fontSize: 11, fontWeight: 600, fill: st.textMuted }}>
                            {centerLabel}
                        </text>
                    </g>
                )}
            </svg>

            <PieLegendList>
                {slices.map((s, idx) => (
                    <PieLegendRow
                        key={s.key}
                        type="button"
                        $active={!!s.categoryId && selectedCategoryId === s.categoryId}
                        $clickable={!!s.categoryId}
                        $index={idx}
                        title={`${s.name}: ${fmtPLN(s.value)} · ${s.itemCount} ${countNoun}`}
                        onMouseEnter={() => setHoverKey(s.key)}
                        onMouseLeave={() => setHoverKey(k => (k === s.key ? null : k))}
                        onClick={() => handleSliceClick(s)}
                    >
                        <CatDot $color={s.color} />
                        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <PieLegendName>{s.name}</PieLegendName>
                            <PieLegendMeta>{fmtPLN(s.value)}</PieLegendMeta>
                        </span>
                        <PieLegendPct>{fmtPct(s.value, total)}</PieLegendPct>
                    </PieLegendRow>
                ))}
            </PieLegendList>
        </PieBody>
    );
};
