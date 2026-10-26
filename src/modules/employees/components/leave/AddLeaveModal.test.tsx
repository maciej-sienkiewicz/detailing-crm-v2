// @vitest-environment jsdom
//
// „Dodaj urlop" administratora: jeden ekran (pracownik, rodzaj, termin w kalendarzu na
// stałe, powód) i „Zapisz urlop", który zapisuje urlop OD RAZU ZATWIERDZONY - bez kroku
// decyzji. Potem podpis pracownika: teraz, na tablecie, SMS-em albo bez podpisu. W każdym
// ekranie jedno wypełnienie.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { employeeApi } from '../../api/employeeApi';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import type { EmployeeListItem, LeaveRequestDetail } from '../../types';
import { AddLeaveModal } from './AddLeaveModal';
import { filledIn } from './leaveTestHelpers';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { userId: 'u-admin', employeeId: 'emp-self', permissions: null } }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true, lockReason: null, isLoading: false }) }));
vi.mock('@/modules/checkin/hooks/useSignatureRequestsSocket', () => ({ useSignatureRequestsSocket: () => undefined }));
vi.mock('../../api/employeeApi', () => ({
    employeeApi: { listEmployees: vi.fn(), getLeaveCalendar: vi.fn() },
}));
vi.mock('../../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/leaveRequestsApi')>()),
    leaveRequestsApi: {
        record: vi.fn(),
        preview: vi.fn(),
        document: vi.fn(),
        employeeSigningSession: vi.fn(),
        employeeSignature: vi.fn(),
        signingOptions: vi.fn(),
        requestSignature: vi.fn(),
        latestSignature: vi.fn(),
        cancelSignature: vi.fn(),
        get: vi.fn(),
    },
}));
vi.mock('@/modules/public-signing/components/PdfPagesViewer', () => ({
    PdfPagesViewer: () => <div data-testid="pdf-viewer" />,
}));
vi.mock('@/common/components/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void }>(function FakePad({ onInkChange }, ref) {
        useImperativeHandle(ref, () => ({
            clear: () => onInkChange?.(false),
            isEmpty: () => false,
            toDataUrl: () => 'data:image/png;base64,PODPIS',
            toPngBase64: () => 'PODPIS-PRACOWNIKA',
        }));
        return <button type="button" onClick={() => onInkChange?.(true)}>atrapa podpisu</button>;
    }),
}));

const api = vi.mocked(leaveRequestsApi);

const person = (id: string, fullName: string, hasAccount = true): EmployeeListItem => ({
    id, fullName, firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1], email: null, phone: null, hasAccount, role: null,
});

const approved = (overrides: Partial<LeaveRequestDetail> = {}): LeaveRequestDetail => ({
    id: 'leave-1',
    number: 'WU/2026/0031',
    employeeId: 'emp-piotr',
    employeeName: 'Piotr Lis',
    leaveType: 'ANNUAL',
    onDemand: false,
    startDate: '2026-10-07',
    endDate: '2026-10-09',
    workingDays: 3,
    status: 'APPROVED',
    reason: null,
    origin: 'ON_BEHALF',
    createdByName: 'Jan Kowalski',
    createdAt: '2026-10-01T10:00:00+02:00',
    employeeSignedAt: null,
    decidedAt: '2026-10-01T10:00:00+02:00',
    decidedByName: 'Jan Kowalski',
    decisionNote: null,
    cancelReason: null,
    employeeSignatureMethod: null,
    decisionSignatureMethod: null,
    overlappingAbsences: [],
    canDecide: false,
    decisionBlockedReason: null,
    canCancel: true,
    ...overrides,
});

const renderModal = (props: Partial<Parameters<typeof AddLeaveModal>[0]> = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AddLeaveModal onClose={onClose} {...props} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const form = () => screen.getByRole('dialog', { name: 'Dodaj urlop' });
const signing = () => screen.getByRole('dialog', { name: 'Podpis pracownika' });

/** Piotr, wypoczynkowy (domyślny), 7-9 października w kalendarzu, „Zapisz urlop". */
const recordLeave = async () => {
    const select = await within(form()).findByLabelText('Pracownik');
    await within(select as HTMLElement).findByRole('option', { name: 'Piotr Lis' });
    fireEvent.change(select, { target: { value: 'emp-piotr' } });
    fireEvent.click(within(form()).getByRole('button', { name: '7 października' }));
    fireEvent.click(within(form()).getByRole('button', { name: '9 października' }));
    await within(form()).findByText(/3 dni robocze/);
    fireEvent.click(within(form()).getByRole('button', { name: /Zapisz urlop/ }));
    await screen.findByRole('dialog', { name: 'Podpis pracownika' });
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    vi.mocked(employeeApi.listEmployees).mockResolvedValue({
        items: [person('emp-self', 'Jan Kowalski'), person('emp-piotr', 'Piotr Lis', false), person('emp-anna', 'Anna Nowak')],
        page: { number: 1, size: 100, totalItems: 3, totalPages: 1 },
    });
    vi.mocked(employeeApi.getLeaveCalendar).mockResolvedValue([]);
    api.preview.mockResolvedValue({ workingDays: 3, holidays: [] });
    api.record.mockResolvedValue(approved());
    api.signingOptions.mockResolvedValue({ tablets: [{ tabletId: 't-1', deviceName: 'Recepcja' }], employeePhone: '+48600100200' });
    api.latestSignature.mockResolvedValue(null);
    api.employeeSigningSession.mockResolvedValue({ documentSha256: 'f'.repeat(64), challenge: 'emp-1' });
    api.document.mockResolvedValue({ bytes: new ArrayBuffer(8), sha256: 'f'.repeat(64) });
    api.employeeSignature.mockResolvedValue(approved({ employeeSignedAt: '2026-10-01T10:05:00+02:00', employeeSignatureMethod: 'IN_PERSON' }));
    api.requestSignature.mockResolvedValue({
        id: 'sig-1', attendanceSheetId: null, tabletId: null, channel: 'SMS_LINK', status: 'PENDING_DISPLAY',
        expiresAt: '2026-10-04T10:00:00+02:00', failureReason: null,
    } as never);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('AddLeaveModal', () => {
    it('lista pracowników bez siebie; osoba bez konta też jest do wyboru', async () => {
        renderModal();
        const select = await within(form()).findByLabelText('Pracownik');
        await within(select as HTMLElement).findByRole('option', { name: 'Piotr Lis' });
        expect(within(select as HTMLElement).queryByRole('option', { name: 'Jan Kowalski' })).toBeNull();
        expect(within(select as HTMLElement).getByRole('option', { name: 'Anna Nowak' })).toBeTruthy();
    });

    it('„Zapisz urlop" zapisuje urlop od razu zatwierdzony - bez kroku decyzji', async () => {
        renderModal();
        await recordLeave();

        expect(api.record).toHaveBeenCalledWith({
            employeeId: 'emp-piotr', leaveType: 'ANNUAL', onDemand: false, startDate: '2026-10-07', endDate: '2026-10-09',
        });
        expect(screen.queryByText(/Twoja decyzja/)).toBeNull();
    });

    it('podpis teraz: pracownik podpisuje na tym urządzeniu pod wersją zatwierdzoną', async () => {
        renderModal();
        await recordLeave();

        await waitFor(() => expect(api.employeeSigningSession).toHaveBeenCalledWith('leave-1'));
        fireEvent.click(within(signing()).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(signing()).getByRole('button', { name: 'atrapa podpisu' }));
        fireEvent.click(within(signing()).getByRole('button', { name: /^Podpisz/ }));

        await within(signing()).findByText('Pracownik podpisał wniosek');
        expect(api.employeeSignature).toHaveBeenCalledWith('leave-1', {
            signatureImageBase64: 'PODPIS-PRACOWNIKA', documentSha256: 'f'.repeat(64), challenge: 'emp-1', declarationAccepted: true,
        });
    });

    it('SMS z linkiem idzie domyślnie na numer z karty pracownika, który można poprawić', async () => {
        renderModal();
        await recordLeave();

        fireEvent.click(within(signing()).getByRole('radio', { name: /SMS z linkiem/ }));
        const phone = await within(signing()).findByLabelText('Numer telefonu');
        await waitFor(() => expect((phone as HTMLInputElement).value).toBe('+48600100200'));
        fireEvent.change(phone, { target: { value: '+48 500 600 700' } });
        fireEvent.click(within(signing()).getByRole('button', { name: /Wyślij SMS/ }));

        await within(signing()).findByText('Czeka na podpis pracownika');
        expect(api.requestSignature).toHaveBeenCalledWith('leave-1', { channel: 'SMS', phone: '+48 500 600 700' });
    });

    it('bez podpisu: urlop zostaje zapisany, okno się zamyka bez żadnej prośby', async () => {
        const { onClose } = renderModal();
        await recordLeave();

        fireEvent.click(within(signing()).getByRole('radio', { name: /Bez podpisu/ }));
        fireEvent.click(within(signing()).getByRole('button', { name: /Gotowe/ }));

        expect(onClose).toHaveBeenCalled();
        expect(api.requestSignature).not.toHaveBeenCalled();
        expect(api.employeeSignature).not.toHaveBeenCalled();
    });

    it('dni zaznaczone w siatce „Nieobecności" są już w oknie', async () => {
        renderModal({ employeeId: 'emp-piotr', startDate: '2026-10-12', endDate: '2026-10-14' });
        await within(form()).findByText(/3 dni robocze/);
        expect(within(form()).queryByLabelText('Pracownik')).toBeNull();

        fireEvent.click(within(form()).getByRole('button', { name: /Zapisz urlop/ }));
        await waitFor(() => expect(api.record).toHaveBeenCalledWith(expect.objectContaining({
            employeeId: 'emp-piotr', startDate: '2026-10-12', endDate: '2026-10-14',
        })));
    });

    it('w każdym ekranie dokładnie jedno wypełnienie', async () => {
        renderModal();
        await within(form()).findByLabelText('Pracownik');
        expect(filledIn(form())).toHaveLength(1);
        await recordLeave();
        expect(filledIn(signing())).toHaveLength(1);
    });
});
