// @vitest-environment jsdom
//
// Wygenerowana lista obecności nie pobiera się od razu: trafia do zakładki Rozliczenia,
// gdzie widzą ją wszyscy administratorzy. Pobranie pliku zaraz po generowaniu było
// początkiem problemu - plik znikał w folderze Pobrane jednej osoby.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { attendanceApi, saveBlobAsFile, type AttendanceSheet } from '../../api/attendanceApi';
import { AttendanceSheetModal } from './AttendanceSheetModal';

vi.mock('../../api/attendanceApi', async importOriginal => {
    const original = await importOriginal<typeof import('../../api/attendanceApi')>();
    return {
        ...original,
        saveBlobAsFile: vi.fn(),
        attendanceApi: {
            generateAttendanceSheet: vi.fn(),
            downloadAttendanceSheet: vi.fn(),
            listAttendanceSheets: vi.fn().mockResolvedValue([]),
        },
    };
});

const generated: AttendanceSheet = {
    id: 'sheet-1',
    period: '2026-09',
    employeeCount: 2,
    signed: false,
    signerName: null,
    signedAt: null,
    createdAt: Date.parse('2026-09-23T12:00:00Z'),
    status: 'GENERATED',
    createdByName: 'Jan Kowalski',
    approvedAt: null,
    approvedByName: null,
};

const renderModal = () => {
    const onClose = vi.fn();
    const onGenerated = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AttendanceSheetModal
                        employeeIds={['e1', 'e2']}
                        employeeCount={2}
                        onClose={onClose}
                        onGenerated={onGenerated}
                    />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose, onGenerated };
};

beforeEach(() => {
    vi.mocked(attendanceApi.generateAttendanceSheet).mockResolvedValue(generated);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AttendanceSheetModal - lista obecności trafia do Rozliczeń', () => {
    it('generuje listę za wybrany miesiąc, niczego nie pobiera i zgłasza, dokąd trafiła', async () => {
        const { onClose, onGenerated } = renderModal();

        fireEvent.change(screen.getByLabelText('Miesiąc'), { target: { value: '9' } });
        fireEvent.change(screen.getByLabelText('Rok'), { target: { value: String(new Date().getFullYear()) } });
        fireEvent.click(screen.getByRole('button', { name: 'Generuj listę' }));

        await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(generated));
        expect(attendanceApi.generateAttendanceSheet).toHaveBeenCalledWith(
            `${new Date().getFullYear()}-09`, ['e1', 'e2'],
        );
        expect(attendanceApi.downloadAttendanceSheet).not.toHaveBeenCalled();
        expect(saveBlobAsFile).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(await screen.findByText('Lista obecności w Rozliczeniach')).toBeTruthy();
    });

    it('błąd generowania zostaje w oknie i niczego nie zgłasza', async () => {
        vi.mocked(attendanceApi.generateAttendanceSheet).mockRejectedValue({
            response: { data: { message: 'Żaden z zaznaczonych pracowników nie ma włączonego modułu Czasu pracy.' } },
        });
        const { onClose, onGenerated } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Generuj listę' }));

        expect((await screen.findByRole('alert')).textContent).toContain('modułu Czasu pracy');
        expect(onGenerated).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });
});
