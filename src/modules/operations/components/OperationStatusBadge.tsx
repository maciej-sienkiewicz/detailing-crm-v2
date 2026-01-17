// src/modules/operations/components/OperationStatusBadge.tsx

import styled from 'styled-components';
import type { OperationStatus } from '../types';

const StyledBadge = styled.span<{ $status: OperationStatus }>`
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    ${props => {
        switch (props.$status) {
            // Statusy wizyt
            case 'IN_PROGRESS':
                return `
                    background-color: ${props.theme.colors.successLight};
                    color: ${props.theme.colors.success};
                `;
            case 'READY_FOR_PICKUP':
                return `
                    background-color: #fef3c7;
                    color: #92400e;
                `;
            case 'COMPLETED':
                return `
                    background-color: ${props.theme.colors.surfaceAlt};
                    color: ${props.theme.colors.textSecondary};
                `;
            case 'REJECTED':
                return `
                    background-color: ${props.theme.colors.errorLight};
                    color: ${props.theme.colors.error};
                `;
            case 'ARCHIVED':
                return `
                    background-color: #f3f4f6;
                    color: #6b7280;
                `;
            // Statusy rezerwacji
            case 'CREATED':
                return `
                    background-color: #dbeafe;
                    color: #1e40af;
                `;
            case 'ABANDONED':
                return `
                    background-color: #fef3c7;
                    color: #92400e;
                `;
            case 'CANCELLED':
                return `
                    background-color: ${props.theme.colors.errorLight};
                    color: ${props.theme.colors.error};
                `;
            case 'CONVERTED':
                return `
                    background-color: ${props.theme.colors.successLight};
                    color: ${props.theme.colors.success};
                `;
        }
    }}
`;

const statusLabels: Record<OperationStatus, string> = {
    // Statusy wizyt
    IN_PROGRESS: 'W realizacji',
    READY_FOR_PICKUP: 'Do odbioru',
    COMPLETED: 'Zakończona',
    REJECTED: 'Odrzucona',
    ARCHIVED: 'Zarchiwizowana',
    // Statusy rezerwacji
    CREATED: 'Zaplanowano',
    ABANDONED: 'Porzucono',
    CANCELLED: 'Anulowano',
    CONVERTED: 'Rozpoczęto wizytę',
};

interface OperationStatusBadgeProps {
    status: OperationStatus;
}

export const OperationStatusBadge = ({ status }: OperationStatusBadgeProps) => {
    return <StyledBadge $status={status}>{statusLabels[status]}</StyledBadge>;
};