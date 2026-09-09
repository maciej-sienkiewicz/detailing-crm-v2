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

    @media (max-width: 900px) {
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 14px;
    }
`;

// Szukanie po nazwisku/rejestracji jest jednym z częstszych ruchów w warsztacie -
// zostaje widoczne przez cały czas, zamiast chować się za ikonką lupy, która
// oznaczała toggle "search + date razem" i była mylącym skrótem semantycznym.
const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
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

// Desktop: klasyczne pole daty w rzędzie akcji.
// Mobile: znika stąd - dostaje własny chip w rzędzie filtrów (patrz DateChip),
// żeby nie było różnicy wysokości między <input type="date"> a resztą pigułek.
const DateWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    @media (max-width: 900px) {
        display: none;
    }
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

// Chip daty w rzędzie filtrów - wygląda jak reszta chipów statusu, ma tę samą
// wysokość, kolor akcentu przy aktywnym stanie i wbudowany krzyżyk do
// wyczyszczenia. Natywny picker daty otwiera się przez niewidzialny
// <input type="date"> na jego wierzchu (pointer-events zabiera tap i wywołuje
// natywne UI systemu). Widoczny tylko na telefonie.
const DateChipWrap = styled.div<{ $active: boolean }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px ${p => p.$active ? '6px' : '14px'} 5px 12px;
    border: 1.5px solid ${p => p.$active ? st.accentBlue : st.border};
    border-radius: ${st.radiusFull};
    background: ${p => p.$active ? `${st.accentBlue}18` : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    font-size: 12px;
    font-weight: ${p => p.$active ? 600 : 500};
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlue}10;
    }

    svg { width: 12px; height: 12px; stroke-width: 2; flex-shrink: 0; }

    @media (min-width: 901px) {
        display: none;
    }
`;

/** Niewidoczny <input type="date"> na wierzchu chipa - tap wywołuje natywny
    picker daty (iOS/Android), a chip pozostaje spójny wizualnie z resztą pigułek. */
const DateChipInput = styled.input`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
    cursor: pointer;
    color: transparent;

    /* Ukryj natywny tekst placeholdera / wartości w Chrome/Safari - chip sam
       renderuje etykietę pod spodem, a dwie warstwy tekstu wyglądały fatalnie. */
    &::-webkit-datetime-edit,
    &::-webkit-datetime-edit-fields-wrapper,
    &::-webkit-datetime-edit-text,
    &::-webkit-datetime-edit-month-field,
    &::-webkit-datetime-edit-day-field,
    &::-webkit-datetime-edit-year-field {
        color: transparent;
    }

    &::-webkit-calendar-picker-indicator {
        opacity: 0;
        cursor: pointer;
    }
`;

const DateChipClearBtn = styled.button`
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: ${st.accentBlue}22;
    color: ${st.accentBlue};
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms ease;

    &:hover, &:active {
        background: ${st.accentBlue}38;
    }

    svg { width: 12px; height: 12px; stroke-width: 2.5; }
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

    @media (max-width: 900px) {
        padding: 0 14px 12px;
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

    @media (max-width: 900px) {
        padding: 9px 11px;
        gap: 5px;
    }
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

/* Sama ikonka lejka mówi na telefonie dokładnie to samo, co ikonka z napisem,
   a zwalnia miejsce w wierszu na pole statusu. */
const FilterBtnLabel = styled.span`
    @media (max-width: 900px) {
        display: none;
    }
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

/** Data z ISO YYYY-MM-DD do polskiego krótkiego formatu "12 lis" - chip ma
    być czytelny na jeden rzut oka, pełna data spuchłaby go dwukrotnie. */
const formatDateChipLabel = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

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
                        aria-label="Filtry"
                        title="Filtry"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <FilterBtnLabel>Filtry</FilterBtnLabel>
                        {activeAdvancedFilterCount > 0 && (
                            <FilterBadge>{activeAdvancedFilterCount}</FilterBadge>
                        )}
                    </FilterBtn>
                )}
            </TopRow>

            <FiltersRow>
                {/* Chip daty tylko na mobile - w rzędzie z chipami statusu.
                    Native picker uruchamia niewidzialny <input type="date"> nakryty
                    na chip; krzyżyk zwija się w ten sam layout, więc zamiast dwóch
                    rzędów kontrolek mamy jeden, spójny wizualnie. */}
                <DateChipWrap $active={!!selectedDate}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {selectedDate ? formatDateChipLabel(selectedDate) : 'Data'}
                    {selectedDate && (
                        <DateChipClearBtn
                            type="button"
                            onClick={e => { e.stopPropagation(); e.preventDefault(); onDateChange(undefined); }}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            aria-label="Wyczyść datę"
                            title="Wyczyść datę"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </DateChipClearBtn>
                    )}
                    {!selectedDate && (
                        <DateChipInput
                            type="date"
                            aria-label="Wybierz datę"
                            value={selectedDate ?? ''}
                            onChange={e => onDateChange(e.target.value || undefined)}
                        />
                    )}
                </DateChipWrap>

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
