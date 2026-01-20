// src/modules/operations/components/OperationFilterBar.tsx

import styled from 'styled-components';
import type { FilterStatus } from '../types';

const FilterBarContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 24px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
`;

const FilterRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const FilterButtons = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
`;

const DateFilterContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const DateLabel = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    white-space: nowrap;
`;

const DateInput = styled.input`
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 13px;
    color: #0f172a;
    background: white;
    transition: all 0.15s ease;
    min-width: 150px;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:hover {
        border-color: #cbd5e1;
    }
`;

const FilterButton = styled.button<{ $isActive?: boolean }>`
    padding: 8px 16px;
    border: 1px solid ${props => props.$isActive ? 'var(--brand-primary)' : '#e2e8f0'};
    border-radius: 6px;
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$isActive ? 'white' : '#64748b'};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
        border-color: var(--brand-primary);
        background: ${props => props.$isActive ? 'var(--brand-primary)' : '#f0f9ff'};
        color: ${props => props.$isActive ? 'white' : 'var(--brand-primary)'};
    }
`;

const ClearButton = styled.button`
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: underline;

    &:hover {
        color: #0f172a;
    }
`;

interface OperationFilterBarProps {
    selectedFilter?: FilterStatus;
    selectedDate?: string;
    onFilterChange: (filter: FilterStatus | undefined) => void;
    onDateChange: (date: string | undefined) => void;
    onClearFilters: () => void;
}

export const OperationFilterBar = ({
                                       selectedFilter,
                                       selectedDate,
                                       onFilterChange,
                                       onDateChange,
                                       onClearFilters,
                                   }: OperationFilterBarProps) => {
    const filters: { value: FilterStatus; label: string }[] = [
        { value: 'RESERVATIONS', label: 'Rezerwacje' },
        { value: 'IN_PROGRESS', label: 'W realizacji' },
        { value: 'READY_FOR_PICKUP', label: 'Do odbioru' },
        { value: 'COMPLETED', label: 'Zakończone' },
        { value: 'REJECTED', label: 'Odrzucone' },
        { value: 'ARCHIVED', label: 'Zarchiwizowane' },
    ];

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onDateChange(value || undefined);
    };

    const handleClearDate = () => {
        onDateChange(undefined);
    };

    return (
        <FilterBarContainer>
            <FilterRow>
                <FilterButtons>
                    {filters.map(filter => (
                        <FilterButton
                            key={filter.value}
                            $isActive={selectedFilter === filter.value}
                            onClick={() =>
                                onFilterChange(selectedFilter === filter.value ? undefined : filter.value)
                            }
                        >
                            {filter.label}
                        </FilterButton>
                    ))}
                </FilterButtons>

                <DateFilterContainer>
                    <DateLabel htmlFor="date-filter">Data:</DateLabel>
                    <DateInput
                        id="date-filter"
                        type="date"
                        value={selectedDate || ''}
                        onChange={handleDateChange}
                    />
                    {selectedDate && (
                        <ClearButton onClick={handleClearDate}>
                            Wyczyść
                        </ClearButton>
                    )}
                </DateFilterContainer>
            </FilterRow>

            {(selectedFilter || selectedDate) && (
                <ClearButton onClick={onClearFilters}>
                    Wyczyść wszystkie filtry
                </ClearButton>
            )}
        </FilterBarContainer>
    );
};