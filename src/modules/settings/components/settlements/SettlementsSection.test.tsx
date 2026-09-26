// @vitest-environment jsdom
//
// Rozliczenia: każdy administrator widzi, które listy obecności czekają na zatwierdzenie,
// kto je wygenerował i kto zatwierdził - i może je podejrzeć, zatwierdzić albo usunąć.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { attendanceApi, saveBlobAsFile, type AttendanceSheet } from '../../api/attendanceApi';
import { SettlementsSection } from './SettlementsSection';

vi.mock('../../api/attendanceApi', async importOriginal => {
    const original = await importOriginal<typeof import('../../api/attendanceApi')>();
    return {
        ...original,
        saveBlobAsFile: vi.fn(),
        attendanceApi: {
            listAttendanceSheets: vi.fn(),
            generateAttendanceSheet: vi.fn(),
            approveAttendanceSheet: vi.fn(),
            deleteAttendanceSheet: vi.fn(),
            downloadAttendanceSheet: vi.fn(),
            // Okno zatwierdzania pyta też o podpis na tablecie / telefonie.
            getSigningOptions: vi.fn(async () => ({ tablets: [], phone: null })),
            getLatestRemoteSignature: vi.fn(async () => null),
            requestRemoteSignature: vi.fn(),
            cancelRemoteSignature: vi.fn(),
        },
    };
});

vi.mock('@/modules/checkin/hooks/useSignatureRequestsSocket', () => ({ useSignatureRequestsSocket: () => undefined }));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true, lockReason: null }) }));

// pdf.js i kanwa nie działają w jsdom - podgląd i podpis podmieniamy na atrapy.
vi.mock('@/modules/public-signing/components/PdfPagesViewer', () => ({
    PdfPagesViewer: () => <div data-testid="pdf-viewer" />,
}));

vi.mock('../team/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void }>(function FakePad({ onInkChange }, ref) {
        useImperativeHandle(ref, () => ({ clear: () => onInkChange?.(false), toDataUrl: () => 'data:image/png;base64,PODPIS' }));
        return <button type="button" onClick={() => onInkChange?.(true)}>atrapa: złóż podpis</button>;
    }),
}));

const sheet = (overrides: Partial<AttendanceSheet>): AttendanceSheet => ({
    id: 'sheet-sep',
    period: '2026-09',
    employeeCount: 3,
    signed: false,
    signerName: null,
    signedAt: null,
    createdAt: Date.parse('2026-09-23T12:05:00Z'),
    status: 'GENERATED',
    createdByName: 'Jan Kowalski',
    approvedAt: null,
    approvedByName: null,
    ...overrides,
});

const pending = sheet({});
const approved = sheet({
    id: 'sheet-aug',
    period: '2026-08',
    status: 'APPROVED',
    createdByName: 'Anna Nowak',
    approvedByName: 'Ewa Zielińska',
    approvedAt: Date.parse('2026-09-02T08:00:00Z'),
    signed: true,
});

const renderSection = (props: Parameters<typeof SettlementsSection>[0] = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SettlementsSection {...props} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const rowOf = async (period: string) =>
    (await screen.findByText(period)).closest('[data-testid="settlement-row"]') as HTMLElement;

beforeEach(() => {
    vi.mocked(attendanceApi.listAttendanceSheets).mockResolvedValue([pending, approved]);
    vi.mocked(attendanceApi.approveAttendanceSheet).mockResolvedValue({ ...pending, status: 'APPROVED' });
    vi.mocked(attendanceApi.deleteAttendanceSheet).mockResolvedValue();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SettlementsSection - zakładka Rozliczenia', () => {
    it('pokazuje okres, kiedy i kto wygenerował oraz status', async () => {
        renderSection();

        const september = await rowOf('Wrzesień 2026');
        expect(within(september).getByText('01.09–30.09.2026')).toBeTruthy();
        expect(within(september).getByText('3 pracowników')).toBeTruthy();
        expect(within(september).getByText('Jan Kowalski')).toBeTruthy();
        expect(within(september).getByText('Do zatwierdzenia')).toBeTruthy();

        const august = await rowOf('Sierpień 2026');
        expect(within(august).getByText('Zatwierdzona')).toBeTruthy();
        expect(within(august).getByText('Anna Nowak')).toBeTruthy();
        expect(within(august).getByText('Ewa Zielińska')).toBeTruthy();
        expect(within(august).getByText('podpisana')).toBeTruthy();
    });

    it('zatwierdzonej listy nie da się zatwierdzić drugi raz', async () => {
        renderSection();

        expect(within(await rowOf('Wrzesień 2026')).queryByRole('button', { name: 'Zatwierdź' })).not.toBeNull();
        expect(within(await rowOf('Sierpień 2026')).queryByRole('button', { name: 'Zatwierdź' })).toBeNull();
    });

    it('zatwierdzenie wymaga podpisu', async () => {
        renderSection();
        fireEvent.click(within(await rowOf('Wrzesień 2026')).getByRole('button', { name: 'Zatwierdź' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).queryByRole('button', { name: 'Zatwierdź' })).toBeNull();
        expect((within(dialog).getByRole('button', { name: 'Podpisz i zatwierdź' }) as HTMLButtonElement).disabled).toBe(true);
        expect(attendanceApi.approveAttendanceSheet).not.toHaveBeenCalled();
    });

    it('zatwierdzenie z podpisem wysyła podpis razem z zatwierdzeniem', async () => {
        renderSection();
        fireEvent.click(within(await rowOf('Wrzesień 2026')).getByRole('button', { name: 'Zatwierdź' }));

        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Podpisz i zatwierdź' }));

        await waitFor(() =>
            expect(attendanceApi.approveAttendanceSheet).toHaveBeenCalledWith('sheet-sep', 'data:image/png;base64,PODPIS'),
        );
        expect(await screen.findByText('Lista obecności zatwierdzona')).toBeTruthy();
    });

    it('usunięcie wymaga potwierdzenia', async () => {
        renderSection();
        fireEvent.click(within(await rowOf('Wrzesień 2026')).getByRole('button', { name: 'Usuń rozliczenie: Wrzesień 2026' }));

        expect(attendanceApi.deleteAttendanceSheet).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));

        await waitFor(() => expect(attendanceApi.deleteAttendanceSheet).toHaveBeenCalledWith('sheet-sep'));
    });

    it('nieudane usunięcie pokazuje dymek, zamiast udawać, że nic się nie stało', async () => {
        vi.mocked(attendanceApi.deleteAttendanceSheet).mockRejectedValue({ response: { status: 500, data: {} } });
        renderSection();
        fireEvent.click(within(await rowOf('Wrzesień 2026')).getByRole('button', { name: 'Usuń rozliczenie: Wrzesień 2026' }));
        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));

        expect(await screen.findByText('Nie udało się usunąć rozliczenia')).toBeTruthy();
    });

    it('błąd wczytania rozliczeń to nie pusta lista', async () => {
        vi.mocked(attendanceApi.listAttendanceSheets).mockRejectedValueOnce({ response: { status: 500, data: {} } });
        renderSection();

        expect(await screen.findByText('Nie udało się wczytać rozliczeń')).toBeTruthy();
        expect(screen.queryByText('Brak rozliczeń')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(await rowOf('Wrzesień 2026')).toBeTruthy();
    });

    it('podgląd wyświetla plik, a na dysk trafia dopiero po „Pobierz PDF"', async () => {
        vi.mocked(attendanceApi.downloadAttendanceSheet)
            .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Blob);
        renderSection();
        fireEvent.click(within(await rowOf('Wrzesień 2026')).getByRole('button', { name: 'Podgląd' }));

        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByTestId('pdf-viewer')).toBeTruthy();
        expect(saveBlobAsFile).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Pobierz PDF' }));
        expect(saveBlobAsFile).toHaveBeenCalledWith(expect.anything(), 'lista-obecnosci-2026-09.pdf');
    });

    it('pusta lista mówi, skąd biorą się rozliczenia', async () => {
        vi.mocked(attendanceApi.listAttendanceSheets).mockResolvedValue([]);
        const onGoToEmployees = vi.fn();
        renderSection({ onGoToEmployees });

        expect(await screen.findByText('Brak rozliczeń')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Przejdź do pracowników' }));
        expect(onGoToEmployees).toHaveBeenCalled();
    });
});
