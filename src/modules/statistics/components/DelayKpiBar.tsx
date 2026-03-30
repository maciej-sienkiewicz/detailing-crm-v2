// src/modules/statistics/components/DelayKpiBar.tsx
import styled from 'styled-components';
import type { DelayOverview, ServiceDelayItem } from '../types';
import { st } from './StatisticsTheme';

// ─── Styled components ────────────────────────────────────────────────────────

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    @media (max-width: 1100px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const Card = styled.div<{ $accent: string; $bg: string }>`
    position: relative;
    overflow: hidden;
    background: ${p => p.$bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: ${st.shadowSm};
    transition: box-shadow ${st.transition}, transform ${st.transition};

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: ${p => p.$accent};
        border-radius: 0 2px 2px 0;
    }

    &:hover {
        box-shadow: ${st.shadowMd};
        transform: translateY(-1px);
    }
`;

const Label = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const Value = styled.span<{ $color: string; $small?: boolean }>`
    font-size: ${p => p.$small ? st.fontXl : st.fontHero};
    font-weight: 800;
    color: ${p => p.$color};
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Detail = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 2px;
`;

const SubValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.textSecondary};
    margin-top: 2px;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDays = (days: number) => {
    if (days < 1) {
        const hours = Math.round(days * 24);
        return `${hours} godz.`;
    }
    return days % 1 === 0 ? `${days} dni` : `${days.toFixed(1)} dni`;
};

const fmtPct = (pct: number) => `${pct.toFixed(1)}%`;

// ─── Gradient backgrounds ─────────────────────────────────────────────────────

const BG_AMBER = 'linear-gradient(160deg, #FFFFFF 0%, rgba(245,158,11,0.04) 100%)';
const BG_RED   = 'linear-gradient(160deg, #FFFFFF 0%, rgba(239,68,68,0.04) 100%)';
const BG_GREEN = 'linear-gradient(160deg, #FFFFFF 0%, rgba(16,185,129,0.04) 100%)';
const BG_BLUE  = 'linear-gradient(160deg, #FFFFFF 0%, rgba(59,130,246,0.04) 100%)';

// ─── Component ────────────────────────────────────────────────────────────────

interface DelayKpiBarProps {
    overview: DelayOverview;
    worstService: ServiceDelayItem | null;
}

export const DelayKpiBar = ({ overview, worstService }: DelayKpiBarProps) => (
    <Grid>
        {/* 1. Średnie opóźnienie */}
        <Card $accent={st.accentAmber} $bg={BG_AMBER}>
            <Label>Średnie opóźnienie</Label>
            <Value $color={st.accentAmber}>
                {fmtDays(overview.avgDelayDays)}
            </Value>
            <Detail>mediana: {fmtDays(overview.medianDelayDays)}</Detail>
        </Card>

        {/* 2. Wizyty z opóźnieniem */}
        <Card $accent={st.accentRed} $bg={BG_RED}>
            <Label>Wizyty z opóźnieniem</Label>
            <Value $color={st.accentRed}>
                {overview.visitsWithDelay}
            </Value>
            <SubValue>z {overview.totalVisitsCompleted} zrealizowanych</SubValue>
            <Detail>{fmtPct(overview.delayRatePct)} wszystkich wizyt</Detail>
        </Card>

        {/* 3. Terminowość */}
        <Card $accent={st.accentGreen} $bg={BG_GREEN}>
            <Label>Terminowość</Label>
            <Value $color={st.accentGreen}>
                {fmtPct(overview.onTimeRatePct)}
            </Value>
            <Detail>wizyt zrealizowanych na czas</Detail>
        </Card>

        {/* 4. Najczęstsza przyczyna */}
        <Card $accent={st.accentBlue} $bg={BG_BLUE}>
            <Label>Najczęstsza przyczyna</Label>
            {worstService ? (
                <>
                    <Value $color={st.text} $small>
                        {worstService.serviceName}
                    </Value>
                    <Detail>
                        {worstService.occurrences}× w opóźnionych wizytach &middot; śr. {fmtDays(worstService.avgDelayDays)}
                    </Detail>
                </>
            ) : (
                <Value $color={st.textMuted} $small>—</Value>
            )}
        </Card>
    </Grid>
);
