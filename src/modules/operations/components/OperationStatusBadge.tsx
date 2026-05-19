// src/modules/operations/components/OperationStatusBadge.tsx

import styled from 'styled-components';
import type { OperationStatus } from '../types';

// ─── Status icon components ───────────────────────────────────────────────────

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const IconWrench = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

const IconKey = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3" />
    </svg>
);

const IconDollar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

const IconCalendar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconBan = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
);

const IconArchive = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
);

const IconCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

type StatusIcon = () => JSX.Element;

const statusConfig: Record<OperationStatus, { label: string; color: string; bg: string; Icon: StatusIcon }> = {
    ABANDONED:        { label: 'Porzucono',          color: '#DC2626', bg: 'rgba(220, 38, 38, 0.10)',    Icon: IconX        },
    CANCELLED:        { label: 'Anulowano',           color: '#64748B', bg: '#F1F5F9',                   Icon: IconTrash    },
    IN_PROGRESS:      { label: 'W realizacji',        color: '#2563EB', bg: 'rgba(37, 99, 235, 0.10)',   Icon: IconWrench   },
    READY_FOR_PICKUP: { label: 'Do odbioru',          color: '#D97706', bg: 'rgba(217, 119, 6, 0.10)',   Icon: IconKey      },
    COMPLETED:        { label: 'Zakończona',           color: '#059669', bg: 'rgba(5, 150, 105, 0.10)',   Icon: IconDollar   },
    CREATED:          { label: 'Zaplanowano',          color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.10)',  Icon: IconCalendar },
    REJECTED:         { label: 'Odrzucona',            color: '#DC2626', bg: 'rgba(220, 38, 38, 0.10)',   Icon: IconBan      },
    ARCHIVED:         { label: 'Zarchiwizowana',       color: '#94A3B8', bg: '#F8FAFC',                   Icon: IconArchive  },
    CONVERTED:        { label: 'Rozpoczęto wizytę',   color: '#059669', bg: 'rgba(5, 150, 105, 0.10)',   Icon: IconCheck    },
};

// ─── Styled components ────────────────────────────────────────────────────────

const Badge = styled.span<{ $color: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    line-height: 1;

    svg {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface OperationStatusBadgeProps {
    status: OperationStatus;
}

export const OperationStatusBadge = ({ status }: OperationStatusBadgeProps) => {
    const { label, color, bg, Icon } = statusConfig[status];
    return (
        <Badge $color={color} $bg={bg}>
            <Icon />
            {label}
        </Badge>
    );
};

export const getStatusAccentColor = (status: OperationStatus): string =>
    statusConfig[status]?.color ?? '#CBD5E1';
