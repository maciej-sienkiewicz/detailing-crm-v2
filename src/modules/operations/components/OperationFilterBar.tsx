// src/modules/operations/components/OperationFilterBar.tsx

import styled from 'styled-components';
import type { OperationType, OperationStatus } from '../types';

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
    }
`;

const FilterGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        align-items: center;
    }
`;

const FilterLabel = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
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
    selectedType?: OperationType;
    selectedStatus?: OperationStatus;
    onTypeChange: (type: OperationType | undefined) => void;
    onStatusChange: (status: OperationStatus | undefined) => void;
    onClearFilters: () => void;
}

export const OperationFilterBar = ({
                                       selectedType,
                                       selectedStatus,
                                       onTypeChange,
                                       onStatusChange,
                                       onClearFilters,
                                   }: OperationFilterBarProps) => {
    const hasActiveFilters = selectedType || selectedStatus;

    return (
        <FilterBarContainer>
            <FilterGroup>
                <FilterLabel>Typ:</FilterLabel>
                <FilterButtons>
                    <FilterButton
                        $isActive={selectedType === 'VISIT'}
                        onClick={() => onTypeChange(selectedType === 'VISIT' ? undefined : 'VISIT')}
                    >
                        Wizyty
                    </FilterButton>
                    <FilterButton
                        $isActive={selectedType === 'RESERVATION'}
                        onClick={() => onTypeChange(selectedType === 'RESERVATION' ? undefined : 'RESERVATION')}
                    >
                        Rezerwacje
                    </FilterButton>
                </FilterButtons>
            </FilterGroup>

            <FilterGroup>
                <FilterLabel>Status:</FilterLabel>
                <FilterButtons>
                    <FilterButton
                        $isActive={selectedStatus === 'IN_PROGRESS'}
                        onClick={() => onStatusChange(selectedStatus === 'IN_PROGRESS' ? undefined : 'IN_PROGRESS')}
                    >
                        W realizacji
                    </FilterButton>
                    <FilterButton
                        $isActive={selectedStatus === 'READY_FOR_PICKUP'}
                        onClick={() => onStatusChange(selectedStatus === 'READY_FOR_PICKUP' ? undefined : 'READY_FOR_PICKUP')}
                    >
                        Do odbioru
                    </FilterButton>
                    <FilterButton
                        $isActive={selectedStatus === 'SCHEDULED'}
                        onClick={() => onStatusChange(selectedStatus === 'SCHEDULED' ? undefined : 'SCHEDULED')}
                    >
                        Zaplanowane
                    </FilterButton>
                    <FilterButton
                        $isActive={selectedStatus === 'COMPLETED'}
                        onClick={() => onStatusChange(selectedStatus === 'COMPLETED' ? undefined : 'COMPLETED')}
                    >
                        Zakończone
                    </FilterButton>
                </FilterButtons>
            </FilterGroup>

            {hasActiveFilters && (
                <ClearButton onClick={onClearFilters}>
                    Wyczyść filtry
                </ClearButton>
            )}
        </FilterBarContainer>
    );
};