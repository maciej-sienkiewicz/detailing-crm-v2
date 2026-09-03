// src/modules/calendar/components/AgendaListView.tsx
// Mobile list view: shows upcoming days with their events, Google Calendar style.

import React, { useRef, useEffect } from 'react';
import { isStartedVisit } from '../utils/visitStatus';
import styled, { keyframes } from 'styled-components';
import { PiiText } from '@/common/pii';
import type { CalendarEvent, AppointmentEventData, VisitEventData } from '../types';
import type { StudioCalendarEvent } from '../types';
import type { PopoverAnchor } from './EventSummaryPopover';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(isoStr: string): Date {
    return new Date(isoStr);
}

function formatTime(isoStr: string | undefined): string {
    if (!isoStr) return '';
    const d = parseLocalDate(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Build an array of Date objects covering [startIso, endIso) in the dateRange. */
function buildDays(startIso: string, endIso: string): Date[] {
    const days: Date[] = [];
    const cursor = new Date(startIso);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(endIso);
    end.setHours(0, 0, 0, 0);
    while (cursor < end) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

interface EventSlot {
    event: CalendarEvent;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
}

function groupEventsByDay(
    events: CalendarEvent[],
    days: Date[],
): Map<string, EventSlot[]> {
    const map = new Map<string, EventSlot[]>(days.map(d => [toDateKey(d), []]));

    for (const ev of events) {
        const evStart = parseLocalDate(ev.start as string);
        const evStartKey = toDateKey(evStart);

        // For multi-day / allDay events, place only on the start date if it's in range.
        // For timed events, same logic.
        if (map.has(evStartKey)) {
            const isAllDay = !!ev.allDay;
            map.get(evStartKey)!.push({
                event: ev,
                startTime: isAllDay ? '' : formatTime(ev.start as string),
                endTime: isAllDay ? '' : formatTime(ev.end as string | undefined),
                isAllDay,
            });
        }
    }

    // Sort each day's events: all-day first, then by start time
    for (const slots of map.values()) {
        slots.sort((a, b) => {
            if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
            return a.startTime.localeCompare(b.startTime);
        });
    }

    return map;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
    overflow: hidden;
`;

const ScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.1); border-radius: 2px; }
`;

const DaySection = styled.div``;

/*
 * Nagłówek dnia jest jednocześnie najkrótszą drogą do nowej rezerwacji: na telefonie
 * to jedyny duży, zawsze widoczny element przypisany do konkretnej daty, a „dodaj
 * na ten dzień" jest tym, po co najczęściej się tu wraca. Bez uprawnienia do
 * tworzenia wizyt zostaje zwykłym nagłówkiem — stąd renderowanie raz jako <button>,
 * raz jako <div>, i reset stylów guzika w środku.
 */
const DayHeader = styled.div<{ $isToday: boolean; $isEmpty: boolean; $clickable: boolean }>`
    display: flex;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 12px 16px 6px;
    position: sticky;
    top: 0;
    z-index: 2;
    font: inherit;
    text-align: left;
    border: none;
    border-bottom: 1px solid ${p => p.$isToday ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.06)'};
    background: ${p => p.$isToday ? '#eff6ff' : '#f8fafc'};
    opacity: ${p => p.$isEmpty ? (p.$clickable ? 0.6 : 0.45) : 1};
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;

    &:active {
        background: ${p => p.$clickable ? (p.$isToday ? '#dbeafe' : '#eef2f7') : undefined};
    }
`;

/*
 * Plusik nie jest ozdobą — bez niego nagłówek nie wygląda na klikalny i cała skrótowa
 * ścieżka pozostaje niewidoczna. Jest przygaszony, żeby nie konkurował z kartami wizyt.
 */
const DayAddHint = styled.span`
    margin-left: auto;
    align-self: center;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #94a3b8;
    background: rgba(15, 23, 42, 0.04);

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DayNum = styled.span<{ $isToday: boolean }>`
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: ${p => p.$isToday ? '#2563eb' : '#0f172a'};
    min-width: 28px;
    letter-spacing: -0.5px;
`;

const DayMeta = styled.div`
    display: flex;
    flex-direction: column;
`;

const DayName = styled.span<{ $isToday: boolean }>`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.$isToday ? '#3b82f6' : '#475569'};
    line-height: 1.2;
    text-transform: capitalize;
`;

const DayMonthYear = styled.span`
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
    line-height: 1.2;
`;

const TodayPill = styled.span`
    font-size: 10px;
    font-weight: 700;
    background: #2563eb;
    color: #fff;
    padding: 2px 7px;
    border-radius: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    align-self: center;
`;

const EventList = styled.div`
    padding: 6px 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const EmptyDay = styled.div`
    padding: 6px 16px 10px;
    font-size: 12px;
    color: #cbd5e1;
    font-style: italic;
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const EventCard = styled.div<{ $color: string; $dimmed: boolean; $started: boolean }>`
    display: flex;
    align-items: stretch;
    gap: 0;
    background: #fff;
    border-radius: 10px;
    border-left: 3px solid ${p => p.$color};
    box-shadow: 0 1px 3px rgba(15,23,42,0.07), 0 0 0 1px rgba(15,23,42,0.04);
    cursor: pointer;
    opacity: ${p => p.$dimmed ? 0.5 : p.$started ? 0.72 : 1};
    animation: ${fadeUp} 0.14s ease both;
    transition: box-shadow 0.15s, transform 0.15s;
    overflow: hidden;

    &:active {
        transform: scale(0.985);
        box-shadow: 0 1px 2px rgba(15,23,42,0.05);
    }
`;

const EventColorBar = styled.div<{ $color: string }>`
    width: 3px;
    background: ${p => p.$color}22;
    flex-shrink: 0;
`;

const EventContent = styled.div`
    flex: 1;
    padding: 9px 11px;
    min-width: 0;
`;

const EventTime = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
`;

const EventTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EventMeta = styled.div`
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const TypeBadge = styled.span<{ $isVisit: boolean }>`
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 1px 5px;
    border-radius: 4px;
    margin-left: 5px;
    background: ${p => p.$isVisit ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)'};
    color: ${p => p.$isVisit ? '#059669' : '#6366f1'};
    vertical-align: middle;
`;

const STATUS_LABEL: Record<string, string> = {
    CREATED: 'Rezerwacja',
    IN_PROGRESS: 'W trakcie',
    READY_FOR_PICKUP: 'Do odbioru',
    COMPLETED: 'Zakończone',
    REJECTED: 'Odrzucone',
    ABANDONED: 'Porzucona',
    CANCELLED: 'Anulowana',
    ARCHIVED: 'Zarchiwizowane',
};

/* Wydarzenie studia na liście: bursztynowa karta z dzwoneczkiem, na górze dnia.
   Bez niej telefon nie pokazywał wydarzeń w ogóle — lista jest tu widokiem
   domyślnym, a znaczniki dnia żyją tylko w siatce miesiąca. */

const StudioCard = styled.button`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: rgba(245, 158, 11, 0.08);
    border: none;
    border-left: 3px solid #F59E0B;
    border-radius: 8px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:active { background: rgba(245, 158, 11, 0.16); }

    > svg {
        width: 15px;
        height: 15px;
        margin-top: 1px;
        color: #B45309;
        flex-shrink: 0;
    }
`;

const StudioCardBody = styled.div`
    min-width: 0;
    flex: 1;
`;

const StudioCardTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #92400E;
`;

const StudioCardMeta = styled.div`
    margin-top: 2px;
    font-size: 12px;
    color: #B45309;
    opacity: 0.85;
`;

const StudioCardDesc = styled.div`
    margin-top: 3px;
    font-size: 12.5px;
    color: #78350F;
    opacity: 0.75;
    line-height: 1.4;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface AgendaListViewProps {
    events: CalendarEvent[];
    /** ISO date string, the range start from dateRange.start */
    rangeStart: string;
    /** ISO date string, the range end from dateRange.end */
    rangeEnd: string;
    /** The currently selected/focused date (dateRange.start for navigated month) */
    focusDate?: string;
    onEventClick: (eventData: AppointmentEventData | VisitEventData, anchor: PopoverAnchor) => void;
    /** Wydarzenia studia rozłożone na dni (klucz „RRRR-MM-DD"). */
    studioEventsByDay?: Map<string, StudioCalendarEvent[]>;
    onStudioEventClick?: (event: StudioCalendarEvent) => void;
    /**
     * Kliknięcie w nagłówek dnia — otwarcie tworzenia rezerwacji z ustawioną datą.
     * Pominięte, gdy użytkownik nie może tworzyć wizyt: nagłówek jest wtedy zwykłym
     * nagłówkiem, bez guzika i bez plusika obiecującego akcję, której nie ma.
     */
    onDayAddClick?: (date: Date) => void;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({
    events,
    rangeStart,
    rangeEnd,
    focusDate,
    onEventClick,
    studioEventsByDay,
    onStudioEventClick,
    onDayAddClick,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const todayKey = toDateKey(new Date());

    const days = buildDays(rangeStart, rangeEnd);
    const byDay = groupEventsByDay(events, days);

    // Scroll to today (or focus date) on mount / when range changes.
    // Liczymy offset i ustawiamy scrollTop samego kontenera zamiast wołać
    // scrollIntoView: ten przewija KAŻDEGO przewijalnego przodka, więc razem
    // z listą przesuwał całą stronę i chował nad ekranem pasek zakładek.
    useEffect(() => {
        const target = focusDate ? toDateKey(new Date(focusDate)) : todayKey;
        const el = document.getElementById(`agenda-day-${target}`);
        const container = scrollRef.current;
        if (!el || !container) return;
        const offset = el.getBoundingClientRect().top
            - container.getBoundingClientRect().top
            + container.scrollTop;
        container.scrollTop = Math.max(0, offset);
    }, [rangeStart, rangeEnd, focusDate, todayKey]);

    return (
        <Root>
            <ScrollArea ref={scrollRef}>
                {days.map(day => {
                    const key = toDateKey(day);
                    const slots = byDay.get(key) ?? [];
                    const studioEvents = studioEventsByDay?.get(key) ?? [];
                    const isToday = key === todayKey;
                    const isEmpty = slots.length === 0 && studioEvents.length === 0;

                    return (
                        <DaySection key={key} id={`agenda-day-${key}`}>
                            <DayHeader
                                as={onDayAddClick ? 'button' : 'div'}
                                type={onDayAddClick ? 'button' : undefined}
                                onClick={onDayAddClick ? () => onDayAddClick(day) : undefined}
                                aria-label={onDayAddClick
                                    ? `Dodaj rezerwację — ${day.getDate()} ${MONTH_NAMES[day.getMonth()]}, ${DAY_NAMES[day.getDay()]}`
                                    : undefined}
                                $isToday={isToday}
                                $isEmpty={isEmpty}
                                $clickable={Boolean(onDayAddClick)}
                            >
                                <DayNum $isToday={isToday}>{day.getDate()}</DayNum>
                                <DayMeta>
                                    <DayName $isToday={isToday}>{DAY_NAMES[day.getDay()]}</DayName>
                                    <DayMonthYear>{MONTH_NAMES[day.getMonth()]} {day.getFullYear()}</DayMonthYear>
                                </DayMeta>
                                {isToday && <TodayPill>dziś</TodayPill>}
                                {onDayAddClick && (
                                    <DayAddHint aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            strokeLinecap="round">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </DayAddHint>
                                )}
                            </DayHeader>

                            {isEmpty ? (
                                <EmptyDay>Brak wydarzeń</EmptyDay>
                            ) : (
                                <EventList>
                                    {studioEvents.map(studioEvent => (
                                        <StudioCard
                                            key={`studio-${studioEvent.id}`}
                                            type="button"
                                            onClick={() => onStudioEventClick?.(studioEvent)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                            </svg>
                                            <StudioCardBody>
                                                <StudioCardTitle>{studioEvent.title}</StudioCardTitle>
                                                <StudioCardMeta>
                                                    {studioEvent.startDate === studioEvent.endDate
                                                        ? 'Wydarzenie · cały dzień'
                                                        : 'Wydarzenie · kilka dni'}
                                                </StudioCardMeta>
                                                {studioEvent.description && (
                                                    <StudioCardDesc>{studioEvent.description}</StudioCardDesc>
                                                )}
                                            </StudioCardBody>
                                        </StudioCard>
                                    ))}
                                    {slots.map(({ event, startTime, endTime, isAllDay }, idx) => {
                                        const data = event.extendedProps as AppointmentEventData | VisitEventData;
                                        const isVisit = data.type === 'VISIT';
                                        const color = event.backgroundColor || '#6366f1';
                                        const statusKey = data.status ?? '';
                                        const isCancelled = statusKey === 'CANCELLED' || statusKey === 'ABANDONED';

                                        const meta = [
                                            data.vehicleInfo,
                                            isVisit ? (data as VisitEventData).licensePlate : null,
                                        ].filter(Boolean).join(' · ');

                                        return (
                                            <EventCard
                                                key={`${event.id}-${idx}`}
                                                $color={color}
                                                $dimmed={isCancelled}
                                                $started={isStartedVisit(statusKey)}
                                                onClick={e => {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    onEventClick(data, { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
                                                }}
                                            >
                                                <EventContent>
                                                    <EventTime>
                                                        {isAllDay
                                                            ? 'Cały dzień'
                                                            : endTime
                                                                ? `${startTime}-${endTime}`
                                                                : startTime
                                                        }
                                                        <TypeBadge $isVisit={isVisit}>
                                                            {isVisit ? 'Wizyta' : 'Rezerwacja'}
                                                        </TypeBadge>
                                                    </EventTime>
                                                    <EventTitle>
                                                        <PiiText value={event.title} kind="name" />
                                                    </EventTitle>
                                                    {meta && <EventMeta>{meta}</EventMeta>}
                                                    {statusKey && STATUS_LABEL[statusKey] && (
                                                        <EventMeta style={{ color: isCancelled ? '#ef4444' : '#64748b' }}>
                                                            {STATUS_LABEL[statusKey]}
                                                        </EventMeta>
                                                    )}
                                                </EventContent>
                                            </EventCard>
                                        );
                                    })}
                                </EventList>
                            )}
                        </DaySection>
                    );
                })}
            </ScrollArea>
        </Root>
    );
};
