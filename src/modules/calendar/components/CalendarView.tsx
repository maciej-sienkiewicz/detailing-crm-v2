// src/modules/calendar/components/CalendarView.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { operationApi } from '@/modules/operations';
import { useToast } from '@/common/components/Toast';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import { useQuickEventCreation } from '../hooks/useQuickEventCreation';
import { QuickEventModal, type QuickEventFormData, type QuickEventModalRef } from './QuickEventModal';
import { EventSummaryPopover } from './EventSummaryPopover';
import { CalendarFilterDropdown } from './CalendarFilterDropdown';
import type { DateRange, CalendarView as CalendarViewType, EventCreationData, AppointmentEventData, VisitEventData } from '../types';
import type { Operation } from '@/modules/operations/types';
import '../calendar.css';

const CalendarContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #fff;
    position: relative;

    /* FullCalendar base styles */
    .fc {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        font-size: 13px;
        height: 100%;
    }

    /* ===================== TOOLBAR ===================== */
    .fc-header-toolbar {
        padding: 12px 16px;
        margin-bottom: 0 !important;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        align-items: center;
    }

    .fc-toolbar-title {
        font-size: 22px;
        font-weight: 600;
        color: #0f172a;
        letter-spacing: -0.3px;
    }

    /* --- Buttons base --- */
    .fc-button-group {
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        overflow: hidden;
    }

    .fc-button {
        background: #fff !important;
        color: #1e293b !important;
        border: none !important;
        font-weight: 500 !important;
        text-transform: none !important;
        padding: 7px 16px !important;
        box-shadow: none !important;
        transition: background 0.15s ease, color 0.15s ease !important;
        font-size: 13px !important;
        letter-spacing: 0;
        font-family: inherit !important;
    }

    .fc-button:hover {
        background: rgba(99, 102, 241, 0.06) !important;
        color: #6366f1 !important;
    }

    .fc-button-active {
        background: rgba(99, 102, 241, 0.1) !important;
        color: #6366f1 !important;
        font-weight: 600 !important;
    }

    .fc-button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    /* Today button */
    .fc-today-button {
        border: 1px solid rgba(15, 23, 42, 0.12) !important;
        border-radius: 8px !important;
        margin-right: 8px !important;
        font-weight: 500 !important;
        color: #1e293b !important;
        transition: all 0.15s ease !important;
    }

    .fc-today-button:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.06) !important;
        border-color: rgba(99, 102, 241, 0.3) !important;
        color: #6366f1 !important;
    }

    /* Filter button */
    .fc-filter-button {
        border: 1px solid rgba(15, 23, 42, 0.12) !important;
        border-radius: 8px !important;
        margin-left: 8px !important;
        font-weight: 500 !important;
        background: #fff !important;
        color: #1e293b !important;
        transition: all 0.15s ease !important;
    }

    .fc-filter-button:hover {
        background: rgba(99, 102, 241, 0.06) !important;
        border-color: rgba(99, 102, 241, 0.3) !important;
        color: #6366f1 !important;
    }

    /* Navigation buttons */
    .fc-prev-button,
    .fc-next-button {
        border: none !important;
        border-radius: 50% !important;
        margin: 0 2px !important;
        padding: 0 !important;
        width: 36px !important;
        height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: transparent !important;
        color: #1e293b !important;
        transition: background 0.15s ease !important;
    }

    .fc-prev-button:hover,
    .fc-next-button:hover {
        background: rgba(99, 102, 241, 0.08) !important;
        color: #6366f1 !important;
    }

    /* ===================== GRID ===================== */
    .fc-scrollgrid {
        border: none !important;
    }

    .fc-scrollgrid td:first-of-type,
    .fc-scrollgrid th:first-of-type {
        border-left: none !important;
    }

    .fc-scrollgrid td:last-of-type,
    .fc-scrollgrid th:last-of-type {
        border-right: none !important;
    }

    .fc-col-header {
        background: #fff;
    }

    .fc-col-header-cell {
        padding: 8px 4px 2px;
        font-weight: 800;
        color: #94a3b8;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1.5px;
        border: none !important;
    }

    .fc-daygrid-day {
        border-color: rgba(15, 23, 42, 0.07) !important;
    }

    .fc-scrollgrid-sync-inner {
        border-color: rgba(15, 23, 42, 0.07) !important;
    }

    .fc-timegrid-slot {
        border-color: rgba(15, 23, 42, 0.06) !important;
    }

    /* Today highlighting */
    .fc-day-today {
        background-color: rgba(99, 102, 241, 0.03) !important;
    }

    .fc-day-today .fc-daygrid-day-number {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #fff;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }

    /* Day numbers */
    .fc-daygrid-day-number {
        padding: 6px 8px;
        color: #1e293b;
        font-size: 13px;
        font-weight: 500;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2px;
        transition: background 0.15s ease;
    }

    .fc-daygrid-day-number:hover {
        background: rgba(99, 102, 241, 0.08);
        color: #6366f1;
    }

    .fc-daygrid-day-top {
        justify-content: center;
        padding: 4px 0 0;
    }

    /* Other month days */
    .fc-day-other .fc-daygrid-day-number {
        color: #cbd5e1;
        font-weight: 400;
    }

    /* ===================== EVENTS ===================== */
    .fc-event {
        border-radius: 6px !important;
        border: none !important;
        padding: 2px 6px;
        margin: 1px 2px;
        cursor: pointer;
        transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .fc-event:hover {
        filter: brightness(0.93);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08);
        z-index: 10;
    }

    .fc-event-title {
        font-weight: 600;
        font-size: 12px;
        line-height: 1.4;
    }

    .fc-event-time {
        font-weight: 400;
        font-size: 11px;
        opacity: 0.85;
    }

    .fc-daygrid-event {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .fc-daygrid-block-event .fc-event-main {
        padding: 1px 4px;
    }

    .fc-daygrid-day-events {
        padding: 0 1px 2px;
    }

    /* Abandoned/Cancelled appointments */
    .fc-event-abandoned,
    .fc-event-cancelled {
        opacity: 0.35;
    }

    .fc-event-abandoned .fc-event-title,
    .fc-event-abandoned .fc-event-time,
    .fc-event-cancelled .fc-event-title,
    .fc-event-cancelled .fc-event-time {
        text-decoration: line-through;
    }

    /* Completed visits */
    .fc-event-completed {
        opacity: 0.35;
    }

    /* Overdue IN_PROGRESS visits */
    @keyframes fc-overdue-blink {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
    }

    .fc-event-overdue {
        overflow: visible !important;
    }

    .fc-event-overdue::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 6px;
        background-color: #f29900;
        animation: fc-overdue-blink 1.4s ease-in-out infinite;
        z-index: 1;
        pointer-events: none;
    }

    /* ===================== TIME GRID ===================== */
    .fc-timegrid-slot {
        height: 48px;
    }

    .fc-timegrid-slot-label {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.3px;
    }

    .fc-timegrid-event {
        border-radius: 6px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    }

    .fc-timegrid-event .fc-event-main {
        padding: 4px 6px;
    }

    /* Current time indicator */
    .fc-timegrid-now-indicator-line {
        border-color: #ef4444;
        border-width: 2px;
    }

    .fc-timegrid-now-indicator-arrow {
        border-color: #ef4444;
    }

    /* ===================== MORE LINK ===================== */
    .fc-daygrid-more-link {
        color: #6366f1;
        font-weight: 600;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.2px;
        transition: background 0.15s ease;
    }

    .fc-daygrid-more-link:hover {
        background: rgba(99, 102, 241, 0.1);
        color: #4f46e5;
    }

    /* ===================== MORE POPOVER ===================== */
    .fc-more-popover {
        background: rgba(255, 255, 255, 0.97) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(15, 23, 42, 0.08) !important;
        border-radius: 20px !important;
        box-shadow:
            0 4px 6px rgba(0, 0, 0, 0.02),
            0 12px 24px rgba(0, 0, 0, 0.07),
            0 24px 48px rgba(0, 0, 0, 0.1) !important;
        overflow: hidden !important;
        min-width: 220px !important;
    }

    .fc-more-popover .fc-popover-header {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
        padding: 14px 18px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        position: relative !important;
        overflow: hidden !important;

        &::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
            pointer-events: none;
        }
    }

    .fc-more-popover .fc-popover-title {
        color: #fff !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        letter-spacing: 0.2px !important;
        position: relative !important;
        z-index: 1 !important;
    }

    .fc-more-popover .fc-popover-close {
        color: rgba(255, 255, 255, 0.8) !important;
        font-size: 18px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 1 !important;
        width: 24px !important;
        height: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        transition: background 0.15s ease, color 0.15s ease !important;

        &:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            color: #fff !important;
        }
    }

    .fc-more-popover .fc-popover-body {
        padding: 10px 10px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        max-height: 320px !important;
        overflow-y: auto !important;

        /* Scrollbar */
        scrollbar-width: thin !important;
        scrollbar-color: rgba(99, 102, 241, 0.2) transparent !important;

        &::-webkit-scrollbar {
            width: 4px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.2);
            border-radius: 4px;
        }
    }

    .fc-more-popover .fc-event {
        margin: 0 !important;
        border-radius: 8px !important;
    }

    /* Selection highlighting */
    .fc-highlight {
        background: rgba(99, 102, 241, 0.07);
        border-radius: 4px;
    }

    /* Loading state */
    .fc-loading {
        opacity: 0.6;
        pointer-events: none;
    }

    /* ===================== RESPONSIVE ===================== */
    @media (max-width: 1024px) {
        .fc-header-toolbar {
            padding: 10px 12px;
        }

        .fc-toolbar-title {
            font-size: 18px;
        }

        .fc-button {
            padding: 6px 12px !important;
            font-size: 12px !important;
        }
    }

    @media (max-width: 768px) {
        .fc-header-toolbar {
            display: none !important;
        }

        .fc-col-header-cell {
            padding: 8px 4px;
            font-size: 10px;
        }

        .fc-daygrid-day-number {
            font-size: 12px;
            width: 24px;
            height: 24px;
        }

        .fc-day-today .fc-daygrid-day-number {
            width: 24px;
            height: 24px;
            font-size: 12px;
        }

        .fc-event {
            padding: 1px 4px;
            margin: 1px;
        }

        .fc-event-title {
            font-size: 11px;
        }

        .fc-timegrid-slot {
            height: 40px;
        }

        .fc-timegrid-slot-label {
            font-size: 9px;
        }
    }

    @media (max-width: 480px) {
        .fc-col-header-cell {
            padding: 6px 2px;
            font-size: 9px;
        }

        .fc-timegrid-slot {
            height: 36px;
        }

        .fc-daygrid-more-link {
            font-size: 10px;
        }
    }
`;

const CalendarWrapper = styled.div`
    position: relative;
    flex: 1;
    overflow: hidden;
`;

const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const LoadingSpinner = styled.div`
    width: 32px;
    height: 32px;
    border: 2px solid #dadce0;
    border-top-color: #1a73e8;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

/* ===================== MOBILE HEADER ===================== */
const MobileHeader = styled.div`
    display: none;

    @media (max-width: 768px) {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
        background: #fff;
        border-bottom: 1px solid #dadce0;
    }
`;

const MobileViewSwitcher = styled.div`
    display: flex;
    background: #f1f3f4;
    border-radius: 4px;
    padding: 2px;
    gap: 1px;
`;

const MobileViewTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 7px 0;
    border: none;
    border-radius: 3px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s ease;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? '#1a73e8' : '#5f6368'};
    box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'};

    &:active {
        opacity: 0.8;
    }
`;

const MobileNav = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const MobileNavBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid #dadce0;
    border-radius: 50%;
    background: #fff;
    color: #3c4043;
    cursor: pointer;
    transition: background 0.1s ease;

    &:active { background: #f1f3f4; }

    svg { width: 14px; height: 14px; }
`;

const MobileNavTitle = styled.div`
    flex: 1;
    text-align: center;
    font-size: 15px;
    font-weight: 400;
    color: #3c4043;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MobileActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MobileFilterPill = styled.button<{ $active: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    background: ${p => p.$active ? '#e8f0fe' : '#fff'};
    color: ${p => p.$active ? '#1a73e8' : '#3c4043'};
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s ease;

    &:hover { background: #f1f3f4; }

    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const MobileFilterBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: #1a73e8;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 500;
    color: #fff;
`;

const MobileAddBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: 1px solid #dadce0;
    border-radius: 50%;
    background: #fff;
    color: #3c4043;
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    transition: background 0.1s ease;

    &:hover { background: #f1f3f4; }
    &:active { background: #e8f0fe; }
`;

interface CalendarViewProps {
    onViewChange?: (view: CalendarViewType) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onViewChange }) => {
    const navigate = useNavigate();
    const { isCollapsed } = useSidebar();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();
    const calendarRef = useRef<FullCalendar>(null);
    const quickEventModalRef = useRef<QuickEventModalRef>(null);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quickModalOpen, setQuickModalOpen] = useState(false);
    const [selectedEventData, setSelectedEventData] = useState<EventCreationData | null>(null);

    // Filter state - persisted in localStorage
    const {
        appointmentStatuses: selectedAppointmentStatuses,
        visitStatuses: selectedVisitStatuses,
        setAppointmentStatuses: setSelectedAppointmentStatuses,
        setVisitStatuses: setSelectedVisitStatuses,
    } = useCalendarFilters();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');

    const deselectedCount =
        (3 - selectedAppointmentStatuses.length) +
        (5 - selectedVisitStatuses.length);

    // Gdy sidebar się zwija/rozwija, CSS transition trwa 200ms — wywołujemy updateSize()
    // na każdej klatce przez czas trwania animacji, żeby kalendarz rozciągał się płynnie
    useEffect(() => {
        const start = performance.now();
        const duration = 220;
        let rafId: number;
        const tick = () => {
            calendarRef.current?.getApi().updateSize();
            if (performance.now() - start < duration) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isCollapsed]);

    // Badge on the FullCalendar "Filtruj" button (desktop) – updated whenever filters change
    useEffect(() => {
        const btn = document.querySelector('.fc-filter-button');
        if (!btn) return;

        btn.querySelector('.fc-filter-badge')?.remove();

        if (deselectedCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'fc-filter-badge';
            badge.style.cssText =
                'display:inline-flex;align-items:center;justify-content:center;' +
                'min-width:16px;height:16px;padding:0 4px;margin-left:6px;' +
                'background:#1a73e8;border-radius:8px;' +
                'font-size:10px;font-weight:500;color:#fff;';
            badge.textContent = String(deselectedCount);
            btn.appendChild(badge);
        }
    }, [deselectedCount]);

    const handleMobileViewChange = useCallback((view: CalendarViewType) => {
        calendarRef.current?.getApi().changeView(view);
    }, []);

    const handleMobileAddClick = useCallback(() => {
        const now = new Date();
        setSelectedEventData({ start: now, end: now, allDay: true });
        setQuickModalOpen(true);
    }, []);

    // Popover state
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [popoverEvent, setPopoverEvent] = useState<AppointmentEventData | VisitEventData | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

    // Fix .fc-more-popover clipping: CalendarWrapper has overflow:hidden which
    // clips FullCalendar's absolutely-positioned popover. Watch for it being
    // added to the DOM and convert to position:fixed with viewport-aware coords.
    useEffect(() => {
        const reposition = (popover: HTMLElement) => {
            // offsetParent is FullCalendar's nearest positioned ancestor (.fc element)
            const parent = popover.offsetParent as HTMLElement | null;
            const parentRect = parent?.getBoundingClientRect() ?? { top: 0, left: 0 };
            const rawTop = parseFloat(popover.style.top) || 0;
            const rawLeft = parseFloat(popover.style.left) || 0;
            let top = rawTop + parentRect.top;
            let left = rawLeft + parentRect.left;

            // Defer one frame so the browser has computed the popover's dimensions
            requestAnimationFrame(() => {
                const h = popover.offsetHeight;
                const w = popover.offsetWidth;
                const margin = 8;
                if (top + h + margin > window.innerHeight) {
                    top = Math.max(margin, window.innerHeight - h - margin);
                }
                if (left + w + margin > window.innerWidth) {
                    left = Math.max(margin, window.innerWidth - w - margin);
                }
                if (top < margin) top = margin;
                if (left < margin) left = margin;
                popover.style.position = 'fixed';
                popover.style.top = `${top}px`;
                popover.style.left = `${left}px`;
                popover.style.zIndex = '9999';
            });
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (!(node instanceof HTMLElement)) continue;
                    const popover = node.classList.contains('fc-more-popover')
                        ? node
                        : node.querySelector<HTMLElement>('.fc-more-popover');
                    if (popover) reposition(popover);
                }
            }
        });

        // Start observing once FullCalendar has mounted
        const start = () => {
            const el = calendarRef.current?.getApi().el;
            if (el) observer.observe(el, { childList: true, subtree: true });
        };
        // Small delay to ensure FullCalendar's DOM is ready
        const t = setTimeout(start, 0);
        return () => { clearTimeout(t); observer.disconnect(); };
    }, []);

    // Reservation options modal state

    const { createQuickEventAsync } = useQuickEventCreation();
    const { data: events = [], isLoading } = useCalendarEvents(dateRange, selectedAppointmentStatuses, selectedVisitStatuses);

    /**
     * Handle date range changes (triggered when view changes or user navigates)
     */
    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setDateRange({
            start: arg.startStr,
            end: arg.endStr,
        });

        setCalendarTitle(arg.view.title);
        setCurrentView(arg.view.type as CalendarViewType);

        // Notify parent of view change
        if (onViewChange) {
            onViewChange(arg.view.type as CalendarViewType);
        }
    }, [onViewChange]);

    /**
     * Handle date selection (click or drag) - Open quick modal
     */
    const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
        setSelectedEventData({
            start: selectInfo.start,
            end: selectInfo.end,
            allDay: selectInfo.allDay,
        });
        setQuickModalOpen(true);

        // Clear selection
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.unselect();
        }
    }, []);

    /**
     * Handle event click - Show popover with event summary
     */
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as AppointmentEventData | VisitEventData;

        // Calculate popover position near the clicked event
        const rect = clickInfo.el.getBoundingClientRect();
        const popoverWidth = 380;
        const popoverMaxHeight = 600; // Estimated max height
        const margin = 16; // Margin from screen edges

        // Try to position to the right of the event
        let x = rect.right + 10;
        let y = rect.top;

        // Adjust X if popover would go off the right edge
        if (x + popoverWidth + margin > window.innerWidth) {
            // Try positioning to the left
            x = rect.left - popoverWidth - 10;

            // If still off screen (left edge), center it on screen
            if (x < margin) {
                x = Math.max(margin, (window.innerWidth - popoverWidth) / 2);
            }
        }

        // Adjust Y if popover would go off the bottom edge
        if (y + popoverMaxHeight + margin > window.innerHeight) {
            // Position from bottom, aligned with bottom of screen
            y = Math.max(margin, window.innerHeight - popoverMaxHeight - margin);
        }

        // Ensure popover doesn't go above the top edge
        if (y < margin) {
            y = margin;
        }

        setPopoverEvent(eventData);
        setPopoverPosition({ x, y });
        setPopoverOpen(true);
    }, []);

    /**
     * Handle quick event save
     */
    const handleQuickSave = useCallback(async (data: QuickEventFormData) => {
        await createQuickEventAsync(data);
        // Clear form after successful save
        quickEventModalRef.current?.clearForm();
        setQuickModalOpen(false);
        setSelectedEventData(null);
    }, [createQuickEventAsync]);

    /**
     * Handle modal close
     */
    const handleModalClose = useCallback(() => {
        setQuickModalOpen(false);
        setSelectedEventData(null);
    }, []);

    /**
     * Handle popover close
     */
    const handlePopoverClose = useCallback(() => {
        setPopoverOpen(false);
        setPopoverEvent(null);
    }, []);

    /**
     * Handle manage button click from popover (visits only)
     */
    const handleManageClick = useCallback(() => {
        if (!popoverEvent) return;
        if (popoverEvent.type === 'VISIT') {
            navigate(`/visits/${popoverEvent.id}`);
            setPopoverOpen(false);
        }
    }, [popoverEvent, navigate]);

    /**
     * Handle edit reservation from popover actions
     */
    const handleEditReservationClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        navigate(`/appointments/${popoverEvent.id}/edit`);
        setPopoverOpen(false);
    }, [popoverEvent, navigate]);

    /**
     * Handle start visit from popover actions
     */
    const handleStartVisitClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        navigate(`/reservations/${popoverEvent.id}/checkin`);
        setPopoverOpen(false);
    }, [popoverEvent, navigate]);

    /**
     * Handle cancel reservation from popover actions
     */
    const handleCancelReservationClick = useCallback(async () => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;

        try {
            await operationApi.cancelReservation(popoverEvent.id);
            setPopoverOpen(false);
            showSuccess('Rezerwacja porzucona', 'Rezerwacja została oznaczona jako porzucona.');
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch (error) {
            console.error('Failed to cancel reservation:', error);
        }
    }, [popoverEvent, showSuccess, queryClient]);

    /**
     * Handle restore appointment from popover actions (CANCELLED → CREATED)
     */
    const handleRestoreAppointmentClick = useCallback(async () => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;

        try {
            await operationApi.restoreAppointment(popoverEvent.id);
            setPopoverOpen(false);
            showSuccess('Rezerwacja przywrócona', 'Rezerwacja została przywrócona.');
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch (error) {
            console.error('Failed to restore appointment:', error);
        }
    }, [popoverEvent, showSuccess, queryClient]);

    /**
     * Handle delete appointment from popover actions (soft delete)
     */
    const handleDeleteAppointmentClick = useCallback(async () => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;

        try {
            await operationApi.deleteAppointment(popoverEvent.id);
            setPopoverOpen(false);
            showSuccess('Rezerwacja usunięta', 'Rezerwacja została usunięta.');
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch (error) {
            console.error('Failed to delete appointment:', error);
        }
    }, [popoverEvent, showSuccess, queryClient]);

    return (
        <CalendarContainer>
            {isLoading && (
                <LoadingOverlay>
                    <LoadingSpinner />
                </LoadingOverlay>
            )}

            <MobileHeader>
                {/* Row 1 – view switcher */}
                <MobileViewSwitcher>
                    {([
                        { view: 'timeGridDay',  label: 'Dzień'   },
                        { view: 'dayGridMonth', label: 'Miesiąc' },
                        { view: 'timeGridWeek', label: 'Tydzień' },
                    ] as { view: CalendarViewType; label: string }[]).map(({ view, label }) => (
                        <MobileViewTab
                            key={view}
                            $active={currentView === view}
                            onClick={() => handleMobileViewChange(view)}
                        >
                            {label}
                        </MobileViewTab>
                    ))}
                </MobileViewSwitcher>

                {/* Row 2 – navigation */}
                <MobileNav>
                    <MobileNavBtn onClick={() => calendarRef.current?.getApi().prev()} aria-label="Poprzedni">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </MobileNavBtn>
                    <MobileNavTitle>{calendarTitle}</MobileNavTitle>
                    <MobileNavBtn onClick={() => calendarRef.current?.getApi().next()} aria-label="Następny">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </MobileNavBtn>
                </MobileNav>

                {/* Row 3 – filter + add */}
                <MobileActions>
                    <MobileFilterPill
                        $active={deselectedCount > 0}
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                        Filtruj
                        {deselectedCount > 0 && (
                            <MobileFilterBadge>{deselectedCount}</MobileFilterBadge>
                        )}
                    </MobileFilterPill>
                    <MobileAddBtn onClick={handleMobileAddClick} aria-label="Dodaj zdarzenie">
                        +
                    </MobileAddBtn>
                </MobileActions>
            </MobileHeader>

            <CalendarWrapper>
                <CalendarFilterDropdown
                    selectedAppointmentStatuses={selectedAppointmentStatuses}
                    selectedVisitStatuses={selectedVisitStatuses}
                    onAppointmentStatusesChange={setSelectedAppointmentStatuses}
                    onVisitStatusesChange={setSelectedVisitStatuses}
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                />

                <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}

                // Initial view
                initialView="dayGridMonth"

                // Custom buttons
                customButtons={{
                    filter: {
                        text: 'Filtruj',
                        click: () => setIsFilterOpen(!isFilterOpen),
                    },
                }}

                // Header configuration
                headerToolbar={{
                    left: 'prev,next today filter',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}

                // View options
                views={{
                    dayGridMonth: {
                        titleFormat: { year: 'numeric', month: 'long' },
                    },
                    timeGridWeek: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                    timeGridDay: {
                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                    },
                }}

                // Force all events to display as blocks (not dots)
                eventDisplay="block"

                // Time configuration
                slotMinTime="06:00:00"
                slotMaxTime="20:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"

                // Behavior
                editable={false}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                moreLinkText={(n) => `jeszcze ${n}`}
                weekends={true}
                nowIndicator={true}

                // Locale
                locale="pl"
                firstDay={1}

                // Event handling
                select={handleDateSelect}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}

                // Events data
                events={events}

                // Button text
                buttonText={{
                    today: 'Dzisiaj',
                    month: 'Miesiąc',
                    week: 'Tydzień',
                    day: 'Dzień',
                }}

                // Hide event time from calendar tiles
                displayEventTime={false}

                // Custom event content – adds calendar icon to reservation tiles
                eventContent={(arg) => {
                    const isAppointment = arg.event.extendedProps.type === 'APPOINTMENT';
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', width: '100%' }}>
                            {isAppointment && (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ flexShrink: 0, opacity: 0.9 }}
                                >
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '13px', lineHeight: '1.4' }}>
                                {arg.event.title}
                            </span>
                        </div>
                    );
                }}

                // Other options
                height="100%"
                expandRows={true}
            />
            </CalendarWrapper>

            <QuickEventModal
                ref={quickEventModalRef}
                isOpen={quickModalOpen}
                eventData={selectedEventData}
                onClose={handleModalClose}
                onSave={handleQuickSave}
            />

            {popoverOpen && popoverEvent && (
                <EventSummaryPopover
                    event={popoverEvent}
                    position={popoverPosition}
                    onClose={handlePopoverClose}
                    onManageClick={handleManageClick}
                    onEditReservationClick={handleEditReservationClick}
                    onStartVisitClick={handleStartVisitClick}
                    onCancelReservationClick={handleCancelReservationClick}
                    onRestoreAppointmentClick={handleRestoreAppointmentClick}
                    onDeleteAppointmentClick={handleDeleteAppointmentClick}
                />
            )}
        </CalendarContainer>
    );
};
