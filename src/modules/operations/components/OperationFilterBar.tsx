// src/modules/operations/components/OperationFilterBar.tsx

import styled from 'styled-components';
import type { FilterStatus } from '../types';

const FilterBarContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e2e8f0;

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
    onFilterChange: (filter: FilterStatus | undefined) => void;
    onClearFilters: () => void;
}

export const OperationFilterBar = ({
                                       selectedFilter,
                                       onFilterChange,
                                       onClearFilters,
                                   }: OperationFilterBarProps) => {
    const filters: { value: FilterStatus; label: string }[] = [
        { value: 'RESERVATIONS', label: 'W realizacji' },
        { value: 'READY_FOR_PICKUP', label: 'Do odbioru' },
        { value: 'COMPLETED', label: 'Zakończone' },
        { value: 'REJECTED', label: 'Odrzucone' },
        { value: 'ARCHIVED', label: 'Zarchiwizowane' },
    ];

    return (
        <FilterBarContainer>
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

            {selectedFilter && (
                <ClearButton onClick={onClearFilters}>
                    Wyczyść filtry
                </ClearButton>
            )}
        </FilterBarContainer>
    );
};