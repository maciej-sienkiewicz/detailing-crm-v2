// src/modules/calendar/components/CalendarView.tsx

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PiiText } from '@/common/pii';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { operationApi } from '@/modules/operations';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { useToast } from '@/common/components/Toast';
import { visitApi } from '@/modules/visits/api/visitApi';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useDoorToDoorCalendar } from '../hooks/useDoorToDoorCalendar';
import { useLeaveCalendar } from '@/modules/employees/hooks/useLeaves';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import { useQuickEventCreation } from '../hooks/useQuickEventCreation';
import { QuickEventModal, type QuickEventFormData, type QuickEventModalRef } from './QuickEventModal';
import { EventSummaryPopover } from './EventSummaryPopover';
import { DeleteRecurringModal } from '@/modules/operations/components/DeleteRecurringModal';
import { DeleteOperationModal } from '@/modules/operations/components/DeleteOperationModal';
import { useDeleteOperation } from '@/modules/operations/hooks/useDeleteOperation';
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';
import { CalendarFilterBar } from './CalendarFilterBar';
import { CalendarSearchModal } from './CalendarSearchModal';
import { WeekKanbanView } from './WeekKanbanView';
import { DayTimelineView } from './DayTimeline';
import type { DateRange, CalendarView as CalendarViewType, EventCreationData, AppointmentEventData, VisitEventData, CalendarEvent, DoorToDoorCalendarEntry, DoorToDoorCalendarDay } from '../types';
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
    /* Hidden — replaced by the custom DesktopPageHeader above the grid */
    .fc-header-toolbar {
        display: none !important;
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
        border-color: #f1f5f9 !important;
    }

    /* Weekend column tint */
    .fc-daygrid-day.fc-day-sat,
    .fc-daygrid-day.fc-day-sun {
        background: #fbfcfe !important;
    }

    .fc-scrollgrid-sync-inner {
        border-color: #f1f5f9 !important;
    }

    .fc-timegrid-slot {
        border-color: rgba(15, 23, 42, 0.06) !important;
    }

    /* Today highlighting */
    .fc-day-today {
        background-color: rgba(14, 165, 233, 0.03) !important;
    }

    .fc-day-today .fc-daygrid-day-number {
        background: #0ea5e9;
        color: #fff;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(14, 165, 233, 0.35);
    }

    /* Day numbers */
    .fc-daygrid-day-number {
        padding: 0 4px;
        color: #475569;
        font-size: 12px;
        font-weight: 500;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2px 0 4px 2px;
        transition: background 0.15s ease;
        align-self: flex-start;
    }

    .fc-daygrid-day-number:hover {
        background: rgba(14, 165, 233, 0.1);
        color: #0ea5e9;
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

    /* ===================== LEAVE INDICATOR (ludzik) =====================
       Badge is injected imperatively into .fc-daygrid-day-frame (see effect
       below) so it can absolute-position against the whole cell rather than
       colliding with the centred .fc-daygrid-day-number. */
    .fc-daygrid-day-frame {
        position: relative;
    }

    .fc-leave-badge {
        position: absolute;
        top: 3px;
        right: 3px;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px 4px;
        border-radius: 6px;
        color: #ef4444;
        z-index: 5;
        cursor: default;
        line-height: 1;
        pointer-events: auto;
        transition: background 0.15s ease;
    }

    .fc-leave-badge:hover {
        background: rgba(239, 68, 68, 0.1);
    }

    .fc-leave-badge svg {
        width: 13px;
        height: 13px;
        display: block;
    }

    .fc-leave-badge .fc-leave-count {
        font-size: 10px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
    }

    .fc-day-other .fc-leave-badge {
        opacity: 0.55;
    }

    /* ===================== DOOR TO DOOR INDICATOR (samochodzik) =====================
       Analogicznie do ludzika urlopowego — wstrzykiwany imperatywnie do
       .fc-daygrid-day-frame; prawy górny róg, pozycja right ustawiana inline w JS. */
    .fc-d2d-badge {
        position: absolute;
        top: 3px;
        right: 3px;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px 4px;
        border-radius: 6px;
        color: #0ea5e9;
        z-index: 5;
        cursor: default;
        line-height: 1;
        pointer-events: auto;
        transition: background 0.15s ease;
    }

    .fc-d2d-badge:hover {
        background: rgba(14, 165, 233, 0.1);
    }

    .fc-d2d-badge svg {
        width: 14px;
        height: 14px;
        display: block;
    }

    .fc-d2d-badge .fc-d2d-count {
        font-size: 10px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
    }

    .fc-day-other .fc-d2d-badge {
        opacity: 0.55;
    }

    /* ===================== EVENTS ===================== */
    .fc-event {
        border-radius: 5px !important;
        border: none !important;
        padding: 0 !important;
        margin: 1px 2px;
        cursor: pointer;
        transition: filter 0.15s ease, transform 0.15s ease;
        box-shadow: none !important;
    }

    .fc-event:hover {
        filter: brightness(0.93);
        transform: translateY(-1px);
        z-index: 10;
    }

    /* Daygrid chips — transparent shell; inner div carries the alpha bg + left border */
    .fc-daygrid-event.fc-event {
        background-color: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 1px 2px;
    }

    .fc-daygrid-event.fc-event:hover {
        filter: none;
        transform: none;
    }

    .fc-daygrid-block-event .fc-event-main {
        padding: 0;
    }

    .fc-daygrid-day-events {
        padding: 0 2px 3px;
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

    /* Abandoned/Cancelled appointments */
    .fc-event-abandoned,
    .fc-event-cancelled {
        opacity: 0.45;
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

    /* Search result highlight */
    @keyframes fc-search-pulse {
        0%, 100% { opacity: 0; }
        40%, 60% { opacity: 1; }
    }

    .fc-event-search-highlight {
        overflow: visible !important;
    }

    .fc-event-search-highlight::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 7px;
        background-color: #0ea5e9;
        animation: fc-search-pulse 1.0s ease-in-out 7;
        z-index: 1;
        pointer-events: none;
    }

    /* Dashboard navigation highlight */
    @keyframes fc-dashboard-pulse {
        0%, 100% { opacity: 0; }
        40%, 60% { opacity: 1; }
    }

    .fc-event-dashboard-highlight {
        overflow: visible !important;
    }

    .fc-event-dashboard-highlight::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 7px;
        background-color: #f59e0b;
        animation: fc-dashboard-pulse 1.0s ease-in-out 7;
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
        color: #64748b;
        font-weight: 600;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.2px;
        transition: background 0.15s ease;
    }

    .fc-daygrid-more-link:hover {
        background: rgba(14, 165, 233, 0.08);
        color: #0ea5e9;
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
        background: rgba(14, 165, 233, 0.07);
        border-radius: 4px;
    }

    /* Loading state */
    .fc-loading {
        opacity: 0.6;
        pointer-events: none;
    }

    /* ===================== RESPONSIVE ===================== */
    @media (max-width: 768px) {
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

/* ===================== DESKTOP PAGE HEADER ===================== */

const DesktopPageHeader = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 20px 24px 16px;
    flex-shrink: 0;
    background: #fff;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);

    @media (max-width: 768px) {
        display: none;
    }
`;

const PageCrumb = styled.div`
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
`;

const PageTitle = styled.h1`
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.4px;
    margin: 0;
    line-height: 1.1;
`;

const PageHeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const MonthNavGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const NavIconBtn = styled.button`
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #475569;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
    }

    svg { width: 16px; height: 16px; }
`;

const TodayNavBtn = styled.button`
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
    }
`;

const ViewSwitchGroup = styled.div`
    display: inline-flex;
    padding: 3px;
    background: #f1f5f9;
    border-radius: 10px;
    gap: 2px;
`;

const ViewSwitchBtn = styled.button<{ $active: boolean }>`
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: ${p => (p.$active ? '#0f172a' : '#64748b')};
    background: ${p => (p.$active ? '#fff' : 'transparent')};
    border: none;
    cursor: pointer;
    font-family: inherit;
    box-shadow: ${p => (p.$active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none')};
    transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;

    &:hover {
        color: ${p => (p.$active ? '#0f172a' : '#475569')};
    }
`;

const SearchBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px 0 10px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    color: #475569;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
    }

    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const NewEventBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: 9999px;
    background: #0ea5e9;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms ease, box-shadow 150ms ease;

    &:hover {
        background: #0284c7;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.38);
    }

    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

/* ===================== LEAVE TOOLTIP ===================== */

const LeaveTooltipBox = styled.div`
    position: fixed;
    transform: translateX(-50%);
    z-index: 10000;
    pointer-events: none;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03), 0 12px 28px rgba(0, 0, 0, 0.12);
    padding: 10px 12px;
    min-width: 180px;
    max-width: 260px;
`;

const LeaveTooltipTitle = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 7px;
    white-space: nowrap;
`;

const LeaveTooltipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    padding: 3px 0;

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ef4444;
        flex-shrink: 0;
    }
`;

const D2DTooltipRow = styled(LeaveTooltipRow)`
    &::before {
        background: #0ea5e9;
    }
`;

interface CalendarViewProps {
    onViewChange?: (view: CalendarViewType) => void;
}

// Module-level singletons — survive React StrictMode double-mount.
let _dashboardPendingHighlight: { id: string; date: string } | null = null;
// Set when a search result is selected; used to detect the same-month case where
// eventDidMount won't fire (event already rendered) and fall back to eventElMapRef.
let _searchPendingHighlight: { id: string } | null = null;

export const CalendarView: React.FC<CalendarViewProps> = ({ onViewChange }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isCollapsed } = useSidebar();
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { deleteWithScope, isDeleting: isDeletingRecurring } = useDeleteOperation();

    const { phase: navPhase, card: navCard, start: startNavAnim, reportTargetRect } = useCalendarNavigation();
    const calendarRef = useRef<FullCalendar>(null);
    const quickEventModalRef = useRef<QuickEventModalRef>(null);
    // Maps event id → DOM element; populated via eventDidMount/eventWillUnmount.
    // Used to locate already-rendered events for the search same-month animation case.
    const eventElMapRef = useRef<Map<string, HTMLElement>>(new Map());
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quickModalOpen, setQuickModalOpen] = useState(false);
    const [selectedEventData, setSelectedEventData] = useState<EventCreationData | null>(null);

    // Filter state - persisted in localStorage
    const {
        appointmentStatuses: selectedAppointmentStatuses,
        visitStatuses: selectedVisitStatuses,
        hiddenColorIds,
        setAppointmentStatuses: setSelectedAppointmentStatuses,
        setVisitStatuses: setSelectedVisitStatuses,
        setHiddenColorIds,
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

    const [endDateModalOpen, setEndDateModalOpen] = useState(false);
    const [endDateDraft, setEndDateDraft] = useState('');
    const [isSavingEndDate, setIsSavingEndDate] = useState(false);
    const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<Operation | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; type: 'VISIT' | 'APPOINTMENT'; name: string } | null>(null);
    const [isConfirmDeleting, setIsConfirmDeleting] = useState(false);

    const [searchOpen, setSearchOpen] = useState(false);
    const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
    const [dashboardHighlightId, setDashboardHighlightId] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // Capture from location.state into module-level var (survives StrictMode double-mount).
    // Read at render time so it's available before any effects run.
    const _stateRef = (location.state as { highlightEventId?: string; highlightDate?: string } | null);
    if (_stateRef?.highlightEventId && !_dashboardPendingHighlight) {
        _dashboardPendingHighlight = { id: _stateRef.highlightEventId, date: _stateRef.highlightDate ?? '' };
    }

    // Clear router state so back-navigation doesn't replay the animation.
    // Safety timeout: auto-clear _dashboardPendingHighlight after 10s in case
    // eventDidMount never fires (event not found / wrong month).
    useEffect(() => {
        if (!_dashboardPendingHighlight) return;
        navigate(location.pathname, { replace: true, state: null });
        const t = setTimeout(() => { _dashboardPendingHighlight = null; }, 10_000);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Same-month search case: when the animation card reaches center and the target event
    // is already rendered (eventDidMount won't fire), look it up in eventElMapRef.
    useEffect(() => {
        if (navPhase !== 'centered') return;
        if (!_searchPendingHighlight) return;

        const el = eventElMapRef.current.get(_searchPendingHighlight.id);
        if (!el) return;

        const id = _searchPendingHighlight.id;
        _searchPendingHighlight = null;
        _dashboardPendingHighlight = null;

        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            setHighlightedEventId(id);
            reportTargetRect(rect);
            setTimeout(() => setHighlightedEventId(null), 7200);
        });
    }, [navPhase, reportTargetRect]);

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
    const { data: events = [], isLoading } = useCalendarEvents(dateRange, selectedAppointmentStatuses, selectedVisitStatuses, hiddenColorIds);

    // Urlopy pracowników per dzień — zasila ikonkę "ludzika" w rogu każdego dnia.
    // Ludzik pojawia się TYLKO dla dni z urlopami; renderowany imperatywnie do
    // .fc-daygrid-day-frame (patrz efekt niżej), bo dayCellContent trzymałby go
    // w kontenerze .fc-daygrid-day-number i zachodziłby na numer dnia.
    // dateRange.end jest ekskluzywne (FullCalendar), backend przyjmuje zakres domknięty.
    const leaveRangeFrom = dateRange ? dateRange.start.slice(0, 10) : null;
    const leaveRangeTo = dateRange
        ? (() => {
            const end = new Date(dateRange.end);
            end.setDate(end.getDate() - 1);
            return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        })()
        : null;
    const { leaveDayMap } = useLeaveCalendar(leaveRangeFrom, leaveRangeTo);

    // Wyjazdy Door to Door per dzień — zasila ikonkę samochodu w rogu każdego dnia
    // (ten sam zakres dat co urlopy).
    const { d2dData } = useDoorToDoorCalendar(leaveRangeFrom, leaveRangeTo);

    // Mapa dat kalendarza eventId → {start, end} potrzebna do remappingu D2D.
    // Backend umieszcza wszystkie D2D na estimatedCompletionDate (ostatni dzień);
    // frontend koryguje: PICKUP → start wizyty, DELIVERY → end wizyty.
    const eventDateMap = useMemo(() => {
        const map = new Map<string, { start: string; end: string }>();
        events.forEach(ev => {
            map.set(ev.id, {
                start: (ev.start as string).slice(0, 10),
                end: ((ev.end ?? ev.start) as string).slice(0, 10),
            });
        });
        return map;
    }, [events]);

    const correctedD2DMap = useMemo(() => {
        const map = new Map<string, DoorToDoorCalendarDay>();
        d2dData.forEach(day => {
            day.entries.forEach(entry => {
                const dates = eventDateMap.get(entry.id);
                // Jeśli event nie jest w bieżącym zakresie, zostaw datę z backendu
                const targetDate = dates
                    ? (entry.direction === 'PICKUP' ? dates.start : dates.end)
                    : day.date;
                if (!map.has(targetDate)) {
                    map.set(targetDate, { date: targetDate, count: 0, entries: [] });
                }
                const slot = map.get(targetDate)!;
                slot.entries.push(entry);
                slot.count = slot.entries.length;
            });
        });
        return map;
    }, [d2dData, eventDateMap]);

    // ── Ludzik na dniach z urlopami ──────────────────────────────────────────
    // Komórki rejestrują się w dayCellDidMount/dayCellWillUnmount (przeżywa to
    // każdy re-render FullCalendara — wcześniejsze jednorazowe wstrzykiwanie do
    // DOM znikało, gdy FC przebudowywał siatkę po doładowaniu eventów).
    // Badge pokazuje się na KAŻDYM dniu objętym urlopem; hover otwiera tooltip
    // z listą osób.
    const leaveDayMapRef = useRef(leaveDayMap);
    const leaveCellsRef = useRef<Map<string, HTMLElement>>(new Map());
    const [leaveTooltip, setLeaveTooltip] = useState<{
        x: number;
        y: number;
        date: string;
        employees: { id: string; fullName: string }[];
    } | null>(null);

    const applyLeaveBadge = useCallback((iso: string, frame: HTMLElement) => {
        const info = leaveDayMapRef.current.get(iso);
        const existing = frame.querySelector<HTMLElement>(':scope > .fc-leave-badge');

        if (!info || info.count <= 0) {
            existing?.remove();
            // Przesuń D2D badge z powrotem do rogu jeśli nie ma już ludzika
            const d2dBadge = frame.querySelector<HTMLElement>(':scope > .fc-d2d-badge');
            if (d2dBadge) d2dBadge.style.right = '3px';
            return;
        }

        let badge = existing;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'fc-leave-badge';
            badge.innerHTML =
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                '<circle cx="12" cy="7" r="4"/>' +
                '<path d="M12 13c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5z"/>' +
                '</svg><span class="fc-leave-count"></span>';
            badge.addEventListener('mouseenter', () => {
                const current = leaveDayMapRef.current.get(iso);
                if (!current) return;
                const rect = badge!.getBoundingClientRect();
                setLeaveTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 6,
                    date: iso,
                    employees: current.employees,
                });
            });
            badge.addEventListener('mouseleave', () => {
                setLeaveTooltip(prev => (prev?.date === iso ? null : prev));
            });
            frame.appendChild(badge);
        }
        badge.setAttribute('aria-label', `Na urlopie: ${info.count}`);
        const countEl = badge.querySelector<HTMLElement>('.fc-leave-count');
        if (countEl) countEl.textContent = String(info.count);

        // Przelicz pozycję D2D badge jeśli już istnieje w tej komórce
        const d2dBadge = frame.querySelector<HTMLElement>(':scope > .fc-d2d-badge');
        if (d2dBadge) d2dBadge.style.right = `${badge.offsetWidth + 6}px`;
    }, []);

    // Po zmianie danych urlopowych odśwież badge na wszystkich zamontowanych komórkach
    useEffect(() => {
        leaveDayMapRef.current = leaveDayMap;
        leaveCellsRef.current.forEach((frame, iso) => applyLeaveBadge(iso, frame));
        setLeaveTooltip(null);
    }, [leaveDayMap, applyLeaveBadge]);

    // ── Samochodzik na dniach z wyjazdami Door to Door ───────────────────────
    // Mechanika identyczna jak przy ludziku urlopowym: komórki rejestrowane w
    // dayCellDidMount/dayCellWillUnmount, badge wstrzykiwany imperatywnie do
    // .fc-daygrid-day-frame; hover otwiera tooltip z listą pojazdów.
    const d2dDayMapRef = useRef(correctedD2DMap);
    const [d2dTooltip, setD2DTooltip] = useState<{
        x: number;
        y: number;
        date: string;
        entries: DoorToDoorCalendarEntry[];
    } | null>(null);

    const applyD2DBadge = useCallback((iso: string, frame: HTMLElement) => {
        const info = d2dDayMapRef.current.get(iso);
        const existing = frame.querySelector<HTMLElement>(':scope > .fc-d2d-badge');

        if (!info || info.count <= 0) {
            existing?.remove();
            return;
        }

        let badge = existing;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'fc-d2d-badge';
            badge.innerHTML =
                '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 ' +
                '1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 ' +
                '1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 ' +
                '13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 ' +
                '1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>' +
                '</svg><span class="fc-d2d-count"></span>';
            badge.addEventListener('mouseenter', () => {
                const current = d2dDayMapRef.current.get(iso);
                if (!current) return;
                const rect = badge!.getBoundingClientRect();
                setD2DTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 6,
                    date: iso,
                    entries: current.entries,
                });
            });
            badge.addEventListener('mouseleave', () => {
                setD2DTooltip(prev => (prev?.date === iso ? null : prev));
            });
            frame.appendChild(badge);
        }
        badge.setAttribute('aria-label', `Wyjazdy Door to Door: ${info.count}`);
        const countEl = badge.querySelector<HTMLElement>('.fc-d2d-count');
        if (countEl) countEl.textContent = String(info.count);

        // Jeśli jest badge urlopowy, przesuń samochodzik w lewo żeby nie nachodził
        const leaveBadge = frame.querySelector<HTMLElement>(':scope > .fc-leave-badge');
        badge.style.right = leaveBadge ? `${leaveBadge.offsetWidth + 6}px` : '3px';
    }, []);

    // Po zmianie danych D2D odśwież badge na wszystkich zamontowanych komórkach
    useEffect(() => {
        d2dDayMapRef.current = correctedD2DMap;
        leaveCellsRef.current.forEach((frame, iso) => applyD2DBadge(iso, frame));
        setD2DTooltip(null);
    }, [correctedD2DMap, applyD2DBadge]);

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

        // If we have a pending dashboard highlight, navigate to its month if not in view.
        // IMPORTANT: use arg.view.calendar (not calendarRef) — the ref is not yet set
        // when datesSet fires from FullCalendar's componentDidMount.
        if (_dashboardPendingHighlight?.date) {
            const targetDate = new Date(_dashboardPendingHighlight.date);
            const viewStart = new Date(arg.start);
            const viewEnd = new Date(arg.end);
            if (targetDate < viewStart || targetDate >= viewEnd) {
                arg.view.calendar.gotoDate(targetDate);
            }
        }

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
        const popoverWidth = window.innerHeight <= 800 ? 340 : 380;
        const popoverMaxHeight = 580;
        const margin = 16;

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

    const handleEditEndDateClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'VISIT') return;
        const visit = popoverEvent as VisitEventData;
        const current = (visit as any).estimatedCompletionDate
            ? new Date((visit as any).estimatedCompletionDate).toISOString().slice(0, 16)
            : '';
        setEndDateDraft(current);
        setEndDateModalOpen(true);
    }, [popoverEvent]);

    const handleSaveEndDate = async () => {
        if (!popoverEvent || !endDateDraft || isSavingEndDate) return;
        setIsSavingEndDate(true);
        try {
            await visitApi.updateEstimatedCompletionDate(popoverEvent.id, new Date(endDateDraft).toISOString());
            showSuccess('Data zakończenia zaktualizowana');
            setEndDateModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch {
            showError('Nie udało się zaktualizować daty');
        } finally {
            setIsSavingEndDate(false);
        }
    };

    /**
     * Handle edit reservation from popover actions
     */
    const handleEditReservationClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        navigate(`/appointments/${popoverEvent.id}/edit`, { state: { recurrenceInfo: (popoverEvent as AppointmentEventData).recurrenceInfo ?? null } });
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
     * Handle event selected from search modal — fly-in animation identical to dashboard navigation.
     * Two cases:
     *  - Different month: gotoDate → eventDidMount fires for new events → reportTargetRect
     *  - Same month: event already rendered, useEffect on navPhase==='centered' fires instead
     */
    const handleSearchSelect = useCallback((event: CalendarEvent, sourceRect: DOMRect) => {
        const eventDate = new Date(event.start as string);
        const isoDate = eventDate.toISOString().slice(0, 10);
        const props = event.extendedProps as AppointmentEventData | VisitEventData;
        const price = props.totalPrice
            ? `${(props.totalPrice / 100).toFixed(2)} ${props.currency ?? 'PLN'}`
            : '—';

        _dashboardPendingHighlight = { id: event.id, date: isoDate };
        _searchPendingHighlight = { id: event.id };

        const snap = {
            id: event.id,
            label: event.title,
            customer: props.customerName ?? '',
            amount: price,
            accentColor: event.backgroundColor || '#6366f1',
            sourceRect,
        };

        const doNavigate = () => {
            const calApi = calendarRef.current?.getApi();
            if (calApi) {
                calApi.changeView('dayGridMonth');
                calApi.gotoDate(eventDate);
            }
            setCurrentView('dayGridMonth');
        };

        startNavAnim(snap, doNavigate);
    }, [startNavAnim]);

    /**
     * Handle delete appointment from popover actions (soft delete)
     */
    const handleDeleteAppointmentClick = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        setPendingDelete({ id: popoverEvent.id, type: 'APPOINTMENT', name: popoverEvent.title ?? '' });
    }, [popoverEvent]);

    const handleDeleteVisitFromPopover = useCallback(() => {
        if (!popoverEvent || popoverEvent.type !== 'VISIT') return;
        setPendingDelete({ id: popoverEvent.id, type: 'VISIT', name: popoverEvent.title ?? '' });
    }, [popoverEvent]);

    const handleConfirmPendingDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setIsConfirmDeleting(true);
        try {
            if (pendingDelete.type === 'VISIT') {
                await visitApi.cancelDraftVisit(pendingDelete.id);
                showSuccess('Wizyta usunięta', 'Wizyta została usunięta.');
            } else {
                await operationApi.deleteAppointment(pendingDelete.id);
                showSuccess('Rezerwacja usunięta', 'Rezerwacja została usunięta.');
            }
            setPendingDelete(null);
            setPopoverOpen(false);
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setIsConfirmDeleting(false);
        }
    }, [pendingDelete, showSuccess, queryClient]);

    const handleDeleteFromPopover = useCallback(async () => {
        if (!popoverEvent || popoverEvent.type !== 'APPOINTMENT') return;
        const appt = popoverEvent as AppointmentEventData;

        // recurrenceInfo may not be in calendar event data (e.g. for cancelled appointments);
        // fall back to fetching full appointment details
        let recurrenceInfo = appt.recurrenceInfo ?? null;
        if (!recurrenceInfo) {
            try {
                const detail = await appointmentApi.getAppointment(appt.id);
                recurrenceInfo = detail?.recurrenceInfo ?? null;
            } catch {
                // ignore — will fall through to direct delete
            }
        }

        if (recurrenceInfo) {
            const op: Operation = {
                id: appt.id,
                type: 'APPOINTMENT',
                title: appt.title,
                customerName: appt.customerName,
                vehicleInfo: appt.vehicleInfo ?? '',
                startDate: '',
                endDate: '',
                status: (appt.status as Operation['status']) || 'SCHEDULED',
                services: [],
                recurrenceInfo,
            };
            setPopoverOpen(false);
            setDeleteRecurringTarget(op);
        } else {
            await handleDeleteAppointmentClick();
        }
    }, [popoverEvent, handleDeleteAppointmentClick]);

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

            {/* Desktop page header – all views; custom week/day views suppress their internal toolbars */}
            <DesktopPageHeader>
                    <div>
                        <PageCrumb>Główne · Kalendarz</PageCrumb>
                        <PageTitle>
                            {calendarTitle
                                ? calendarTitle.charAt(0).toUpperCase() + calendarTitle.slice(1)
                                : 'Kalendarz'}
                        </PageTitle>
                    </div>
                    <PageHeaderRight>
                        <SearchBtn onClick={() => setSearchOpen(true)} aria-label="Szukaj wizyt">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Wyszukaj
                        </SearchBtn>
                        <MonthNavGroup>
                            <NavIconBtn
                                onClick={() => calendarRef.current?.getApi().prev()}
                                aria-label="Poprzedni"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </NavIconBtn>
                            <TodayNavBtn onClick={() => calendarRef.current?.getApi().today()}>
                                Dziś
                            </TodayNavBtn>
                            <NavIconBtn
                                onClick={() => calendarRef.current?.getApi().next()}
                                aria-label="Następny"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </NavIconBtn>
                        </MonthNavGroup>

                        <ViewSwitchGroup>
                            {([
                                { view: 'dayGridMonth', label: 'Miesiąc' },
                                { view: 'timeGridWeek', label: 'Tydzień' },
                                { view: 'timeGridDay',  label: 'Dzień'   },
                            ] as { view: CalendarViewType; label: string }[]).map(({ view, label }) => (
                                <ViewSwitchBtn
                                    key={view}
                                    $active={currentView === view}
                                    onClick={() => calendarRef.current?.getApi().changeView(view)}
                                >
                                    {label}
                                </ViewSwitchBtn>
                            ))}
                        </ViewSwitchGroup>

                        <NewEventBtn onClick={handleMobileAddClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nowa rezerwacja
                        </NewEventBtn>

                        <NewEventBtn onClick={() => navigate('/checkin/new')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nowa wizyta
                        </NewEventBtn>
                    </PageHeaderRight>
                </DesktopPageHeader>

            {/* Command-bar filter (Variant D) – desktop visible; mobile pill controls popup */}
            <CalendarFilterBar
                selectedAppointmentStatuses={selectedAppointmentStatuses}
                selectedVisitStatuses={selectedVisitStatuses}
                onAppointmentStatusesChange={setSelectedAppointmentStatuses}
                onVisitStatusesChange={setSelectedVisitStatuses}
                hiddenColorIds={hiddenColorIds}
                onHiddenColorIdsChange={setHiddenColorIds}
                popupOpen={isFilterOpen}
                onPopupClose={() => setIsFilterOpen(false)}
                eventsCount={events.length}
            />

            <CalendarWrapper>

                {/* ── Kanban week view – replaces FullCalendar's timeGridWeek ── */}
                {currentView === 'timeGridWeek' && dateRange && (
                    <WeekKanbanView
                        events={events}
                        weekStart={dateRange.start}
                        calendarTitle={calendarTitle}
                        currentView={currentView}
                        hideToolbar
                        onEventClick={(eventData, position) => {
                            setPopoverEvent(eventData);
                            setPopoverPosition(position);
                            setPopoverOpen(true);
                        }}
                        onDayAddClick={(date) => {
                            setSelectedEventData({ start: date, end: date, allDay: true });
                            setQuickModalOpen(true);
                        }}
                        onPrev={() => calendarRef.current?.getApi().prev()}
                        onNext={() => calendarRef.current?.getApi().next()}
                        onToday={() => calendarRef.current?.getApi().today()}
                        onViewChange={(view) => calendarRef.current?.getApi().changeView(view)}
                    />
                )}

                {/* ── Day timeline view – replaces FullCalendar's timeGridDay ── */}
                {currentView === 'timeGridDay' && dateRange && (
                    <DayTimelineView
                        events={events}
                        dayStart={dateRange.start}
                        calendarTitle={calendarTitle}
                        currentView={currentView}
                        hideToolbar
                        isToday={(() => {
                            const today = new Date();
                            const day   = new Date(dateRange.start);
                            return (
                                today.getFullYear() === day.getFullYear() &&
                                today.getMonth()    === day.getMonth()    &&
                                today.getDate()     === day.getDate()
                            );
                        })()}
                        onEventClick={(eventData, position) => {
                            setPopoverEvent(eventData);
                            setPopoverPosition(position);
                            setPopoverOpen(true);
                        }}
                        onPrev={() => calendarRef.current?.getApi().prev()}
                        onNext={() => calendarRef.current?.getApi().next()}
                        onToday={() => calendarRef.current?.getApi().today()}
                        onViewChange={(view) => calendarRef.current?.getApi().changeView(view)}
                    />
                )}

                {/* FullCalendar – always mounted so its API & state machine stay active.
                    Hidden when custom views are active (height:0 keeps JS running).
                    opacity transition gives a smooth fade during search navigation. */}
                <div style={currentView === 'timeGridWeek' || currentView === 'timeGridDay'
                    ? { height: 0, overflow: 'hidden', pointerEvents: 'none' }
                    : {
                        height: '100%',
                        opacity: isNavigating ? 0 : 1,
                        transition: 'opacity 0.22s ease',
                        pointerEvents: isNavigating ? 'none' : undefined,
                    }
                }>
                <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}

                // Initial view
                initialView="dayGridMonth"

                // Header configuration
                headerToolbar={{
                    left: 'prev,next today',
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

                eventDidMount={(arg) => {
                    eventElMapRef.current.set(arg.event.id, arg.el);

                    if (_searchPendingHighlight?.id && arg.event.id === _searchPendingHighlight.id) {
                        const id = _searchPendingHighlight.id;
                        _searchPendingHighlight = null;
                        _dashboardPendingHighlight = null;
                        requestAnimationFrame(() => {
                            const rect = arg.el.getBoundingClientRect();
                            setHighlightedEventId(id);
                            reportTargetRect(rect);
                            setTimeout(() => setHighlightedEventId(null), 7200);
                        });
                        return;
                    }

                    if (_dashboardPendingHighlight?.id && arg.event.id === _dashboardPendingHighlight.id) {
                        const id = _dashboardPendingHighlight.id;
                        _dashboardPendingHighlight = null;
                        requestAnimationFrame(() => {
                            const rect = arg.el.getBoundingClientRect();
                            setDashboardHighlightId(id);
                            reportTargetRect(rect);
                            setTimeout(() => setDashboardHighlightId(null), 7200);
                        });
                    }
                }}

                eventWillUnmount={(arg) => {
                    eventElMapRef.current.delete(arg.event.id);
                }}

                // Button text
                buttonText={{
                    today: 'Dzisiaj',
                    month: 'Miesiąc',
                    week: 'Tydzień',
                    day: 'Dzień',
                }}

                // Hide event time from calendar tiles
                displayEventTime={false}

                // Leave (ludzik) + Door to Door (samochodzik) — register month-grid day cells
                dayCellDidMount={(arg) => {
                    if (arg.view.type !== 'dayGridMonth') return;
                    const d = arg.date;
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const frame = arg.el.querySelector<HTMLElement>('.fc-daygrid-day-frame') ?? arg.el;
                    leaveCellsRef.current.set(iso, frame);
                    applyLeaveBadge(iso, frame);
                    applyD2DBadge(iso, frame);
                }}
                dayCellWillUnmount={(arg) => {
                    if (arg.view.type !== 'dayGridMonth') return;
                    const d = arg.date;
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    leaveCellsRef.current.delete(iso);
                }}

                // Custom event content
                eventClassNames={(arg) => {
                    if (highlightedEventId === arg.event.id) return ['fc-event-search-highlight'];
                    if (dashboardHighlightId === arg.event.id) return ['fc-event-dashboard-highlight'];
                    return [];
                }}

                eventContent={(arg) => {
                    const props = arg.event.extendedProps as AppointmentEventData | VisitEventData;
                    const status = props.status as string | undefined;
                    const isCancelled = status === 'ABANDONED' || status === 'CANCELLED';
                    const color = arg.event.backgroundColor || '#6366f1';

                    // Daygrid month view: chip style matching prototype (time + title, alpha bg, left border)
                    if (arg.view.type === 'dayGridMonth') {
                        const start = arg.event.start;
                        const timeStr = (!arg.event.allDay && start)
                            ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
                            : '';
                        const isDeemphasised = isCancelled || status === 'COMPLETED' || status === 'ARCHIVED' || status === 'REJECTED';
                        const isSolidVisit = props.type === 'VISIT' && !isDeemphasised;
                        return (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                width: '100%',
                                padding: '3px 6px 3px 4px',
                                background: isSolidVisit ? color : `${color}14`,
                                borderLeft: `3px solid ${isSolidVisit ? 'rgba(0, 0, 0, 0.12)' : color}`,
                                borderRadius: '5px',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                            }}>
                                {timeStr && (
                                    <span style={{
                                        color: isSolidVisit ? 'rgba(255, 255, 255, 0.8)' : '#64748b',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        flexShrink: 0,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {timeStr}
                                    </span>
                                )}
                                <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '11px',
                                    color: isSolidVisit ? 'rgba(255, 255, 255, 0.95)' : '#0f172a',
                                    fontWeight: 500,
                                    textDecoration: isCancelled ? 'line-through' : 'none',
                                }}>
                                    <PiiText value={arg.event.title} kind="name" />
                                </span>
                            </div>
                        );
                    }

                    // Time-grid views (hidden behind custom views, kept for completeness)
                    const isAppointment = props.type === 'APPOINTMENT';
                    const statusBadge = (() => {
                        if (status === 'READY_FOR_PICKUP') return { text: 'Do odbioru', color: '#10b981' };
                        if (status === 'REJECTED')         return { text: 'Odrzucona',  color: '#ef4444' };
                        if (status === 'ABANDONED')        return { text: 'Porzucona',  color: '#94a3b8' };
                        if (status === 'CANCELLED')        return { text: 'Anulowana',  color: '#94a3b8' };
                        if (status === 'ARCHIVED')         return { text: 'Archiwum',   color: '#9ca3af' };
                        return null;
                    })();
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', width: '100%' }}>
                            {isAppointment ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.5"
                                    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.85 }}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.5"
                                    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.85 }}>
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                            )}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '13px', lineHeight: '1.4', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                <PiiText value={arg.event.title} kind="name" />
                            </span>
                            {statusBadge && (
                                <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: `${statusBadge.color}28`, color: statusBadge.color, border: `1px solid ${statusBadge.color}50`, lineHeight: '1.5' }}>
                                    {statusBadge.text}
                                </span>
                            )}
                        </div>
                    );
                }}

                // Other options
                height="100%"
                expandRows={true}
            />
                </div>
            </CalendarWrapper>

            <QuickEventModal
                ref={quickEventModalRef}
                isOpen={quickModalOpen}
                eventData={selectedEventData}
                onClose={handleModalClose}
                onSave={handleQuickSave}
            />

            {d2dTooltip && (
                <LeaveTooltipBox style={{ left: d2dTooltip.x, top: d2dTooltip.y }}>
                    <LeaveTooltipTitle>
                        Door to Door · {new Date(d2dTooltip.date + 'T00:00:00').toLocaleDateString('pl-PL', {
                            day: 'numeric', month: 'long',
                        })}
                    </LeaveTooltipTitle>
                    {d2dTooltip.entries.map(e => (
                        <D2DTooltipRow key={`${e.id}-${e.direction}`}>
                            {e.vehicle}{e.customerLastName ? ` (${e.customerLastName})` : ''}
                        </D2DTooltipRow>
                    ))}
                </LeaveTooltipBox>
            )}

            {leaveTooltip && (
                <LeaveTooltipBox style={{ left: leaveTooltip.x, top: leaveTooltip.y }}>
                    <LeaveTooltipTitle>
                        Na urlopie · {new Date(leaveTooltip.date + 'T00:00:00').toLocaleDateString('pl-PL', {
                            day: 'numeric', month: 'long',
                        })}
                    </LeaveTooltipTitle>
                    {leaveTooltip.employees.map(e => (
                        <LeaveTooltipRow key={e.id}>{e.fullName}</LeaveTooltipRow>
                    ))}
                </LeaveTooltipBox>
            )}

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
                    onDeleteAppointmentClick={handleDeleteFromPopover}
                    onDeleteVisitClick={handleDeleteVisitFromPopover}
                    onEditEndDateClick={popoverEvent?.type === 'VISIT' ? handleEditEndDateClick : undefined}
                />
            )}

            <DeleteOperationModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleConfirmPendingDelete}
                isDeleting={isConfirmDeleting}
                operationName={pendingDelete?.name ?? ''}
            />

            {deleteRecurringTarget && (
                <DeleteRecurringModal
                    isOpen
                    operation={deleteRecurringTarget}
                    isDeleting={isDeletingRecurring}
                    onClose={() => setDeleteRecurringTarget(null)}
                    onConfirm={(scope) => {
                        deleteWithScope(deleteRecurringTarget.id, scope, {
                            onSuccess: () => {
                                setDeleteRecurringTarget(null);
                                queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
                                queryClient.invalidateQueries({ queryKey: ['operations'] });
                            },
                        });
                    }}
                />
            )}

            {searchOpen && (
                <CalendarSearchModal
                    onClose={() => setSearchOpen(false)}
                    onSelectEvent={(event, rect) => handleSearchSelect(event, rect)}
                />
            )}

            <ModalShell isOpen={endDateModalOpen} onClose={() => setEndDateModalOpen(false)} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Planowana data zakończenia</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setEndDateModalOpen(false)} />
                </ModalHeader>
                <ModalContent>
                    <input
                        type="datetime-local"
                        value={endDateDraft}
                        onChange={e => setEndDateDraft(e.target.value)}
                        onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEndDate(); }}
                        autoFocus
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '9px 12px',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: 8,
                            fontSize: 15,
                            color: '#0f172a',
                            outline: 'none',
                        }}
                    />
                </ModalContent>
                <ModalFooter>
                    <SharedButton $variant="secondary" onClick={() => setEndDateModalOpen(false)}>Anuluj</SharedButton>
                    <SharedButton $variant="primary" onClick={handleSaveEndDate} disabled={!endDateDraft || isSavingEndDate}>
                        {isSavingEndDate ? 'Zapisywanie…' : 'Zapisz'}
                    </SharedButton>
                </ModalFooter>
            </ModalShell>
        </CalendarContainer>
    );
};
