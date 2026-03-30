// src/modules/statistics/components/DelayKpiBar.tsx
import styled from 'styled-components';
import { Clock, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { StatTile } from '@/common/components/StatTile/StatTile';
import type { DelayOverview, ServiceDelayItem } from '../types';

// ─── Layout ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDays = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)} godz.`;
    return days % 1 === 0 ? `${days} dni` : `${days.toFixed(1)} dni`;
};

const fmtPct = (pct: number) => `${pct.toFixed(1)}%`;

const serviceNameFontSize = (name: string): string => {
    if (name.length > 30) return '14px';
    if (name.length > 20) return '18px';
    return '22px';
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DelayKpiBarProps {
    overview: DelayOverview;
    worstService: ServiceDelayItem | null;
}

export const DelayKpiBar = ({ overview, worstService }: DelayKpiBarProps) => (
    <Grid>
        <StatTile
            compact
            accentColor="#F59E0B"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(245,158,11,0.04) 100%)"
            iconBg="rgba(245,158,11,0.10)"
            icon={Clock}
            value={fmtDays(overview.avgDelayDays)}
            label="Średnie opóźnienie"
        />

        <StatTile
            compact
            accentColor="#EF4444"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(239,68,68,0.04) 100%)"
            iconBg="rgba(239,68,68,0.10)"
            icon={AlertTriangle}
            value={overview.visitsWithDelay}
            label="Wizyty z opóźnieniem"
        />

        <StatTile
            compact
            accentColor="#10B981"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(16,185,129,0.04) 100%)"
            iconBg="rgba(16,185,129,0.10)"
            icon={CheckCircle2}
            value={fmtPct(overview.onTimeRatePct)}
            label="Terminowość"
        />

        <StatTile
            compact
            accentColor="#3B82F6"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(59,130,246,0.04) 100%)"
            iconBg="rgba(59,130,246,0.10)"
            icon={Wrench}
            value={
                worstService
                    ? <span style={{ fontSize: serviceNameFontSize(worstService.serviceName), lineHeight: 1.2 }}>
                        {worstService.serviceName}
                      </span>
                    : '—'
            }
            label="Najczęstsza przyczyna"
        />
    </Grid>
);
