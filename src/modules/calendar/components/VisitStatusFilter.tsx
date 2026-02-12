// src/modules/calendar/components/VisitStatusFilter.tsx

import React from 'react';
import styled from 'styled-components';
import type { VisitStatus } from '../types';

const FilterContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const FilterHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const FilterTitle = styled.h3`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
`;

const ClearButton = styled.button`
    background: none;
    border: none;
    color: #6366f1;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(99, 102, 241, 0.1);
    }
`;

const CheckboxGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CheckboxLabel = styled.label<{ checked: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${props => props.checked ? '#0f172a' : '#64748b'};
    font-weight: ${props => props.checked ? 600 : 400};
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.02);
    }
`;

const Checkbox = styled.input`
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #6366f1;
`;

const StatusBadge = styled.span<{ status: VisitStatus }>`
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;

    ${props => {
        switch (props.status) {
            case 'IN_PROGRESS':
                return `
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                `;
            case 'READY_FOR_PICKUP':
                return `
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                `;
            case 'COMPLETED':
                return `
                    background: rgba(99, 102, 241, 0.1);
                    color: #6366f1;
                `;
            case 'REJECTED':
                return `
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                `;
            case 'ARCHIVED':
                return `
                    background: rgba(156, 163, 175, 0.1);
                    color: #9ca3af;
                `;
        }
    }}
`;

interface VisitStatusFilterProps {
    selectedStatuses: VisitStatus[];
    onChange: (statuses: VisitStatus[]) => void;
}

const STATUS_LABELS: Record<VisitStatus, string> = {
    'IN_PROGRESS': 'W trakcie',
    'READY_FOR_PICKUP': 'Gotowe do odbioru',
    'COMPLETED': 'Zakończone',
    'REJECTED': 'Odrzucone',
    'ARCHIVED': 'Zarchiwizowane',
};

const ALL_STATUSES: VisitStatus[] = [
    'IN_PROGRESS',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'REJECTED',
    'ARCHIVED',
];

export const VisitStatusFilter: React.FC<VisitStatusFilterProps> = ({
    selectedStatuses,
    onChange,
}) => {
    const handleToggle = (status: VisitStatus) => {
        if (selectedStatuses.includes(status)) {
            onChange(selectedStatuses.filter(s => s !== status));
        } else {
            onChange([...selectedStatuses, status]);
        }
    };

    const handleSelectAll = () => {
        onChange(ALL_STATUSES);
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const allSelected = selectedStatuses.length === ALL_STATUSES.length;

    return (
        <FilterContainer>
            <FilterHeader>
                <FilterTitle>Status wizyt</FilterTitle>
                <ClearButton onClick={allSelected ? handleClearAll : handleSelectAll}>
                    {allSelected ? 'Wyczyść' : 'Zaznacz wszystkie'}
                </ClearButton>
            </FilterHeader>

            <CheckboxGroup>
                {ALL_STATUSES.map(status => (
                    <CheckboxLabel
                        key={status}
                        checked={selectedStatuses.includes(status)}
                    >
                        <Checkbox
                            type="checkbox"
                            checked={selectedStatuses.includes(status)}
                            onChange={() => handleToggle(status)}
                        />
                        <StatusBadge status={status}>
                            {STATUS_LABELS[status]}
                        </StatusBadge>
                    </CheckboxLabel>
                ))}
            </CheckboxGroup>
        </FilterContainer>
    );
};
