// src/modules/calendar/components/CalendarFilterBar.tsx
//
// Variant D — command-bar with scope chips (Linear / Raycast inspired).
// Replaces CalendarFilterDropdown + CalendarStatusBar.

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import type { AppointmentStatus, VisitStatus } from '../types';

/* ─────────────────────────────────────────────────────────────────
   Status metadata (colours from design)
───────────────────────────────────────────────────────────────── */

const STATUS_META: Record<
    AppointmentStatus | VisitStatus,
    { label: string; dot: string; group: 'appointment' | 'visit' }
> = {
    CREATED:           { label: 'Potwierdzone',      dot: '#0ea5e9', group: 'appointment' },
    ABANDONED:         { label: 'Porzucone',         dot: '#94a3b8', group: 'appointment' },
    CANCELLED:         { label: 'Anulowane',         dot: '#ef4444', group: 'appointment' },
    IN_PROGRESS:       { label: 'W trakcie',         dot: '#f59e0b', group: 'visit' },
    READY_FOR_PICKUP:  { label: 'Gotowe do odbioru', dot: '#10b981', group: 'visit' },
    COMPLETED:         { label: 'Zakończone',        dot: '#16a34a', group: 'visit' },
    REJECTED:          { label: 'Odrzucone',         dot: '#dc2626', group: 'visit' },
    ARCHIVED:          { label: 'Zarchiwizowane',    dot: '#64748b', group: 'visit' },
};

const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = ['CREATED', 'ABANDONED', 'CANCELLED'];
const ALL_VISIT_STATUSES: VisitStatus[] = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'];
const ALL_STATUSES = [...ALL_APPOINTMENT_STATUSES, ...ALL_VISIT_STATUSES] as (AppointmentStatus | VisitStatus)[];

/* ─────────────────────────────────────────────────────────────────
   Styled components
───────────────────────────────────────────────────────────────── */

const BarWrapper = styled.div`
    padding: 8px 16px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    background: #fff;

    @media (max-width: 768px) {
        display: none;
    }
`;

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    flex-shrink: 0;
    min-height: 40px;
    flex-wrap: wrap;
    position: relative;
`;

const SearchIcon = styled.span`
    color: #94a3b8;
    display: flex;
    flex-shrink: 0;
`;

const ShowLabel = styled.span`
    font-size: 12px;
    color: #94a3b8;
    font-weight: 600;
    margin-right: 2px;
    white-space: nowrap;
`;

const Chip = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 10px;
    border-radius: 8px;
    background: ${p => p.$color}14;
    border: 1px solid ${p => p.$color}40;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

const AllChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: #0ea5e914;
    border: 1px solid #0ea5e940;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

const ChipDot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ChipRemove = styled.button`
    width: 18px;
    height: 18px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    margin-left: 2px;
    transition: background 150ms ease, color 150ms ease;

    &:hover {
        background: rgba(0, 0, 0, 0.08);
        color: #0f172a;
    }

    svg {
        width: 11px;
        height: 11px;
    }
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: transparent;
    border: 1px dashed #cbd5e1;
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
    white-space: nowrap;

    &:hover {
        border-color: #94a3b8;
        color: #475569;
        background: #f8fafc;
    }

    svg {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
    }
`;

const Spacer = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ClearButton = styled.button`
    background: none;
    border: none;
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 150ms ease, background 150ms ease;
    white-space: nowrap;

    &:hover {
        color: #0f172a;
        background: #f1f5f9;
    }
`;

const CountBadge = styled.span`
    font-size: 11px;
    color: #0284c7;
    background: #e0f2fe;
    padding: 3px 10px;
    border-radius: 9999px;
    font-weight: 600;
    white-space: nowrap;
`;

/* ── Popup ── */

const Popup = styled.div<{ $open: boolean }>`
    display: ${p => (p.$open ? 'flex' : 'none')};
    flex-direction: column;
    gap: 2px;
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 200;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06);
    width: 320px;
    padding: 8px;
`;

const PopupSection = styled.div`
    padding: 8px 10px 4px;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
`;

const PopupRow = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    background: ${p => (p.$active ? '#f0f9ff' : 'transparent')};
    border: none;
    width: 100%;
    font-family: inherit;
    text-align: left;
    transition: background 120ms ease;

    &:hover {
        background: ${p => (p.$active ? '#e0f2fe' : '#f8fafc')};
    }
`;

const PopupRowLabel = styled.span`
    font-size: 13px;
    color: #0f172a;
    flex: 1;
`;

const PopupDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const PopupCheck = styled.span`
    margin-left: auto;
    color: #0284c7;
    display: flex;
    flex-shrink: 0;

    svg {
        width: 14px;
        height: 14px;
    }
`;

/* ─────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────── */

interface CalendarFilterBarProps {
    selectedAppointmentStatuses: AppointmentStatus[];
    selectedVisitStatuses: VisitStatus[];
    onAppointmentStatusesChange: (statuses: AppointmentStatus[]) => void;
    onVisitStatusesChange: (statuses: VisitStatus[]) => void;
    /** When true, forces the popup open (e.g. triggered by mobile filter pill). */
    popupOpen?: boolean;
    onPopupClose?: () => void;
    eventsCount?: number;
}

/* ─────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────── */

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
    selectedAppointmentStatuses,
    selectedVisitStatuses,
    onAppointmentStatusesChange,
    onVisitStatusesChange,
    popupOpen: popupOpenProp,
    onPopupClose,
    eventsCount,
}) => {
    const [popupOpen, setPopupOpen] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);

    const activeStatuses = [
        ...selectedAppointmentStatuses,
        ...selectedVisitStatuses,
    ] as (AppointmentStatus | VisitStatus)[];

    const allActive = activeStatuses.length === ALL_STATUSES.length;

    const toggle = (status: AppointmentStatus | VisitStatus) => {
        const meta = STATUS_META[status];
        if (meta.group === 'appointment') {
            const s = status as AppointmentStatus;
            if (selectedAppointmentStatuses.includes(s)) {
                onAppointmentStatusesChange(selectedAppointmentStatuses.filter(x => x !== s));
            } else {
                onAppointmentStatusesChange([...selectedAppointmentStatuses, s]);
            }
        } else {
            const s = status as VisitStatus;
            if (selectedVisitStatuses.includes(s)) {
                onVisitStatusesChange(selectedVisitStatuses.filter(x => x !== s));
            } else {
                onVisitStatusesChange([...selectedVisitStatuses, s]);
            }
        }
    };

    const resetAll = () => {
        onAppointmentStatusesChange(ALL_APPOINTMENT_STATUSES);
        onVisitStatusesChange(ALL_VISIT_STATUSES);
    };

    const closePopup = () => {
        setPopupOpen(false);
        onPopupClose?.();
    };

    // "Dodaj filtr" button always toggles internal state
    const togglePopup = () => setPopupOpen(o => !o);

    // When mobile pill triggers external open, open our popup
    useEffect(() => {
        if (popupOpenProp) setPopupOpen(true);
    }, [popupOpenProp]);

    // Close on outside click
    useEffect(() => {
        if (!popupOpen) return;
        const handler = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                closePopup();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [popupOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const isActive = (s: AppointmentStatus | VisitStatus) =>
        STATUS_META[s].group === 'appointment'
            ? selectedAppointmentStatuses.includes(s as AppointmentStatus)
            : selectedVisitStatuses.includes(s as VisitStatus);

    return (
        <BarWrapper>
            <Bar ref={barRef}>
                {/* Search icon */}
                <SearchIcon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </SearchIcon>

                <ShowLabel>Pokaż:</ShowLabel>

                {/* All-active single chip */}
                {allActive ? (
                    <AllChip>
                        <ChipDot $color="#0ea5e9" />
                        wszystkie wydarzenia
                    </AllChip>
                ) : (
                    activeStatuses.map(s => {
                        const m = STATUS_META[s];
                        return (
                            <Chip key={s} $color={m.dot}>
                                <ChipDot $color={m.dot} />
                                {m.label}
                                <ChipRemove
                                    onClick={() => toggle(s)}
                                    title={`Usuń filtr: ${m.label}`}
                                    aria-label={`Usuń filtr: ${m.label}`}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </ChipRemove>
                            </Chip>
                        );
                    })
                )}

                {/* Add filter button */}
                <AddButton onClick={togglePopup} aria-expanded={popupOpen} aria-haspopup="listbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj filtr
                </AddButton>

                {/* Popup */}
                <Popup $open={popupOpen} role="listbox" aria-label="Filtruj po statusie">
                    <PopupSection>Rezerwacje</PopupSection>
                    {ALL_APPOINTMENT_STATUSES.map(s => {
                        const m = STATUS_META[s];
                        const on = isActive(s);
                        return (
                            <PopupRow key={s} $active={on} onClick={() => toggle(s)} role="option" aria-selected={on}>
                                <PopupDot $color={m.dot} />
                                <PopupRowLabel>{m.label}</PopupRowLabel>
                                {on && (
                                    <PopupCheck>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </PopupCheck>
                                )}
                            </PopupRow>
                        );
                    })}

                    <PopupSection>Wizyty</PopupSection>
                    {ALL_VISIT_STATUSES.map(s => {
                        const m = STATUS_META[s];
                        const on = isActive(s);
                        return (
                            <PopupRow key={s} $active={on} onClick={() => toggle(s)} role="option" aria-selected={on}>
                                <PopupDot $color={m.dot} />
                                <PopupRowLabel>{m.label}</PopupRowLabel>
                                {on && (
                                    <PopupCheck>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </PopupCheck>
                                )}
                            </PopupRow>
                        );
                    })}
                </Popup>

                {/* Right side: clear + count */}
                <Spacer>
                    {!allActive && (
                        <ClearButton onClick={resetAll}>Wyczyść</ClearButton>
                    )}
                    {eventsCount !== undefined && (
                        <CountBadge>{eventsCount} wydarzeń</CountBadge>
                    )}
                </Spacer>
            </Bar>
        </BarWrapper>
    );
};
