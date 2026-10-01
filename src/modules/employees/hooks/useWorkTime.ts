import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';

// Klucz pod korzeniem ['worktime', 'team'] - decyzje z okna przeglądu karty
// (useWorktimeMonths.ts) unieważniają cały korzeń, więc lista okresów na karcie
// pracownika odświeża się razem z widokiem miesiąca.
const teamKey = (userId: string) => ['worktime', 'team', userId];

export const useTeamWorkTimePeriods = (userId: string | null | undefined) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: teamKey(userId ?? ''),
        queryFn: () => employeeApi.getTeamWorkTimePeriods(userId!),
        enabled: !!userId,
    });
    return { periods: data ?? [], isLoading, isError, refetch };
};
