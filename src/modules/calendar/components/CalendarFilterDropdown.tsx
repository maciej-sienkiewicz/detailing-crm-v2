// src/modules/calendar/components/CalendarFilterDropdown.tsx

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import type { VisitStatus, AppointmentStatus } from '../types';

const FilterButton = styled.button<{ hasActiveFilters: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: ${props => props.hasActiveFilters ?
        'linear-gradient(135deg, #6366f1, #4f46e5)' :
        '#ffffff'};
    color: ${props => props.hasActiveFilters ? '#ffffff' : '#475569'};
    border: 1px solid ${props => props.hasActiveFilters ? 'transparent' : '#e2e8f0'};
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    position: relative;

    &:hover {
        background: ${props => props.hasActiveFilters ?
            'linear-gradient(135deg, #4f46e5, #4338ca)' :
            '#f8fafc'};
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const FilterBadge = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
`;

const DropdownContainer = styled.div`
    position: relative;
`;

const Backdrop = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 999;
`;

const DropdownPanel = styled.div<{ $top?: number; $left?: number }>`
    position: fixed;
    top: ${props => props.$top !== undefined ? `${props.$top}px` : 'calc(100% + 8px)'};
    left: ${props => props.$left !== undefined ? `${props.$left}px` : 'auto'};
    right: ${props => props.$left === undefined ? '0' : 'auto'};
    min-width: 320px;
    max-width: 400px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 1000;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);

    @media (max-width: 768px) {
        top: auto !important;
        bottom: 0;
        left: 0 !important;
        right: 0;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
    }
`;

const DropdownHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%);
`;

const DropdownTitle = styled.h3`
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #0f172a;
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const DropdownContent = styled.div`
    padding: 16px 20px;
    max-height: 60vh;
    overflow-y: auto;

    @media (max-width: 768px) {
        max-height: 70vh;
    }
`;

const FilterSection = styled.div`
    margin-bottom: 24px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
`;

const SectionTitle = styled.h4`
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
`;

const SelectAllButton = styled.button`
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
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 14px;
    color: ${props => props.checked ? '#0f172a' : '#64748b'};
    font-weight: ${props => props.checked ? 600 : 400};
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${props => props.checked ? 'rgba(99, 102, 241, 0.05)' : 'transparent'};
    border: 1px solid ${props => props.checked ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};

    &:hover {
        background: ${props => props.checked ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)'};
    }
`;

const Checkbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #6366f1;
    flex-shrink: 0;
`;

const DropdownFooter = styled.div`
    padding: 16px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.02);
`;

const ResetButton = styled.button`
    width: 100%;
    padding: 10px 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
    }
`;

interface CalendarFilterDropdownProps {
    selectedAppointmentStatuses: AppointmentStatus[];
    selectedVisitStatuses: VisitStatus[];
    onAppointmentStatusesChange: (statuses: AppointmentStatus[]) => void;
    onVisitStatusesChange: (statuses: VisitStatus[]) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
    'CREATED': 'Potwierdzone',
    'ABANDONED': 'Porzucone',
    'CANCELLED': 'Anulowane',
};

const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
    'IN_PROGRESS': 'W trakcie',
    'READY_FOR_PICKUP': 'Gotowe do odbioru',
    'COMPLETED': 'Zakończone',
    'REJECTED': 'Odrzucone',
    'ARCHIVED': 'Zarchiwizowane',
};

const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = ['CREATED', 'ABANDONED', 'CANCELLED'];
const ALL_VISIT_STATUSES: VisitStatus[] = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'ARCHIVED'];

export const CalendarFilterDropdown: React.FC<CalendarFilterDropdownProps> = ({
    selectedAppointmentStatuses,
    selectedVisitStatuses,
    onAppointmentStatusesChange,
    onVisitStatusesChange,
    isOpen: isOpenProp,
    onClose: onCloseProp,
}) => {
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

    // Use external control if provided, otherwise use internal state
    const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
    const setIsOpen = onCloseProp ? (open: boolean) => !open && onCloseProp() : setIsOpenInternal;

    // Calculate active filters count
    const totalPossibleFilters = ALL_APPOINTMENT_STATUSES.length + ALL_VISIT_STATUSES.length;
    const activeFiltersCount = selectedAppointmentStatuses.length + selectedVisitStatuses.length;
    const hasDeselectedFilters = activeFiltersCount < totalPossibleFilters;

    // Calculate dropdown position based on filter button in toolbar
    useEffect(() => {
        if (isOpen && isOpenProp !== undefined) {
            const filterButton = document.querySelector('.fc-filter-button');
            if (filterButton) {
                const rect = filterButton.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                });
            }
        }
    }, [isOpen, isOpenProp]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Don't close if clicking on the filter button
                const target = event.target as HTMLElement;
                if (target.closest('.fc-filter-button')) {
                    return;
                }
                if (onCloseProp) {
                    onCloseProp();
                } else {
                    setIsOpenInternal(false);
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onCloseProp]);

    const handleAppointmentToggle = (status: AppointmentStatus) => {
        if (selectedAppointmentStatuses.includes(status)) {
            onAppointmentStatusesChange(selectedAppointmentStatuses.filter(s => s !== status));
        } else {
            onAppointmentStatusesChange([...selectedAppointmentStatuses, status]);
        }
    };

    const handleVisitToggle = (status: VisitStatus) => {
        if (selectedVisitStatuses.includes(status)) {
            onVisitStatusesChange(selectedVisitStatuses.filter(s => s !== status));
        } else {
            onVisitStatusesChange([...selectedVisitStatuses, status]);
        }
    };

    const handleSelectAllAppointments = () => {
        if (selectedAppointmentStatuses.length === ALL_APPOINTMENT_STATUSES.length) {
            onAppointmentStatusesChange([]);
        } else {
            onAppointmentStatusesChange(ALL_APPOINTMENT_STATUSES);
        }
    };

    const handleSelectAllVisits = () => {
        if (selectedVisitStatuses.length === ALL_VISIT_STATUSES.length) {
            onVisitStatusesChange([]);
        } else {
            onVisitStatusesChange(ALL_VISIT_STATUSES);
        }
    };

    const handleResetAll = () => {
        onAppointmentStatusesChange(ALL_APPOINTMENT_STATUSES);
        onVisitStatusesChange(ALL_VISIT_STATUSES);
    };

    const handleClose = () => {
        if (onCloseProp) {
            onCloseProp();
        } else {
            setIsOpenInternal(false);
        }
    };

    // External control mode (no button, only dropdown)
    const isExternalControl = isOpenProp !== undefined;

    return (
        <DropdownContainer ref={dropdownRef}>
            {!isExternalControl && (
                <FilterButton
                    hasActiveFilters={hasDeselectedFilters}
                    onClick={() => setIsOpenInternal(!isOpenInternal)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    Filtruj
                    {hasDeselectedFilters && (
                        <FilterBadge>{activeFiltersCount}</FilterBadge>
                    )}
                </FilterButton>
            )}

            {isOpen && (
                <>
                    <Backdrop onClick={handleClose} />
                    <DropdownPanel
                        $top={isExternalControl ? dropdownPosition?.top : undefined}
                        $left={isExternalControl ? dropdownPosition?.left : undefined}
                    >
                        <DropdownHeader>
                            <DropdownTitle>Filtruj kalendarz</DropdownTitle>
                            <CloseButton onClick={handleClose}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </CloseButton>
                        </DropdownHeader>

                        <DropdownContent>
                            <FilterSection>
                                <SectionHeader>
                                    <SectionTitle>Rezerwacje</SectionTitle>
                                    <SelectAllButton onClick={handleSelectAllAppointments}>
                                        {selectedAppointmentStatuses.length === ALL_APPOINTMENT_STATUSES.length ? 'Wyczyść' : 'Zaznacz wszystkie'}
                                    </SelectAllButton>
                                </SectionHeader>
                                <CheckboxGroup>
                                    {ALL_APPOINTMENT_STATUSES.map(status => (
                                        <CheckboxLabel
                                            key={status}
                                            checked={selectedAppointmentStatuses.includes(status)}
                                        >
                                            <Checkbox
                                                type="checkbox"
                                                checked={selectedAppointmentStatuses.includes(status)}
                                                onChange={() => handleAppointmentToggle(status)}
                                            />
                                            {APPOINTMENT_STATUS_LABELS[status]}
                                        </CheckboxLabel>
                                    ))}
                                </CheckboxGroup>
                            </FilterSection>

                            <FilterSection>
                                <SectionHeader>
                                    <SectionTitle>Wizyty</SectionTitle>
                                    <SelectAllButton onClick={handleSelectAllVisits}>
                                        {selectedVisitStatuses.length === ALL_VISIT_STATUSES.length ? 'Wyczyść' : 'Zaznacz wszystkie'}
                                    </SelectAllButton>
                                </SectionHeader>
                                <CheckboxGroup>
                                    {ALL_VISIT_STATUSES.map(status => (
                                        <CheckboxLabel
                                            key={status}
                                            checked={selectedVisitStatuses.includes(status)}
                                        >
                                            <Checkbox
                                                type="checkbox"
                                                checked={selectedVisitStatuses.includes(status)}
                                                onChange={() => handleVisitToggle(status)}
                                            />
                                            {VISIT_STATUS_LABELS[status]}
                                        </CheckboxLabel>
                                    ))}
                                </CheckboxGroup>
                            </FilterSection>
                        </DropdownContent>

                        <DropdownFooter>
                            <ResetButton onClick={handleResetAll}>
                                Resetuj wszystkie filtry
                            </ResetButton>
                        </DropdownFooter>
                    </DropdownPanel>
                </>
            )}
        </DropdownContainer>
    );
};
