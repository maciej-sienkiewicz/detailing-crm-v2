// src/modules/operations/components/OperationFilterBar.tsx

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { FilterStatus } from '../types';

// ─── Filter chip color map ────────────────────────────────────────────────────

const chipColor: Record<FilterStatus | 'ALL', string> = {
    ALL:              st.accentBlue,
    RESERVATIONS:     '#7C3AED',
    IN_PROGRESS:      '#2563EB',
    READY_FOR_PICKUP: '#D97706',
    COMPLETED:        '#059669',
    REJECTED:         '#DC2626',
    ARCHIVED:         '#94A3B8',
    DELETED:          '#9F1239',
};

// ─── Styled components ────────────────────────────────────────────────────────

const Wrapper = styled.div`
    border-bottom: 1px solid ${st.border};
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    flex-wrap: wrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-wrap: nowrap;
    }
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 220px;
`;

const SearchIconEl = styled.svg`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${st.textMuted};
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 14px 9px 38px;
    background: ${st.bgCardAlt};
    border: 1.5px solid ${st.border};
    border-radius: 10px;
    font-size: 13px;
    color: ${st.text};
    transition: all ${st.transition};

    &::placeholder {
        color: ${st.textMuted};
    }

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        background: #fff;
        box-shadow: ${st.shadowBlue};
    }
`;

const DateWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const DateLabel = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: ${st.textSecondary};
    white-space: nowrap;
`;

const DateInput = styled.input`
    padding: 9px 12px;
    background: ${st.bgCardAlt};
    border: 1.5px solid ${st.border};
    border-radius: 10px;
    font-size: 13px;
    color: ${st.text};
    transition: all ${st.transition};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        background: #fff;
        box-shadow: ${st.shadowBlue};
    }
`;

const ClearDateBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};
    flex-shrink: 0;

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        color: #DC2626;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const FiltersRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 20px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const Chip = styled.button<{ $active: boolean; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border: 1.5px solid ${props => props.$active ? props.$color : st.border};
    border-radius: ${st.radiusFull};
    background: ${props => props.$active ? `${props.$color}18` : 'transparent'};
    color: ${props => props.$active ? props.$color : st.textSecondary};
    font-size: 12px;
    font-weight: ${props => props.$active ? 600 : 500};
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all ${st.transition};
    line-height: 1;

    &:hover {
        border-color: ${props => props.$color};
        color: ${props => props.$color};
        background: ${props => `${props.$color}10`};
    }
`;

const ChipDot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color};
    flex-shrink: 0;
`;

const Separator = styled.div`
    width: 1px;
    height: 18px;
    background: ${st.border};
    flex-shrink: 0;
    margin: 0 2px;
`;

const ClearAllBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border: none;
    background: transparent;
    color: ${st.textMuted};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    border-radius: ${st.radiusFull};
    transition: all ${st.transition};

    &:hover {
        color: #DC2626;
        background: rgba(220, 38, 38, 0.08);
    }
`;

// ─── Filter definitions ───────────────────────────────────────────────────────

const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: 'RESERVATIONS',     label: 'Rezerwacje'   },
    { value: 'IN_PROGRESS',      label: 'W realizacji' },
    { value: 'READY_FOR_PICKUP', label: 'Do odbioru'   },
    { value: 'COMPLETED',        label: 'Zakończone'   },
    { value: 'REJECTED',         label: 'Odrzucone'    },
    { value: 'DELETED',          label: 'Usunięte'     },
];

const FilterBtn = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    background: ${props => props.$active ? st.accentBlueDim : st.bgCardAlt};
    color: ${props => props.$active ? st.accentBlue : st.textSecondary};
    border: 1.5px solid ${props => props.$active ? st.accentBlue : st.border};
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    svg { width: 14px; height: 14px; }
`;

const FilterBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: ${st.accentBlue};
    color: #fff;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface OperationFilterBarProps {
    search: string;
    onSearchChange: (val: string) => void;
    selectedFilter?: FilterStatus;
    selectedDate?: string;
    onFilterChange: (filter: FilterStatus | undefined) => void;
    onDateChange: (date: string | undefined) => void;
    onClearFilters: () => void;
    activeAdvancedFilterCount?: number;
    onOpenAdvancedFilters?: () => void;
}

export const OperationFilterBar = ({
    search,
    onSearchChange,
    selectedFilter,
    selectedDate,
    onFilterChange,
    onDateChange,
    onClearFilters,
    activeAdvancedFilterCount = 0,
    onOpenAdvancedFilters,
}: OperationFilterBarProps) => {
    const hasActiveFilters = !!selectedFilter || !!selectedDate || activeAdvancedFilterCount > 0;

    return (
        <Wrapper>
            <TopRow>
                <SearchWrapper>
                    <SearchIconEl viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </SearchIconEl>
                    <SearchInput
                        type="text"
                        placeholder="Szukaj klienta, pojazdu lub rejestracji..."
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </SearchWrapper>

                <DateWrap>
                    <DateLabel htmlFor="op-date-filter">Data:</DateLabel>
                    <DateInput
                        id="op-date-filter"
                        type="date"
                        value={selectedDate ?? ''}
                        onChange={e => onDateChange(e.target.value || undefined)}
                    />
                    {selectedDate && (
                        <ClearDateBtn onClick={() => onDateChange(undefined)} title="Wyczyść datę">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ClearDateBtn>
                    )}
                </DateWrap>

                {onOpenAdvancedFilters && (
                    <FilterBtn
                        $active={activeAdvancedFilterCount > 0}
                        onClick={onOpenAdvancedFilters}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filtry
                        {activeAdvancedFilterCount > 0 && (
                            <FilterBadge>{activeAdvancedFilterCount}</FilterBadge>
                        )}
                    </FilterBtn>
                )}
            </TopRow>

            <FiltersRow>
                <Chip
                    $active={!selectedFilter}
                    $color={chipColor.ALL}
                    onClick={() => onFilterChange(undefined)}
                >
                    <ChipDot $color={chipColor.ALL} />
                    Wszystkie
                </Chip>

                <Separator />

                {FILTERS.map(f => (
                    <Chip
                        key={f.value}
                        $active={selectedFilter === f.value}
                        $color={chipColor[f.value]}
                        onClick={() =>
                            onFilterChange(selectedFilter === f.value ? undefined : f.value)
                        }
                    >
                        <ChipDot $color={chipColor[f.value]} />
                        {f.label}
                    </Chip>
                ))}

                {hasActiveFilters && (
                    <>
                        <Separator />
                        <ClearAllBtn onClick={onClearFilters}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Wyczyść filtry
                        </ClearAllBtn>
                    </>
                )}
            </FiltersRow>
        </Wrapper>
    );
};
