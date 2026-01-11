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
            case 'IN_PROGRESS':
                return `
                    background-color: ${props.theme.colors.successLight};
                    color: ${props.theme.colors.success};
                `;
            case 'SCHEDULED':
                return `
                    background-color: #dbeafe;
                    color: #1e40af;
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
            case 'CANCELLED':
                return `
                    background-color: ${props.theme.colors.errorLight};
                    color: ${props.theme.colors.error};
                `;
        }
    }}
`;

const statusLabels: Record<OperationStatus, string> = {
    IN_PROGRESS: 'W realizacji',
    SCHEDULED: 'Zaplanowana',
    READY_FOR_PICKUP: 'Do odbioru',
    COMPLETED: 'Zakończona',
    CANCELLED: 'Anulowana',
};

interface OperationStatusBadgeProps {
    status: OperationStatus;
}

export const OperationStatusBadge = ({ status }: OperationStatusBadgeProps) => {
    return <StyledBadge $status={status}>{statusLabels[status]}</StyledBadge>;
};