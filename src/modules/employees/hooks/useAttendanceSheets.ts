import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendanceApi';
import { invalidateWorktimeTeam } from './useWorktimeMonths';

export const ATTENDANCE_SHEETS_KEY = ['employees', 'attendance-sheets'] as const;

/**
 * Podpis listy obecności. Lista powstaje w widoku miesiąca (POST /months/{p}/sheet),
 * a jej podpis zmienia etap miesiąca i licznik „do podpisu" - po nim odświeżamy przegląd
 * miesiąca razem z licznikami.
 *
 * Po błędzie też odświeżamy: najczęstszy błąd to „ktoś podpisał tę listę przed chwilą",
 * a wtedy widok ma od razu pokazać stan po jego ruchu.
 */
export const useApproveAttendanceSheet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sheetId, signatureImage }: { sheetId: string; signatureImage: string | null }) =>
            attendanceApi.approveAttendanceSheet(sheetId, signatureImage),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHEETS_KEY });
            invalidateWorktimeTeam(queryClient);
        },
    });
};
