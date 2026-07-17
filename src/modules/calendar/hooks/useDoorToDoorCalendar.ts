// src/modules/calendar/hooks/useDoorToDoorCalendar.ts

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DoorToDoorCalendarDay } from '../types';

/**
 * Dzienna mapa wyjazdów Door to Door dla widoku kalendarza.
 * Zwraca Map: 'YYYY-MM-DD' → DoorToDoorCalendarDay (dni bez wyjazdów nie występują w mapie).
 * Klucz zaczyna się od 'calendar-events', więc inwalidacje po utworzeniu/usunięciu
 * rezerwacji i wizyt odświeżają też ten badge.
 */
export const useDoorToDoorCalendar = (from: string | null, to: string | null) => {
    const { data, isLoading } = useQuery({
        queryKey: ['calendar-events', 'door-to-door', from, to],
        queryFn: () => calendarApi.getDoorToDoorCalendar(from!, to!),
        enabled: !!from && !!to,
        staleTime: 60_000,
    });

    const d2dDayMap = useMemo(() => {
        const map = new Map<string, DoorToDoorCalendarDay>();
        (data ?? []).forEach(day => map.set(day.date, day));
        return map;
    }, [data]);

    return { d2dDayMap, isLoading };
};
