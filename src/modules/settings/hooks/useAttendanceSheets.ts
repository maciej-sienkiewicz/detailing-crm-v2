import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendanceApi';

export const ATTENDANCE_SHEETS_KEY = ['settings', 'attendance-sheets'] as const;

/**
 * Rozliczenia (wygenerowane listy obecności). Ta sama lista zasila tabelę w zakładce
 * i licznik „do zatwierdzenia" na samej zakładce - jeden wpis w cache, jedno żądanie.
 */
export const useAttendanceSheets = (options?: { enabled?: boolean }) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ATTENDANCE_SHEETS_KEY,
        queryFn: () => attendanceApi.listAttendanceSheets(),
        // Licznik w menu ustawień pyta o rozliczenia tylko tym, którzy widzą zespół.
        enabled: options?.enabled ?? true,
    });
    return { sheets: data ?? [], isLoading, isError, refetch };
};

const useInvalidateSheets = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHEETS_KEY });
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
