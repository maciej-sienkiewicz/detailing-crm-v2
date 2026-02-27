// src/modules/statistics/components/StatsFilters.tsx
import styled from 'styled-components';
import type { Granularity } from '../types';
import { t } from '@/common/i18n';

const FiltersBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.md};
    align-items: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

const FilterGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const FilterLabel = styled.label`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const FilterInput = styled.input`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }
`;

const GranularitySelect = styled.select`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }
`;

interface StatsFiltersProps {
    granularity: Granularity;
    startDate: string;
    endDate: string;
    onGranularityChange: (g: Granularity) => void;
    onStartDateChange: (d: string) => void;
    onEndDateChange: (d: string) => void;
}

const GRANULARITIES: { value: Granularity; label: string }[] = [
    { value: 'DAILY', label: t.statistics.granularity.daily },
    { value: 'WEEKLY', label: t.statistics.granularity.weekly },
    { value: 'MONTHLY', label: t.statistics.granularity.monthly },
    { value: 'QUARTERLY', label: t.statistics.granularity.quarterly },
    { value: 'YEARLY', label: t.statistics.granularity.yearly },
];

export const StatsFilters = ({
    granularity,
    startDate,
    endDate,
    onGranularityChange,
    onStartDateChange,
    onEndDateChange,
}: StatsFiltersProps) => {
    return (
        <FiltersBar>
            <FilterGroup>
                <FilterLabel>{t.statistics.filters.startDate}</FilterLabel>
                <FilterInput
                    type="date"
                    value={startDate}
                    onChange={e => onStartDateChange(e.target.value)}
                />
            </FilterGroup>

            <FilterGroup>
                <FilterLabel>{t.statistics.filters.endDate}</FilterLabel>
                <FilterInput
                    type="date"
                    value={endDate}
                    onChange={e => onEndDateChange(e.target.value)}
                />
            </FilterGroup>

            <FilterGroup>
                <FilterLabel>{t.statistics.filters.granularity}</FilterLabel>
                <GranularitySelect
                    value={granularity}
                    onChange={e => onGranularityChange(e.target.value as Granularity)}
                >
                    {GRANULARITIES.map(g => (
                        <option key={g.value} value={g.value}>
                            {g.label}
                        </option>
                    ))}
                </GranularitySelect>
            </FilterGroup>
        </FiltersBar>
    );
};
