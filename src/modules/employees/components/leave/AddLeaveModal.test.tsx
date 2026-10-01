// @vitest-environment jsdom
//
// „Dodaj urlop" administratora (ON_BEHALF): pracownik (bez siebie, także bez konta),
// rodzaj, termin z kalendarza zakresu, podpis pracownika na tym urządzeniu i decyzja
// administratora z podpisem. W każdym kroku jedno wypełnienie. Zamknięcie przed
// podpisem pracownika porzuca szkic; po podpisie - pyta i zostawia wniosek w kolejce.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { profileApi } from '@/modules/profile/api/profileApi';
import { employeeApi } from '../../api/employeeApi';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import type { EmployeeListItem, LeaveRequestDetail } from '../../types';
import { AddLeaveModal } from './AddLeaveModal';
import { filledIn, pickRange } from './leaveTestHelpers';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { userId: 'u-admin', employeeId: 'emp-self', permissions: null } }),
}));
vi.mock('../../api/employeeApi', () => ({
    employeeApi: { listEmployees: vi.fn(), getLeaveCalendar: vi.fn() },
}));
vi.mock('../../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/leaveRequestsApi')>()),
    leaveRequestsApi: {
        create: vi.fn(),
        preview: vi.fn(),
        document: vi.fn(),
        employeeSigningSession: vi.fn(),
        employeeSignature: vi.fn(),
        discard: vi.fn(),
        get: vi.fn(),
        decisionSession: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
    },
}));
vi.mock('@/modules/profile/api/profileApi', () => ({ profileApi: { getSignature: vi.fn() } }));
vi.mock('@/modules/public-signing/components/PdfPagesViewer', () => ({
    PdfPagesViewer: () => <div data-testid="pdf-viewer" />,
}));
vi.mock('@/common/components/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void; placeholder?: string }>(function FakePad({ onInkChange, placeholder }, ref) {
        useImperativeHandle(ref, () => ({
            clear: () => onInkChange?.(false),
            isEmpty: () => false,
            toDataUrl: () => 'data:image/png;base64,PODPIS',
            toPngBase64: () => (placeholder === 'Podpis pracownika' ? 'PODPIS-PRACOWNIKA' : 'PODPIS-ADMINA'),
        }));
        return <button type="button" onClick={() => onInkChange?.(true)}>atrapa: {placeholder}</button>;
    }),
}));

const api = vi.mocked(leaveRequestsApi);

const person = (id: string, fullName: string, hasAccount = true): EmployeeListItem => ({
    id, fullName, firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1], email: null, phone: null, hasAccount, role: null,
});

const request = (overrides: Partial<LeaveRequestDetail> = {}): LeaveRequestDetail => ({
    id: 'draft-1',
    number: 'WU/2026/0031',
    employeeId: 'emp-piotr',
    employeeName: 'Piotr Lis',
    leaveType: 'ANNUAL',
    onDemand: false,
    startDate: '2026-10-07',
    endDate: '2026-10-09',
    workingDays: 3,
    status: 'DRAFT',
    reason: null,
    origin: 'ON_BEHALF',
    createdByName: 'Jan Kowalski',
    createdAt: '2026-10-01T10:00:00+02:00',
    employeeSignedAt: null,
    decidedAt: null,
    decidedByName: null,
    decisionNote: null,
    cancelReason: null,
    employeeSignatureMethod: null,
    decisionSignatureMethod: null,
    overlappingAbsences: [],
    canDecide: true,
    decisionBlockedReason: null,
    canCancel: false,
    ...overrides,
});

const employeeSession = { documentSha256: 'e'.repeat(64), challenge: 'emp-1' };
const decisionSession = { documentSha256: 'f'.repeat(64), challenge: 'dec-1' };

const renderModal = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AddLeaveModal onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const dialog = () => screen.getByRole('dialog', { name: 'Dodaj urlop' });
const next = () => within(dialog()).getByRole('button', { name: /^Dalej/ });

/** Pracownik → Rodzaj → Termin → „Dalej" tworzy szkic → podpis pracownika. */
const goToEmployeeSignature = async () => {
    fireEvent.click(await within(dialog()).findByRole('radio', { name: /Piotr Lis/ }));
    fireEvent.click(next());
    fireEvent.click(within(dialog()).getByRole('radio', { name: /Wypoczynkowy/ }));
    fireEvent.click(next());
    await pickRange(dialog(), 7, 9);
    await within(dialog()).findByText('3 dni robocze');
    fireEvent.click(next());
    await within(dialog()).findByText('Przekaż urządzenie pracownikowi');
    await within(dialog()).findByTestId('pdf-viewer');
};

const signAsEmployee = async () => {
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: /Ja, Piotr Lis, znam treść wniosku/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'atrapa: Podpis pracownika' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: /Podpisuję wniosek/ }));
    await within(dialog()).findByRole('heading', { name: 'Twoja decyzja' });
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    vi.mocked(employeeApi.listEmployees).mockResolvedValue({
        items: [person('emp-self', 'Jan Kowalski'), person('emp-piotr', 'Piotr Lis', false), person('emp-anna', 'Anna Nowak')],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 3, itemsPerPage: 100 },
    });
    vi.mocked(employeeApi.getLeaveCalendar).mockResolvedValue([
        { date: '2026-10-08', count: 1, employees: [{ id: 'emp-anna', fullName: 'Anna Nowak' }] },
    ]);
    vi.mocked(profileApi.getSignature).mockResolvedValue({ hasSignature: false, url: null });
    api.preview.mockResolvedValue({ workingDays: 3, holidays: [] });
    api.create.mockResolvedValue({ request: request(), session: employeeSession });
    api.document.mockResolvedValue({ bytes: new ArrayBuffer(8), sha256: employeeSession.documentSha256 });
    api.employeeSignature.mockResolvedValue(request({ status: 'PENDING', employeeSignedAt: '2026-10-01T10:05:00+02:00', employeeSignatureMethod: 'IN_PERSON' }));
    api.discard.mockResolvedValue();
    api.decisionSession.mockResolvedValue(decisionSession);
    api.approve.mockResolvedValue(request({ status: 'APPROVED' }));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('AddLeaveModal', () => {
    it('lista pracowników bez siebie; osoba bez konta też jest do wyboru', async () => {
        renderModal();
        expect(await within(dialog()).findByRole('radio', { name: /Piotr Lis.*bez konta w systemie/ })).toBeTruthy();
        expect(within(dialog()).getByRole('radio', { name: /Anna Nowak/ })).toBeTruthy();
        expect(within(dialog()).queryByRole('radio', { name: /Jan Kowalski/ })).toBeNull();
    });

    it('szczęśliwa ścieżka: szkic ON_BEHALF, podpis pracownika, zatwierdzenie z podpisem administratora', async () => {
        const { onClose } = renderModal();
        await goToEmployeeSignature();

        expect(api.create).toHaveBeenCalledWith({
            employeeId: 'emp-piotr', leaveType: 'ANNUAL', onDemand: false, startDate: '2026-10-07', endDate: '2026-10-09',
        });
        expect(api.preview).toHaveBeenCalledWith('emp-piotr', '2026-10-07', '2026-10-09');
        expect(api.document).toHaveBeenCalledWith('draft-1');

        await signAsEmployee();
        expect(api.employeeSignature).toHaveBeenCalledWith('draft-1', {
            signatureImageBase64: 'PODPIS-PRACOWNIKA',
            documentSha256: employeeSession.documentSha256,
            challenge: 'emp-1',
            declarationAccepted: true,
        });

        // Zatwierdzenie jest domyślne - administrator dodaje urlop, a nie rozważa go od zera.
        expect((within(dialog()).getByRole('radio', { name: /^Zatwierdź/ }) as HTMLInputElement).checked).toBe(true);
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalledWith('draft-1'));
        fireEvent.click(await within(dialog()).findByRole('button', { name: 'atrapa: Twój podpis' }));
        const sign = within(dialog()).getByRole('button', { name: /Podpisz zatwierdzenie/ }) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        await waitFor(() => expect(api.approve).toHaveBeenCalledWith('draft-1', {
            signatureImageBase64: 'PODPIS-ADMINA',
            useSavedSignature: false,
            documentSha256: decisionSession.documentSha256,
            challenge: 'dec-1',
        }));
        expect(await screen.findByText('Urlop dodany')).toBeTruthy();
        expect(onClose).toHaveBeenCalled();
        expect(api.discard).not.toHaveBeenCalled();
    });

    it('w każdym kroku dokładnie jedno wypełnienie', async () => {
        renderModal();
        await within(dialog()).findByRole('radio', { name: /Piotr Lis/ });
        expect(filledIn(dialog())).toHaveLength(1);
        fireEvent.click(within(dialog()).getByRole('radio', { name: /Piotr Lis/ }));
        fireEvent.click(next());
        expect(filledIn(dialog())).toHaveLength(1);
        fireEvent.click(within(dialog()).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next());
        await pickRange(dialog(), 7, 9);
        await within(dialog()).findByText('3 dni robocze');
        // Kolega nieobecny w tym terminie: bursztynowa informacja, bez wypełnienia.
        expect(within(dialog()).getByText('W tych dniach nieobecni są też inni')).toBeTruthy();
        expect(filledIn(dialog())).toHaveLength(1);
        fireEvent.click(next());
        await within(dialog()).findByTestId('pdf-viewer');
        expect(filledIn(dialog())).toHaveLength(1);
        await signAsEmployee();
        expect(filledIn(dialog())).toHaveLength(1);
        expect(filledIn(dialog())[0].textContent).toMatch(/Podpisz zatwierdzenie/);
    });

    it('zamknięcie przed podpisem pracownika porzuca szkic', async () => {
        renderModal();
        await goToEmployeeSignature();
        fireEvent.click(within(dialog()).getByRole('button', { name: 'Zamknij' }));
        await waitFor(() => expect(api.discard).toHaveBeenCalledWith('draft-1'));
    });

    it('zamknięcie po podpisie pracownika pyta i zostawia wniosek w kolejce', async () => {
        const { onClose } = renderModal();
        await goToEmployeeSignature();
        await signAsEmployee();

        fireEvent.click(within(dialog()).getByRole('button', { name: 'Zamknij' }));
        expect(await screen.findByText('Zamknąć bez decyzji?')).toBeTruthy();
        expect(screen.getByText(/Zostanie w kolejce „Oczekujące"/)).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Zamknij, rozpatrzę później' }));
        expect(onClose).toHaveBeenCalled();
        cleanup();
        // Podpisany wniosek to nie szkic - nikt go nie porzuca.
        expect(api.discard).not.toHaveBeenCalled();
    });

    it('odmowa w ostatnim kroku wymaga uzasadnienia', async () => {
        api.reject.mockResolvedValue(request({ status: 'REJECTED' }));
        renderModal();
        await goToEmployeeSignature();
        await signAsEmployee();

        fireEvent.click(within(dialog()).getByRole('radio', { name: /^Odrzuć/ }));
        fireEvent.click(await within(dialog()).findByRole('button', { name: 'atrapa: Twój podpis' }));
        const sign = within(dialog()).getByRole('button', { name: /Podpisz odmowę/ }) as HTMLButtonElement;
        expect(sign.disabled).toBe(true);
        fireEvent.change(within(dialog()).getByLabelText('Uzasadnienie odmowy'), { target: { value: 'Brak obsady' } });
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);
        await waitFor(() => expect(api.reject).toHaveBeenCalledWith('draft-1', expect.objectContaining({ note: 'Brak obsady' })));
    });

    it('wniosek dla siebie: zdanie z serwera stoi w oknie', async () => {
        api.create.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Własny wniosek złóż w zakładce Urlop' } } });
        renderModal();
        fireEvent.click(await within(dialog()).findByRole('radio', { name: /Anna Nowak/ }));
        fireEvent.click(next());
        fireEvent.click(within(dialog()).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next());
        await pickRange(dialog(), 7, 9);
        fireEvent.click(next());
        expect(await within(dialog()).findByText('Własny wniosek złóż w zakładce Urlop')).toBeTruthy();
    });
});
