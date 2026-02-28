// src/modules/statistics/components/StatsFilters.tsx
import styled from 'styled-components';
import type { Granularity } from '../types';
import { t } from '@/common/i18n';

const FiltersBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
`;

const PresetsRow = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    flex-wrap: wrap;
`;

const PresetChip = styled.button<{ $active: boolean }>`
    padding: 6px ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    white-space: nowrap;
    border: 1px solid ${props =>
        props.$active ? 'var(--brand-primary)' : props.theme.colors.border};
    background: ${props =>
        props.$active ? 'var(--brand-primary)' : props.theme.colors.surface};
    color: ${props =>
        props.$active ? '#fff' : props.theme.colors.textSecondary};

    &:hover {
        border-color: var(--brand-primary);
        color: ${props => props.$active ? '#fff' : 'var(--brand-primary)'};
    }
`;

const Divider = styled.div`
    width: 1px;
    height: 28px;
    background: ${props => props.theme.colors.border};
    align-self: center;
    margin: 0 ${props => props.theme.spacing.xs};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        display: none;
    }
`;

const DateRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const DateInput = styled.input`
    padding: 6px ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

const DateSep = styled.span`
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const GranularitySelect = styled.select`
    padding: 6px ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
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

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const today = () => toIso(new Date());

const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toIso(d);
};

const monthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return toIso(d);
};

type Preset = {
    label: string;
    startDate: string;
    endDate: string;
    granularity: Granularity;
};

const getPresets = (): Preset[] => [
    {
        label: t.statistics.presets.last7days,
        startDate: daysAgo(7),
        endDate: today(),
        granularity: 'DAILY',
    },
    {
        label: t.statistics.presets.last30days,
        startDate: daysAgo(30),
        endDate: today(),
        granularity: 'WEEKLY',
    },
    {
        label: t.statistics.presets.last3months,
        startDate: monthsAgo(3),
        endDate: today(),
        granularity: 'MONTHLY',
    },
    {
        label: t.statistics.presets.last12months,
        startDate: monthsAgo(12),
        endDate: today(),
        granularity: 'MONTHLY',
    },
];

const matchesPreset = (preset: Preset, startDate: string, endDate: string, granularity: Granularity) =>
    preset.startDate === startDate && preset.endDate === endDate && preset.granularity === granularity;

export const StatsFilters = ({
    granularity,
    startDate,
    endDate,
    onGranularityChange,
    onStartDateChange,
    onEndDateChange,
}: StatsFiltersProps) => {
    const presets = getPresets();
    const activePresetIdx = presets.findIndex(p => matchesPreset(p, startDate, endDate, granularity));

    const applyPreset = (preset: Preset) => {
        onStartDateChange(preset.startDate);
        onEndDateChange(preset.endDate);
        onGranularityChange(preset.granularity);
    };

    return (
        <FiltersBar>
            <PresetsRow>
                {presets.map((preset, idx) => (
                    <PresetChip
                        key={preset.label}
                        $active={idx === activePresetIdx}
                        onClick={() => applyPreset(preset)}
                    >
                        {preset.label}
                    </PresetChip>
                ))}
            </PresetsRow>

            <Divider />

            <DateRow>
                <DateInput
                    type="date"
                    value={startDate}
                    onChange={e => onStartDateChange(e.target.value)}
                />
                <DateSep>—</DateSep>
                <DateInput
                    type="date"
                    value={endDate}
                    onChange={e => onEndDateChange(e.target.value)}
                />
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
            </DateRow>
        </FiltersBar>
    );
};
