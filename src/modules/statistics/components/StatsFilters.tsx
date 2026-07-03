// src/modules/statistics/components/StatsFilters.tsx
import { useEffect } from 'react';
import styled, { css } from 'styled-components';
import type { Granularity } from '../types';
import { t } from '@/common/i18n';
import { st } from './StatisticsTheme';

// ─── Container ────────────────────────────────────────────────────────────────

const FiltersPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    flex-wrap: wrap;

    &:not(:last-child) {
        border-bottom: 1px solid ${st.border};
    }
`;

const FilterLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.7px;
    white-space: nowrap;
    min-width: 88px;
`;

// ─── Chip buttons ─────────────────────────────────────────────────────────────

const ChipGroup = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const Chip = styled.button<{ $active: boolean; $disabled?: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    border: 1px solid ${props =>
        props.$active ? st.accentBlue : st.border};
    background: ${props =>
        props.$active
            ? st.accentBlue
            : 'transparent'};
    color: ${props =>
        props.$active ? '#fff' : st.textSecondary};
    box-shadow: ${props => props.$active ? st.shadowXs : 'none'};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${props => props.$active ? '#fff' : st.accentBlue};
        background: ${props =>
            props.$active ? st.accentBlue : st.accentBlueDim};
    }

    ${props => props.$disabled && css`
        opacity: 0.35;
        cursor: not-allowed;
        pointer-events: none;
    `}
`;

// ─── Data ─────────────────────────────────────────────────────────────────────

interface StatsFiltersProps {
    granularity: Granularity;
    startDate: string;
    endDate: string;
    onGranularityChange: (g: Granularity) => void;
}

const GRANULARITIES: { value: Granularity; label: string }[] = [
    { value: 'DAILY', label: t.statistics.granularity.daily },
    { value: 'WEEKLY', label: t.statistics.granularity.weekly },
    { value: 'MONTHLY', label: t.statistics.granularity.monthly },
    { value: 'QUARTERLY', label: t.statistics.granularity.quarterly },
    { value: 'YEARLY', label: t.statistics.granularity.yearly },
];

// ─── Granularity constraints ───────────────────────────────────────────────────

const getDaysDiff = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(diff / 86_400_000));
};

const getAllowedGranularities = (days: number): Set<Granularity> => {
    if (days <= 7)  return new Set<Granularity>(['DAILY']);
    if (days <= 30) return new Set<Granularity>(['DAILY', 'WEEKLY']);
    if (days <= 90) return new Set<Granularity>(['DAILY', 'WEEKLY', 'MONTHLY']);
    return new Set<Granularity>(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
};

const GRANULARITY_ORDER: Granularity[] = ['YEARLY', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'];

// ─── Component ────────────────────────────────────────────────────────────────

export const StatsFilters = ({
    granularity,
    startDate,
    endDate,
    onGranularityChange,
}: StatsFiltersProps) => {
    const days = getDaysDiff(startDate, endDate);
    const allowedGranularities = getAllowedGranularities(days);

    useEffect(() => {
        if (!allowedGranularities.has(granularity)) {
            const best = GRANULARITY_ORDER.find(g => allowedGranularities.has(g)) ?? 'DAILY';
            onGranularityChange(best);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    return (
        <FiltersPanel>
            <FilterRow>
                <FilterLabel>Grupowanie</FilterLabel>
                <ChipGroup>
                    {GRANULARITIES.map(g => {
                        const disabled = !allowedGranularities.has(g.value);
                        return (
                            <Chip
                                key={g.value}
                                $active={granularity === g.value}
                                $disabled={disabled}
                                disabled={disabled}
                                onClick={() => onGranularityChange(g.value)}
                                title={disabled ? `Niedostępne dla zakresu ${days} dni` : undefined}
                            >
                                {g.label}
                            </Chip>
                        );
                    })}
                </ChipGroup>
            </FilterRow>
        </FiltersPanel>
    );
};
