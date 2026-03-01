// src/modules/statistics/components/StatsFilters.tsx
import styled from 'styled-components';
import type { Granularity } from '../types';
import { t } from '@/common/i18n';

// ─── Container ────────────────────────────────────────────────────────────────

const FiltersPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const FilterLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    min-width: 88px;
`;

const Divider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
    margin: 0 calc(-1 * ${props => props.theme.spacing.lg});
`;

// ─── Chip buttons ─────────────────────────────────────────────────────────────

const ChipGroup = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const Chip = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    white-space: nowrap;
    border: 1px solid ${props =>
        props.$active ? 'var(--brand-primary)' : props.theme.colors.border};
    background: ${props =>
        props.$active ? 'var(--brand-primary)' : 'transparent'};
    color: ${props =>
        props.$active ? '#fff' : props.theme.colors.textSecondary};

    &:hover {
        border-color: var(--brand-primary);
        color: ${props => props.$active ? '#fff' : 'var(--brand-primary)'};
        background: ${props => props.$active ? 'var(--brand-primary)' : 'rgba(59,130,246,0.06)'};
    }
`;

// ─── Date inputs ──────────────────────────────────────────────────────────────

const DateRangeGroup = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
`;

const DateInput = styled.input`
    padding: 5px ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
    }
`;

const DateSep = styled.span`
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    user-select: none;
`;

// ─── Data ─────────────────────────────────────────────────────────────────────

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
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toIso(d); };
const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return toIso(d); };

type Preset = {
    label: string;
    startDate: string;
    endDate: string;
    granularity: Granularity;
};

const getPresets = (): Preset[] => [
    { label: t.statistics.presets.last7days,    startDate: daysAgo(7),    endDate: today(), granularity: 'DAILY' },
    { label: t.statistics.presets.last30days,   startDate: daysAgo(30),   endDate: today(), granularity: 'WEEKLY' },
    { label: t.statistics.presets.last3months,  startDate: monthsAgo(3),  endDate: today(), granularity: 'MONTHLY' },
    { label: t.statistics.presets.last12months, startDate: monthsAgo(12), endDate: today(), granularity: 'MONTHLY' },
];

const matchesPreset = (p: Preset, startDate: string, endDate: string) =>
    p.startDate === startDate && p.endDate === endDate;

// ─── Component ────────────────────────────────────────────────────────────────

export const StatsFilters = ({
    granularity,
    startDate,
    endDate,
    onGranularityChange,
    onStartDateChange,
    onEndDateChange,
}: StatsFiltersProps) => {
    const presets = getPresets();
    const activePresetIdx = presets.findIndex(p => matchesPreset(p, startDate, endDate));

    const applyPreset = (preset: Preset) => {
        onStartDateChange(preset.startDate);
        onEndDateChange(preset.endDate);
        onGranularityChange(preset.granularity);
    };

    return (
        <FiltersPanel>
            {/* Row 1: Quick presets */}
            <FilterRow>
                <FilterLabel>Szybki wybór</FilterLabel>
                <ChipGroup>
                    {presets.map((preset, idx) => (
                        <Chip
                            key={preset.label}
                            $active={idx === activePresetIdx}
                            onClick={() => applyPreset(preset)}
                        >
                            {preset.label}
                        </Chip>
                    ))}
                </ChipGroup>
            </FilterRow>

            <Divider />

            {/* Row 2: Custom date range */}
            <FilterRow>
                <FilterLabel>Zakres dat</FilterLabel>
                <DateRangeGroup>
                    <DateInput
                        type="date"
                        value={startDate}
                        onChange={e => onStartDateChange(e.target.value)}
                    />
                    <DateSep>→</DateSep>
                    <DateInput
                        type="date"
                        value={endDate}
                        onChange={e => onEndDateChange(e.target.value)}
                    />
                </DateRangeGroup>
            </FilterRow>

            {/* Row 3: Granularity chips */}
            <FilterRow>
                <FilterLabel>Grupowanie</FilterLabel>
                <ChipGroup>
                    {GRANULARITIES.map(g => (
                        <Chip
                            key={g.value}
                            $active={granularity === g.value}
                            onClick={() => onGranularityChange(g.value)}
                        >
                            {g.label}
                        </Chip>
                    ))}
                </ChipGroup>
            </FilterRow>
        </FiltersPanel>
    );
};
