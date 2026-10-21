// src/modules/calendar/components/DayEventsSheet.tsx
//
// Lista wizyt jednego dnia, otwierana z siatki miesiąca na telefonie.
//
// Komórka dnia ma na telefonie ~55 px szerokości i mieści dwie, trzy wizyty, resztę
// chowa pod „+N". Dotknięcie takiego dnia zakładało nową rezerwację, więc żeby
// zobaczyć, co już stoi na ten dzień, trzeba było trafić palcem w samo „+N" albo
// przełączyć się na Listę i przewinąć. Dzień, który się nie mieści, otwiera więc
// najpierw to, czego w komórce nie widać - a nowa rezerwacja jest krokiem następnym
// w stopce, nie zniknęła.

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Button, IconButton } from '@/common/components/ui';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import type { AppointmentEventData, CalendarEvent, StudioCalendarEvent, VisitEventData } from '../types';
import type { PopoverAnchor } from './EventSummaryPopover';
import { AgendaDayEventList } from './AgendaListView';

/*
 * Pod EventSummaryPopover (999/1000), a nie nad nim jak panel wydarzeń studia:
 * dotknięta wizyta otwiera swój podgląd NAD listą, a jego zamknięcie wraca do listy
 * dnia, zamiast wyrzucać z powrotem na siatkę.
 */
const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 990;
    background: rgba(15, 23, 42, 0.35);
`;

const Sheet = styled.div`
    position: fixed;
    z-index: 991;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    max-height: calc(100dvh - 96px);
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
    overflow: hidden;

    @media (min-width: 640px) {
        left: 50%;
        right: auto;
        top: 50%;
        bottom: auto;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 80vh;
    }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 12px 16px;
    border-bottom: 1px solid #f1f5f9;
`;

const DayNum = styled.span<{ $isToday: boolean }>`
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.5px;
    color: ${p => p.$isToday ? '#075985' : '#0f172a'};
`;

const DayMeta = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DayName = styled.span<{ $isToday: boolean }>`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.$isToday ? '#075985' : '#0f172a'};
    text-transform: capitalize;
`;

const DayMonth = styled.span`
    font-size: 12px;
    color: #64748b;
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    background: #f8fafc;
    padding-top: 4px;
`;

const Empty = styled.div`
    padding: 20px 16px;
    font-size: 13px;
    color: #94a3b8;
    text-align: center;
`;

const Foot = styled.div`
    padding: 10px 12px;
    border-top: 1px solid #f1f5f9;
    background: #fff;
`;

const pad = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const countLabel = (n: number): string => {
    if (n === 1) return '1 pozycja';
    const lastTwo = n % 100;
    const last = n % 10;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} pozycje`;
    return `${n} pozycji`;
};

export interface DayEventsSheetProps {
    date: Date;
    /** Wizyty i rezerwacje leżące na tym dniu (eventCoversDay). */
    events: CalendarEvent[];
    studioEvents?: StudioCalendarEvent[];
    onClose: () => void;
    /**
     * Fałsz, gdy nad arkuszem stoi podgląd wizyty: Escape zamyka wtedy tylko podgląd,
     * a lista dnia zostaje pod spodem - po to w ogóle leży pod nim.
     */
    closeOnEscape?: boolean;
    onEventClick: (eventData: AppointmentEventData | VisitEventData, anchor: PopoverAnchor) => void;
    onStudioEventClick?: (event: StudioCalendarEvent) => void;
    /** Nazwy usług na kartach - to samo ustawienie co w widoku Lista. */
    showServices?: boolean;
    /** Pominięte bez prawa do tworzenia wizyt - wtedy nie ma stopki z obietnicą bez pokrycia. */
    onAddClick?: () => void;
}

export const DayEventsSheet: React.FC<DayEventsSheetProps> = ({
    date,
    events,
    studioEvents = [],
    onClose,
    closeOnEscape = true,
    onEventClick,
    onStudioEventClick,
    onAddClick,
    showServices = false,
}) => {
    // Własna nakładka poza ModalShell - blokada tła w osobnym efekcie (CLAUDE.md §3).
    useEffect(() => acquireScrollLock(), []);

    useEffect(() => {
        if (!closeOnEscape) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [closeOnEscape, onClose]);

    const isToday = toDateKey(date) === toDateKey(new Date());
    const total = events.length + studioEvents.length;
    // „października 2026", nie „październik 2026": dopełniacz bierze się tylko z pełnej daty.
    const monthGenitive = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
        .replace(/^\d+\s/, '');

    return (
        <>
            <Backdrop onClick={onClose} />
            <Sheet role="dialog" aria-modal="true" aria-label={`Wizyty dnia ${date.toLocaleDateString('pl-PL')}`}>
                <Head>
                    <DayNum $isToday={isToday}>{date.getDate()}</DayNum>
                    <DayMeta>
                        <DayName $isToday={isToday}>
                            {date.toLocaleDateString('pl-PL', { weekday: 'long' })}
                        </DayName>
                        <DayMonth>{monthGenitive}, {countLabel(total)}</DayMonth>
                    </DayMeta>
                    <IconButton label="Zamknij" variant="ghost" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </IconButton>
                </Head>

                <Body>
                    {total === 0 ? (
                        <Empty>Brak wizyt tego dnia.</Empty>
                    ) : (
                        <AgendaDayEventList
                            events={events}
                            studioEvents={studioEvents}
                            onEventClick={onEventClick}
                            onStudioEventClick={onStudioEventClick}
                            showServices={showServices}
                        />
                    )}
                </Body>

                {onAddClick && (
                    <Foot>
                        {/* Jedyne wypełnienie w arkuszu: karty wizyt są treścią, to jest krok następny. */}
                        <Button variant="primary" size="lg" block onClick={onAddClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                width="16" height="16" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nowa rezerwacja
                        </Button>
                    </Foot>
                )}
            </Sheet>
        </>
    );
};
