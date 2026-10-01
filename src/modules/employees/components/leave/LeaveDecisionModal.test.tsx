// @vitest-environment jsdom
//
// Okno decyzji krok po kroku (Wniosek, Decyzja, Podpis): w każdym kroku dokładnie jedno
// wypełnienie; nie ma osoby zastępującej ani „podstawy uprawnienia"; odmowa bez
// uzasadnienia nie przejdzie do podpisu; własny wniosek (albo odebrane uprawnienie)
// pokazuje powód zamiast kroków; 409 - ktoś rozpatrzył pierwszy - kończy się dymkiem
// i odświeżeniem, a nie drugą decyzją.
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
import { LeaveDecisionModal } from './LeaveDecisionModal';
import { filledIn } from './leaveTestHelpers';

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
    origin: 'SELF_SERVICE',
    createdByName: 'Anna Nowak',
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
                    <LeaveDecisionModal requestId="r1" onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

const dialog = () => screen.getByRole('dialog', { name: 'Anna Nowak' });
const button = (name: RegExp | string) => within(dialog()).getByRole('button', { name });

/** Wniosek → Decyzja (wybór) → Podpis; zwraca przycisk podpisu. */
const goToSigning = async (choice: 'Zatwierdź' | 'Odrzuć', note?: string) => {
    fireEvent.click(await screen.findByRole('button', { name: /Przejdź do decyzji/ }));
    fireEvent.click(within(dialog()).getByRole('radio', { name: new RegExp(`^${choice}`) }));
    if (note) {
        fireEvent.change(within(dialog()).getByLabelText(choice === 'Odrzuć' ? 'Uzasadnienie odmowy' : 'Notatka (opcjonalnie)'), { target: { value: note } });
    }
    fireEvent.click(button(/^Dalej/));
    await waitFor(() => expect(api.decisionSession).toHaveBeenCalledWith('r1'));
};

beforeEach(() => {
    api.get.mockResolvedValue(detail());
    api.decisionSession.mockResolvedValue(session);
    vi.mocked(profileApi.getSignature).mockResolvedValue({ hasSignature: false, url: null });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LeaveDecisionModal - wniosek', () => {
    it('liczba dni jest nagłówkiem, obsada pokazuje oczekujące osobno, a kolizję liczy w osobach', async () => {
        renderModal();
        expect(await screen.findByRole('heading', { name: '5 dni roboczych' })).toBeTruthy();
        expect(screen.getByText('kolizja: 2 os.')).toBeTruthy();
        expect(screen.getByText('Piotr Lis')).toBeTruthy();
        expect(screen.getByText('wniosek oczekuje')).toBeTruthy();
        expect(screen.getByText('wyjazd rodzinny')).toBeTruthy();
        expect(within(dialog()).getByRole('list', { name: 'Kroki decyzji' })).toBeTruthy();
    });

    it('nie ma osoby zastępującej ani podstawy uprawnienia - także po decyzji', async () => {
        api.get.mockResolvedValue(detail({
            status: 'APPROVED', canDecide: false, decidedByName: 'Jan Kowalski', decidedAt: '2026-09-30T08:00:00+02:00',
            decisionSignatureMethod: 'DEVICE_DRAWN',
        }));
        renderModal();
        await screen.findByRole('heading', { name: '5 dni roboczych' });
        expect(within(dialog()).queryByText(/zastęp/i)).toBeNull();
        expect(within(dialog()).queryByText(/Podstawa/i)).toBeNull();
        expect(within(dialog()).queryByText(/Właściciel studia|rola:/)).toBeNull();
        expect(screen.getByText(/Jan Kowalski/)).toBeTruthy();
    });

    it('wniosek dodany przez administratora mówi, kto go wprowadził i że podpis był osobisty', async () => {
        api.get.mockResolvedValue(detail({ origin: 'ON_BEHALF', createdByName: 'Jan Kowalski', employeeSignatureMethod: 'IN_PERSON' }));
        renderModal();
        expect(await screen.findByText(/osobiście na urządzeniu studia/)).toBeTruthy();
        expect(screen.getByText('Jan Kowalski')).toBeTruthy();
    });
});

describe('LeaveDecisionModal - kroki decyzji', () => {
    it('w każdym kroku dokładnie jedno wypełnienie; Zatwierdź i Odrzuć to karty wyboru, nie przyciski', async () => {
        renderModal();
        await screen.findByRole('heading', { name: '5 dni roboczych' });
        expect(filledIn(dialog())).toHaveLength(1);
        expect(filledIn(dialog())[0].textContent).toMatch(/Przejdź do decyzji/);

        fireEvent.click(button(/Przejdź do decyzji/));
        expect(within(dialog()).getByRole('radio', { name: /^Zatwierdź/ })).toBeTruthy();
        expect(within(dialog()).getByRole('radio', { name: /^Odrzuć/ })).toBeTruthy();
        expect(filledIn(dialog())).toHaveLength(1);
        expect((button(/^Dalej/) as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(within(dialog()).getByRole('radio', { name: /^Zatwierdź/ }));
        fireEvent.click(button(/^Dalej/));
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalled());
        const filled = filledIn(dialog());
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Podpisz zatwierdzenie/);
    });

    it('odmowa bez uzasadnienia nie przejdzie do podpisu; z uzasadnieniem - podpisana odmowa', async () => {
        api.reject.mockResolvedValue(detail({ status: 'REJECTED' }));
        const { onClose } = renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Przejdź do decyzji/ }));
        fireEvent.click(within(dialog()).getByRole('radio', { name: /^Odrzuć/ }));
        fireEvent.click(button(/^Dalej/));
        expect(await within(dialog()).findByText('Przy odmowie podaj uzasadnienie - trafi na dokument.')).toBeTruthy();
        expect(api.decisionSession).not.toHaveBeenCalled();

        fireEvent.change(within(dialog()).getByLabelText('Uzasadnienie odmowy'), { target: { value: 'Szczyt sezonu' } });
        fireEvent.click(button(/^Dalej/));
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalledWith('r1'));

        const sign = button(/Podpisz odmowę/) as HTMLButtonElement;
        await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'atrapa: złóż podpis' })).toBeTruthy());
        expect(sign.disabled).toBe(true);
        fireEvent.click(within(dialog()).getByRole('button', { name: 'atrapa: złóż podpis' }));
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        await waitFor(() => expect(api.reject).toHaveBeenCalledWith('r1', {
            signatureImageBase64: 'PODPIS',
            useSavedSignature: false,
            documentSha256: session.documentSha256,
            challenge: 'dec-1',
            note: 'Szczyt sezonu',
        }));
        expect(await screen.findByText('Wniosek odrzucony')).toBeTruthy();
        expect(onClose).toHaveBeenCalled();
    });

    it('zatwierdzenie zapisanym podpisem nie wysyła obrazu', async () => {
        vi.mocked(profileApi.getSignature).mockResolvedValue({ hasSignature: true, url: 'https://x/sig.png' });
        api.approve.mockResolvedValue(detail({ status: 'APPROVED' }));
        renderModal();
        await goToSigning('Zatwierdź');
        fireEvent.click(await within(dialog()).findByRole('checkbox', { name: 'Użyj mojego zapisanego podpisu' }));
        const sign = button(/Podpisz zatwierdzenie/) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r1', {
            useSavedSignature: true,
            documentSha256: session.documentSha256,
            challenge: 'dec-1',
        }));
        expect(await screen.findByText('Wniosek zatwierdzony')).toBeTruthy();
    });

    it('bez prawa do decyzji: powód zamiast kroków', async () => {
        api.get.mockResolvedValue(detail({
            canDecide: false,
            decisionBlockedReason: 'Własnego wniosku urlopowego nie można rozpatrzyć',
        }));
        renderModal();
        expect(await screen.findByText('Własnego wniosku urlopowego nie można rozpatrzyć')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Przejdź do decyzji/ })).toBeNull();
        expect(screen.queryByRole('list', { name: 'Kroki decyzji' })).toBeNull();
        expect(filledIn(dialog())).toHaveLength(0);
    });

    it('409 - ktoś rozpatrzył pierwszy: dymek, odświeżenie, koniec kroków', async () => {
        api.approve.mockRejectedValue({
            response: { status: 409, data: { message: 'Wniosek został już rozpatrzony (Jan Kowalski)' } },
        });
        renderModal();
        await goToSigning('Zatwierdź');
        fireEvent.click(await within(dialog()).findByRole('button', { name: 'atrapa: złóż podpis' }));

        api.get.mockResolvedValue(detail({ status: 'APPROVED', canDecide: false, decidedByName: 'Jan Kowalski', decidedAt: '2026-09-30T08:00:00+02:00' }));
        const sign = button(/Podpisz zatwierdzenie/) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        expect(await screen.findByText('Wniosek został już rozpatrzony')).toBeTruthy();
        expect(screen.getByText('Wniosek został już rozpatrzony (Jan Kowalski)')).toBeTruthy();
        await waitFor(() => expect(within(dialog()).getAllByText('Zatwierdzony').length).toBeGreaterThan(0));
        expect(screen.queryByRole('button', { name: /Podpisz zatwierdzenie/ })).toBeNull();
        expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('409 przy wciąż oczekującym wniosku: nowa sesja i komunikat, decyzja zostaje', async () => {
        api.approve.mockRejectedValueOnce({
            response: { status: 409, data: { message: 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.' } },
        });
        api.decisionSession.mockResolvedValueOnce(session).mockResolvedValueOnce({ documentSha256: 'd'.repeat(64), challenge: 'dec-2' });
        renderModal();
        await goToSigning('Zatwierdź');
        fireEvent.click(await within(dialog()).findByRole('button', { name: 'atrapa: złóż podpis' }));
        const sign = button(/Podpisz zatwierdzenie/) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        expect(await within(dialog()).findByText('Dokument został odświeżony. Sprawdź go i podpisz ponownie.')).toBeTruthy();
        await waitFor(() => expect(api.decisionSession).toHaveBeenCalledTimes(2));
        await waitFor(() => expect((button(/Podpisz zatwierdzenie/) as HTMLButtonElement).disabled).toBe(true));
    });

    it('403 w chwili decyzji: kroki znikają, zostaje wyjaśnienie', async () => {
        api.approve.mockRejectedValue({ response: { status: 403, data: { message: 'Brak uprawnienia: Akceptacja wniosków urlopowych' } } });
        renderModal();
        await goToSigning('Zatwierdź');
        fireEvent.click(await within(dialog()).findByRole('button', { name: 'atrapa: złóż podpis' }));
        const sign = button(/Podpisz zatwierdzenie/) as HTMLButtonElement;
        await waitFor(() => expect(sign.disabled).toBe(false));
        fireEvent.click(sign);

        expect(await screen.findByText('Brak uprawnienia: Akceptacja wniosków urlopowych')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Przejdź do decyzji/ })).toBeNull();
    });

    it('zatwierdzony urlop przed startem można odwołać, a PDF pobrać', async () => {
        api.get.mockResolvedValue(detail({
            status: 'APPROVED', canDecide: false, canCancel: true, decidedByName: 'Jan Kowalski', decidedAt: '2026-09-30T08:00:00+02:00',
        }));
        renderModal();
        expect(await screen.findByRole('button', { name: /Pobierz PDF/ })).toBeTruthy();
        expect(button('Odwołaj urlop').getAttribute('data-variant')).toBe('tintedDanger');
        fireEvent.click(button('Odwołaj urlop'));
        expect(await screen.findByText('Odwołać urlop?')).toBeTruthy();
    });
});
