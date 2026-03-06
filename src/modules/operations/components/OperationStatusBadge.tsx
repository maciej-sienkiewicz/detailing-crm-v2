// src/modules/operations/components/OperationStatusBadge.tsx

import styled from 'styled-components';
import type { OperationStatus } from '../types';

const statusConfig: Record<OperationStatus, { label: string; color: string; bg: string }> = {
    DRAFT:            { label: 'Szkic',             color: '#64748B', bg: '#F1F5F9'                   },
    IN_PROGRESS:      { label: 'W realizacji',     color: '#059669', bg: 'rgba(5, 150, 105, 0.10)'   },
    READY_FOR_PICKUP: { label: 'Do odbioru',        color: '#D97706', bg: 'rgba(217, 119, 6, 0.10)'   },
    COMPLETED:        { label: 'Zakończona',         color: '#64748B', bg: '#F1F5F9'                   },
    REJECTED:         { label: 'Odrzucona',          color: '#DC2626', bg: 'rgba(220, 38, 38, 0.10)'  },
    ARCHIVED:         { label: 'Zarchiwizowana',     color: '#94A3B8', bg: '#F8FAFC'                   },
    CREATED:          { label: 'Zaplanowano',        color: '#2563EB', bg: 'rgba(37, 99, 235, 0.10)'  },
    ABANDONED:        { label: 'Porzucono',          color: '#D97706', bg: 'rgba(217, 119, 6, 0.10)'  },
    CANCELLED:        { label: 'Anulowano',          color: '#DC2626', bg: 'rgba(220, 38, 38, 0.10)'  },
    CONVERTED:        { label: 'Rozpoczęto wizytę', color: '#059669', bg: 'rgba(5, 150, 105, 0.10)'  },
};

const Badge = styled.span<{ $color: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    line-height: 1;
`;

const Dot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color};
    flex-shrink: 0;
`;

interface OperationStatusBadgeProps {
    status: OperationStatus;
}

export const OperationStatusBadge = ({ status }: OperationStatusBadgeProps) => {
    const { label, color, bg } = statusConfig[status];
    return (
        <Badge $color={color} $bg={bg}>
            <Dot $color={color} />
            {label}
        </Badge>
    );
};

export const getStatusAccentColor = (status: OperationStatus): string =>
    statusConfig[status]?.color ?? '#CBD5E1';
