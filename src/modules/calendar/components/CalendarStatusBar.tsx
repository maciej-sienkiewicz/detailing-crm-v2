// src/modules/calendar/components/CalendarStatusBar.tsx
//
// Horizontal quick-filter bar that replaces the hidden dropdown.
// Each chip represents one status; clicking it toggles that status on/off.
// Active chips are coloured and bordered; inactive chips are muted.

import React from 'react';
import styled from 'styled-components';
import type { AppointmentStatus, VisitStatus } from '../types';

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */

export interface CalendarStatusBarProps {
    selectedAppointmentStatuses: AppointmentStatus[];
    selectedVisitStatuses: VisitStatus[];
    onAppointmentStatusesChange: (statuses: AppointmentStatus[]) => void;
    onVisitStatusesChange: (statuses: VisitStatus[]) => void;
}

/* ─────────────────────────────────────────────────────────────────
   Status metadata
───────────────────────────────────────────────────────────────── */

const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
    CREATED:   { label: 'Potwierdzone', color: '#6366f1' },
    ABANDONED: { label: 'Porzucone',    color: '#64748b' },
    CANCELLED: { label: 'Anulowane',    color: '#94a3b8' },
};

const VISIT_STATUS_CONFIG: Record<VisitStatus, { label: string; color: string }> = {
    IN_PROGRESS:      { label: 'W trakcie',    color: '#f59e0b' },
    READY_FOR_PICKUP: { label: 'Do odbioru',   color: '#10b981' },
    COMPLETED:        { label: 'Zakończone',   color: '#6366f1' },
    REJECTED:         { label: 'Odrzucone',    color: '#ef4444' },
    ARCHIVED:         { label: 'Archiwum',     color: '#9ca3af' },
};

const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = ['CREATED', 'ABANDONED', 'CANCELLED'];
const ALL_VISIT_STATUSES: VisitStatus[] = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'];

/* ─────────────────────────────────────────────────────────────────
   Styled components
───────────────────────────────────────────────────────────────── */

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 16px;
    height: 40px;
    background: #fafafa;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;

    &::-webkit-scrollbar { display: none; }

    @media (max-width: 768px) {
        padding: 0 12px;
        height: 38px;
    }
`;

const Group = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

const Divider = styled.div`
    width: 1px;
    height: 20px;
    background: rgba(15, 23, 42, 0.1);
    margin: 0 8px;
    flex-shrink: 0;
`;

const GroupLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-right: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
`;

const Chip = styled.button<{ $active: boolean; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.4;

    background: ${({ $active, $color }) =>
        $active ? `${$color}18` : 'transparent'};
    color: ${({ $active }) => $active ? '#0f172a' : '#94a3b8'};
    border: 1.5px solid ${({ $active, $color }) =>
        $active ? `${$color}60` : 'transparent'};

    &:hover {
        background: ${({ $color }) => `${$color}22`};
        color: #0f172a;
        border-color: ${({ $color }) => `${$color}80`};
    }
`;

const Dot = styled.span<{ $color: string; $active: boolean }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $active, $color }) => $active ? $color : '#cbd5e1'};
    flex-shrink: 0;
    transition: background 0.15s ease;
`;

/* ─────────────────────────────────────────────────────────────────
   Icons (inline SVG, 12×12)
───────────────────────────────────────────────────────────────── */

const CalendarIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const WrenchIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

export const CalendarStatusBar: React.FC<CalendarStatusBarProps> = ({
    selectedAppointmentStatuses,
    selectedVisitStatuses,
    onAppointmentStatusesChange,
    onVisitStatusesChange,
}) => {
    const toggleAppointment = (status: AppointmentStatus) => {
        if (selectedAppointmentStatuses.includes(status)) {
            onAppointmentStatusesChange(selectedAppointmentStatuses.filter(s => s !== status));
        } else {
            onAppointmentStatusesChange([...selectedAppointmentStatuses, status]);
        }
    };

    const toggleVisit = (status: VisitStatus) => {
        if (selectedVisitStatuses.includes(status)) {
            onVisitStatusesChange(selectedVisitStatuses.filter(s => s !== status));
        } else {
            onVisitStatusesChange([...selectedVisitStatuses, status]);
        }
    };

    const allAppointmentsActive = selectedAppointmentStatuses.length === ALL_APPOINTMENT_STATUSES.length;
    const allVisitsActive       = selectedVisitStatuses.length       === ALL_VISIT_STATUSES.length;

    const toggleAllAppointments = () => {
        onAppointmentStatusesChange(allAppointmentsActive ? [] : ALL_APPOINTMENT_STATUSES);
    };

    const toggleAllVisits = () => {
        onVisitStatusesChange(allVisitsActive ? [] : ALL_VISIT_STATUSES);
    };

    return (
        <Bar>
            {/* ── Rezerwacje ── */}
            <Group>
                <GroupLabel>
                    <CalendarIcon />
                    <span
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={toggleAllAppointments}
                        title={allAppointmentsActive ? 'Ukryj wszystkie rezerwacje' : 'Pokaż wszystkie rezerwacje'}
                    >
                        Rezerwacje
                    </span>
                </GroupLabel>
                {ALL_APPOINTMENT_STATUSES.map(status => {
                    const { label, color } = APPOINTMENT_STATUS_CONFIG[status];
                    const active = selectedAppointmentStatuses.includes(status);
                    return (
                        <Chip
                            key={status}
                            $active={active}
                            $color={color}
                            onClick={() => toggleAppointment(status)}
                            title={active ? `Ukryj: ${label}` : `Pokaż: ${label}`}
                        >
                            <Dot $color={color} $active={active} />
                            {label}
                        </Chip>
                    );
                })}
            </Group>

            <Divider />

            {/* ── Wizyty ── */}
            <Group>
                <GroupLabel>
                    <WrenchIcon />
                    <span
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={toggleAllVisits}
                        title={allVisitsActive ? 'Ukryj wszystkie wizyty' : 'Pokaż wszystkie wizyty'}
                    >
                        Wizyty
                    </span>
                </GroupLabel>
                {ALL_VISIT_STATUSES.map(status => {
                    const { label, color } = VISIT_STATUS_CONFIG[status];
                    const active = selectedVisitStatuses.includes(status);
                    return (
                        <Chip
                            key={status}
                            $active={active}
                            $color={color}
                            onClick={() => toggleVisit(status)}
                            title={active ? `Ukryj: ${label}` : `Pokaż: ${label}`}
                        >
                            <Dot $color={color} $active={active} />
                            {label}
                        </Chip>
                    );
                })}
            </Group>
        </Bar>
    );
};
