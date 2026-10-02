import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendanceApi';
import { pendingCount } from '../components/worktime/settlementFormat';
import { invalidateWorktimeTeam } from './useWorktimeMonths';

export const ATTENDANCE_SHEETS_KEY = ['employees', 'attendance-sheets'] as const;

/**
 * Wygenerowane listy obecności. Ta sama lista zasila tabelę w zakładce „Listy obecności"
 * i licznik „do zatwierdzenia" na samej zakładce - jeden wpis w cache, jedno żądanie.
 */
export const useAttendanceSheets = (options?: { enabled?: boolean }) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ATTENDANCE_SHEETS_KEY,
        queryFn: () => attendanceApi.listAttendanceSheets(),
        // Licznik przy zakładce pyta o listy tylko tych, którzy ją widzą.
        enabled: options?.enabled ?? true,
    });
    return { sheets: data ?? [], isLoading, isError, refetch };
};

/** Listy wygenerowane i jeszcze niezatwierdzone - licznik zakładki „Listy obecności". */
export const usePendingSheetsCount = (enabled: boolean) => {
    const { sheets } = useAttendanceSheets({ enabled });
    return enabled ? pendingCount(sheets) : 0;
};

const useInvalidateSheets = () => {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHEETS_KEY });
        // Lista wpływa też na licznik przy „Pracownicy" (listy do podpisu).
        invalidateWorktimeTeam(queryClient);
    };
};

export const useGenerateAttendanceSheet = () => {
    const invalidate = useInvalidateSheets();
    return useMutation({
        mutationFn: ({ period, employeeIds }: { period: string; employeeIds: string[] }) =>
            attendanceApi.generateAttendanceSheet(period, employeeIds),
        onSuccess: () => invalidate(),
    });
};

/**
 * Po błędzie też odświeżamy listę: najczęstszy błąd to „ktoś zatwierdził albo usunął
 * tę listę przed chwilą", a wtedy tabela ma od razu pokazać stan po jego ruchu.
 */
export const useApproveAttendanceSheet = () => {
    const invalidate = useInvalidateSheets();
    return useMutation({
        mutationFn: ({ sheetId, signatureImage }: { sheetId: string; signatureImage: string | null }) =>
            attendanceApi.approveAttendanceSheet(sheetId, signatureImage),
        onSettled: () => invalidate(),
    });
};

export const useDeleteAttendanceSheet = () => {
    const invalidate = useInvalidateSheets();
    return useMutation({
        mutationFn: (sheetId: string) => attendanceApi.deleteAttendanceSheet(sheetId),
        onSettled: () => invalidate(),
    });
};
