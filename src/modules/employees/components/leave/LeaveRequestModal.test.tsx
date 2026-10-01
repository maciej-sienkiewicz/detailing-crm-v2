// @vitest-environment jsdom
//
// Okno decyzji: w kroku „Wniosek" dokładnie jedno wypełnienie („Zatwierdź i podpisz"),
// „Odrzuć" ma odcień bez wypełnienia; podpis decyzji to osobny krok; odmowa bez
// uzasadnienia się nie podpisze; własny wniosek (albo odebrane uprawnienie) pokazuje
// powód zamiast przycisków; 409 - ktoś rozpatrzył pierwszy - kończy się dymkiem
// i odświeżeniem, a nie drugą decyzją. Zastępcy ani podstawy uprawnienia nie ma.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { profileApi } from '@/modules/profile/api/profileApi';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import type { LeaveRequestDetail } from '../../types';
import { LeaveRequestModal } from './LeaveRequestModal';

vi.mock('../../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/leaveRequestsApi')>()),
    leaveRequestsApi: {
        get: vi.fn(),
        decisionSession: vi.fn(),
        document: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
        cancel: vi.fn(),
        file: vi.fn(),
    },
}));
vi.mock('@/modules/profile/api/profileApi', () => ({
    profileApi: { getSignature: vi.fn() },
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
            toPngBase64: () => 'PODPIS',
        }));
        return <button type="button" onClick={() => onInkChange?.(true)}>atrapa: złóż podpis</button>;
    }),
}));

const api = vi.mocked(leaveRequestsApi);

const detail = (overrides: Partial<LeaveRequestDetail> = {}): LeaveRequestDetail => ({
    id: 'r1',
    number: 'WU/2026/0012',
    employeeId: 'emp-anna',
    employeeName: 'Anna Nowak',
    leaveType: 'ANNUAL',
    onDemand: false,
    startDate: '2026-11-03',
    endDate: '2026-11-07',
    workingDays: 5,
    status: 'PENDING',
    reason: 'wyjazd rodzinny',
    createdAt: '2026-09-29T18:42:00+02:00',
    employeeSignedAt: '2026-09-29T18:42:00+02:00',
    decidedAt: null,
    decidedByName: null,
    decisionNote: null,
    cancelReason: null,
    employeeSignatureMethod: 'DEVICE_DRAWN',
    decisionSignatureMethod: null,
    overlappingAbsences: [
        { employeeId: 'emp-piotr', employeeName: 'Piotr Lis', startDate: '2026-11-04', endDate: '2026-11-05', kind: 'LEAVE' },
        { employeeId: 'emp-marek', employeeName: 'Marek Wójcik', startDate: '2026-11-06', endDate: '2026-11-06', kind: 'PENDING_REQUEST' },
    ],
    canDecide: true,
    decisionBlockedReason: null,
    canCancel: false,
    ...overrides,
});

const session = { documentSha256: 'c'.repeat(64), challenge: 'dec-1' };

const renderModal = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <LeaveRequestModal requestId="r1" onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const dialog = () => screen.getByRole('dialog', { name: 'Anna Nowak' });
const filledIn = (root: HTMLElement) =>
    root.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

beforeEach(() => {
    api.get.mockResolvedValue(detail());
    api.decisionSession.mockResolvedValue(session);
    vi.mocked(profileApi.getSignature).mockResolvedValue({ hasSignature: false, url: null });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LeaveRequestModal - treść', () => {
    it('liczba dni jest nagłówkiem, obsada pokazuje oczekujące osobno, a kolizję liczy w osobach', async () => {
        renderModal();
        expect(await screen.findByRole('heading', { name: '5 dni roboczych' })).toBeTruthy();
        expect(screen.getByText('kolizja: 2 os.')).toBeTruthy();
        expect(screen.getByText('Piotr Lis')).toBeTruthy();
        expect(screen.getByText('wniosek oczekuje')).toBeTruthy();
        expect(screen.getByText('wyjazd rodzinny')).toBeTruthy();
        // Zastępstw ani podstawy uprawnienia nie prowadzimy.
        expect(screen.queryByText(/zastęp/i)).toBeNull();
        expect(screen.queryByText(/Podstawa/)).toBeNull();
    });

    it('decyzja to osobny krok: po „Zatwierdź i podpisz" znikają szczegóły, jest pasek kroków i powrót', async () => {
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź i podpisz/ }));
        expect(await screen.findByRole('heading', { name: 'Zatwierdzenie wniosku' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Obsada w tych dniach' })).toBeNull();
        expect(within(dialog()).getByRole('list', { name: 'Kroki decyzji' })).toBeTruthy();

        fireEvent.click(within(dialog()).getByRole('button', { name: 'Wstecz' }));
        expect(await screen.findByRole('heading', { name: 'Obsada w tych dniach' })).toBeTruthy();
    });
});

describe('LeaveRequestModal - decyzja', () => {
    it('w całym oknie jedno wypełnienie: „Zatwierdź i podpisz"; „Odrzuć" ma odcień, bez wypełnienia', async () => {
        renderModal();
        await screen.findByRole('heading', { name: '5 dni roboczych' });
        const filled = filledIn(dialog());
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Zatwierdź i podpisz/);
        expect(within(dialog()).getByRole('button', { name: /Odrzuć/ }).getAttribute('data-variant')).toBe('tintedDanger');
    });

    it('odmowa bez uzasadnienia się nie podpisze', async () => {
        api.reject.mockResolvedValue(detail({ status: 'REJECTED' }));
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Odrzuć/ }));
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalledWith('r1'));
        fireEvent.click(within(dialog()).getByRole('button', { name: 'atrapa: złóż podpis' }));

        const sign = within(dialog()).getByRole('button', { name: 'Podpisz odmowę' }) as HTMLButtonElement;
        expect(sign.disabled).toBe(true);

        fireEvent.change(within(dialog()).getByLabelText('Uzasadnienie odmowy'), { target: { value: 'Szczyt sezonu' } });
        expect(sign.disabled).toBe(false);
        fireEvent.click(sign);

        await waitFor(() => expect(api.reject).toHaveBeenCalledWith('r1', {
            signatureImageBase64: 'PODPIS',
            useSavedSignature: false,
            documentSha256: session.documentSha256,
            challenge: 'dec-1',
            note: 'Szczyt sezonu',
        }));
        expect(await screen.findByText('Wniosek odrzucony')).toBeTruthy();
    });

    it('zatwierdzenie zapisanym podpisem nie wysyła obrazu', async () => {
        vi.mocked(profileApi.getSignature).mockResolvedValue({ hasSignature: true, url: 'https://x/sig.png' });
        api.approve.mockResolvedValue(detail({ status: 'APPROVED' }));
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź i podpisz/ }));
        fireEvent.click(await within(dialog()).findByRole('checkbox', { name: 'Użyj mojego zapisanego podpisu' }));
        const sign = within(dialog()).getByRole('button', { name: 'Podpisz zatwierdzenie' }) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r1', {
            useSavedSignature: true,
            documentSha256: session.documentSha256,
            challenge: 'dec-1',
        }));
    });

    it('bez prawa do decyzji: powód zamiast przycisków', async () => {
        api.get.mockResolvedValue(detail({
            canDecide: false,
            decisionBlockedReason: 'Własnego wniosku urlopowego nie można rozpatrzyć',
        }));
        renderModal();
        expect(await screen.findByText('Własnego wniosku urlopowego nie można rozpatrzyć')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Zatwierdź i podpisz/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Odrzuć/ })).toBeNull();
    });

    it('409 - ktoś rozpatrzył pierwszy: dymek, odświeżenie, koniec edytora', async () => {
        api.approve.mockRejectedValue({
            response: { status: 409, data: { message: 'Wniosek został już rozpatrzony (Jan Kowalski)' } },
        });
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź i podpisz/ }));
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalled());
        fireEvent.click(within(dialog()).getByRole('button', { name: 'atrapa: złóż podpis' }));

        api.get.mockResolvedValue(detail({ status: 'APPROVED', canDecide: false, decidedByName: 'Jan Kowalski', decidedAt: '2026-09-30T08:00:00+02:00' }));
        fireEvent.click(within(dialog()).getByRole('button', { name: 'Podpisz zatwierdzenie' }));

        expect(await screen.findByText('Wniosek został już rozpatrzony')).toBeTruthy();
        expect(screen.getByText('Wniosek został już rozpatrzony (Jan Kowalski)')).toBeTruthy();
        await waitFor(() => expect(within(dialog()).getAllByText('Zatwierdzony').length).toBeGreaterThan(0));
        expect(screen.queryByRole('button', { name: 'Podpisz zatwierdzenie' })).toBeNull();
        expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('403 w chwili decyzji: stopka znika, zostaje wyjaśnienie', async () => {
        api.approve.mockRejectedValue({ response: { status: 403, data: { message: 'Brak uprawnienia: Akceptacja wniosków urlopowych' } } });
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź i podpisz/ }));
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalled());
        fireEvent.click(within(dialog()).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(within(dialog()).getByRole('button', { name: 'Podpisz zatwierdzenie' }));

        expect(await screen.findByText('Brak uprawnienia: Akceptacja wniosków urlopowych')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Zatwierdź i podpisz/ })).toBeNull();
    });
});
