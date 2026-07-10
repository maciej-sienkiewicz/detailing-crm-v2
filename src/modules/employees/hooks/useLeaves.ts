import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { AddLeavePayload, LeaveCalendarDay } from '../types';

const leavesKey = (employeeId: string) => ['employees', 'leaves', employeeId];
const LEAVE_CALENDAR_KEY = ['employees', 'leave-calendar'];

export const useLeaves = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: leavesKey(employeeId),
        queryFn: () => employeeApi.listLeaves(employeeId),
        enabled: !!employeeId,
    });
    return { leaves: data ?? [], isLoading, isError, refetch };
};

export const useAddLeave = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddLeavePayload) => employeeApi.addLeave(employeeId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leavesKey(employeeId) });
            queryClient.invalidateQueries({ queryKey: LEAVE_CALENDAR_KEY });
        },
    });
};

export const useDeleteLeave = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (leaveId: string) => employeeApi.deleteLeave(employeeId, leaveId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leavesKey(employeeId) });
            queryClient.invalidateQueries({ queryKey: LEAVE_CALENDAR_KEY });
        },
    });
};

/**
 * Dzienna mapa urlopów dla widoku kalendarza.
 * Zwraca Map: 'YYYY-MM-DD' → LeaveCalendarDay (dni bez urlopów nie występują w mapie).
 */
export const useLeaveCalendar = (from: string | null, to: string | null) => {
    const { data, isLoading } = useQuery({
        queryKey: [...LEAVE_CALENDAR_KEY, from, to],
        queryFn: () => employeeApi.getLeaveCalendar(from!, to!),
        enabled: !!from && !!to,
        staleTime: 60_000,
    });

    const leaveDayMap = useMemo(() => {
        const map = new Map<string, LeaveCalendarDay>();
        (data ?? []).forEach(day => map.set(day.date, day));
        return map;
    }, [data]);

    return { leaveDayMap, isLoading };
};
