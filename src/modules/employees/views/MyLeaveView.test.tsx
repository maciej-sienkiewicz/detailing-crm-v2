// @vitest-environment jsdom
//
// „Urlop" pracownika: liczba jest nagłówkiem, jedyne wypełnienie to „Złóż wniosek",
// a okno wniosku idzie krok po kroku (Rodzaj, Termin, Sprawdź, Podpis) i w każdym
// kroku ma jedno wypełnienie. Termin wybiera się kalendarzem zakresu (dwa kliknięcia).
// Okno nie ma ścieżki z jednym podpisem - „Podpisz i wyślij wniosek" budzi się dopiero
// po podpisie i oświadczeniu. Wysyłka niesie skrót dokumentu, challenge i PNG bez
// prefiksu; 409 (dokument albo challenge się zmienił) odświeża dokument i czyści pad.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { myLeaveRequestsApi } from '../api/leaveRequestsApi';
import type { LeaveRequestDetail, LeaveRequestSummary } from '../types';
import { filledIn, pickRange } from '../components/leave/leaveTestHelpers';
import { MyLeaveView } from './MyLeaveView';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { userId: 'u1', employeeId: 'emp-self', permissions: [] } }),
}));

vi.mock('../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/leaveRequestsApi')>()),
    myLeaveRequestsApi: {
        list: vi.fn(),
        preview: vi.fn(),
        create: vi.fn(),
        signingSession: vi.fn(),
        document: vi.fn(),
        submit: vi.fn(),
        withdraw: vi.fn(),
        file: vi.fn(),
    },
}));

// pdf.js i kanwa nie działają w jsdom - podgląd i podpis podmieniamy na atrapy.
vi.mock('@/modules/public-signing/components/PdfPagesViewer', () => ({
    PdfPagesViewer: () => <div data-testid="pdf-viewer" />,
}));
const pad = vi.hoisted(() => ({ clear: vi.fn() }));
vi.mock('@/common/components/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void }>(function FakePad({ onInkChange }, ref) {
        useImperativeHandle(ref, () => ({
            clear: () => { pad.clear(); onInkChange?.(false); },
            isEmpty: () => false,
            toDataUrl: () => 'data:image/png;base64,PODPIS',
            toPngBase64: () => 'PODPIS',
        }));
        return <button type="button" onClick={() => onInkChange?.(true)}>atrapa: złóż podpis</button>;
    }),
}));

const api = vi.mocked(myLeaveRequestsApi);

const summary = (overrides: Partial<LeaveRequestSummary>): LeaveRequestSummary => ({
    id: 'r1',
    number: 'WU/2026/0012',
    employeeId: 'emp-self',
    employeeName: 'Anna Nowak',
    leaveType: 'ANNUAL',
    onDemand: false,
    startDate: '2026-11-03',
    endDate: '2026-11-07',
    workingDays: 5,
    status: 'PENDING',
    reason: null,
    origin: 'SELF_SERVICE',
    createdByName: 'Anna Nowak',
    createdAt: '2026-09-29T18:42:00+02:00',
    employeeSignedAt: '2026-09-29T18:42:00+02:00',
    decidedAt: null,
    decidedByName: null,
    decisionNote: null,
    cancelReason: null,
    ...overrides,
});

const detailOf = (s: LeaveRequestSummary): LeaveRequestDetail => ({
    ...s,
    employeeSignatureMethod: null,
    decisionSignatureMethod: null,
    overlappingAbsences: [],
    canDecide: false,
    decisionBlockedReason: null,
    canCancel: false,
});

const renderView = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <MyLeaveView />
                    </ToastProvider>
                </ThemeProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

// Dzień „dziś" jest stały: kalendarz otwiera się na październiku 2026, a 7 i 9 są w nim
// jednoznaczne (wrzesień i listopad z siatki to 28-30 i 1).
const start = '2026-10-07';
const end = '2026-10-09';
const draftSession = { documentSha256: 'a'.repeat(64), challenge: 'challenge-1' };

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    api.list.mockResolvedValue({
        requests: [
            summary({}),
            summary({ id: 'r2', status: 'REJECTED', decisionNote: 'Szczyt sezonu', startDate: '2026-04-21', endDate: '2026-04-25' }),
        ],
        summary: { year: 2026, usedWorkingDays: 9, pendingCount: 1 },
    });
    api.preview.mockResolvedValue({ workingDays: 3, holidays: [] });
    api.create.mockResolvedValue({
        request: detailOf(summary({ id: 'draft-1', status: 'DRAFT', startDate: start, endDate: end, workingDays: 3 })),
        session: draftSession,
    });
    api.document.mockResolvedValue({ bytes: new ArrayBuffer(8), sha256: draftSession.documentSha256 });
    api.submit.mockResolvedValue(detailOf(summary({ id: 'draft-1' })));
    api.withdraw.mockResolvedValue(detailOf(summary({ status: 'WITHDRAWN' })));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

const openWizard = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /Złóż wniosek o urlop/ }));
    return screen.findByRole('dialog', { name: 'Wniosek o urlop' });
};

const next = (modal: HTMLElement) => within(modal).getByRole('button', { name: /^Dalej/ });

/** Rodzaj → Termin (kalendarz) → „Dalej" tworzy szkic → Sprawdź. */
const openWizardToReview = async () => {
    const modal = await openWizard();
    fireEvent.click(within(modal).getByRole('radio', { name: /Wypoczynkowy/ }));
    fireEvent.click(next(modal));
    await pickRange(modal, 7, 9);
    expect(await within(modal).findByText('3 dni robocze')).toBeTruthy();
    fireEvent.click(next(modal));
    await within(modal).findByTestId('pdf-viewer');
    return modal;
};

const openWizardToSigning = async () => {
    const modal = await openWizardToReview();
    fireEvent.click(within(modal).getByRole('button', { name: /Wszystko się zgadza/ }));
    await within(modal).findByRole('checkbox', { name: /Znam treść wniosku/ });
    return modal;
};

const submitButton = (modal: HTMLElement) =>
    within(modal).getByRole('button', { name: /Podpisz i wyślij wniosek/ }) as HTMLButtonElement;

describe('MyLeaveView - lista i nagłówek', () => {
    it('liczba jest nagłówkiem, pod nią oczekujące; odrzucony wniosek pokazuje uzasadnienie', async () => {
        renderView();
        expect(await screen.findByText('9')).toBeTruthy();
        expect(screen.getByText(/dni wykorzystanych w 2026/)).toBeTruthy();
        expect(screen.getByText('1 wniosek czeka na decyzję')).toBeTruthy();
        expect(screen.getByText('Oczekuje')).toBeTruthy();
        expect(screen.getByText('Odrzucony')).toBeTruthy();
        expect(screen.getByText(/Uzasadnienie odmowy: Szczyt sezonu/)).toBeTruthy();
    });

    it('na ekranie jest dokładnie jedno wypełnienie - „Złóż wniosek o urlop"', async () => {
        renderView();
        await screen.findByText('9');
        const filled = filledIn(document.body);
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Złóż wniosek o urlop/);
    });

    it('„Wycofaj" pyta, a po potwierdzeniu wycofuje oczekujący wniosek', async () => {
        renderView();
        fireEvent.click(await screen.findByRole('button', { name: 'Wycofaj' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Wycofaj wniosek' }));
        await waitFor(() => expect(api.withdraw).toHaveBeenCalledWith('r1'));
    });

    it('konto bez rekordu pracownika dostaje wyjaśnienie zamiast listy', async () => {
        api.list.mockRejectedValue({ response: { status: 404, data: { message: 'Twoje konto nie jest powiązane z pracownikiem' } } });
        renderView();
        expect(await screen.findByText('Twoje konto nie jest powiązane z pracownikiem. Poproś właściciela o połączenie.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Złóż wniosek o urlop/ })).toBeNull();
    });
});

describe('Okno wniosku - kroki', () => {
    it('każdy krok ma dokładnie jedno wypełnienie - krok następny w stopce', async () => {
        renderView();
        const modal = await openWizard();
        expect(filledIn(modal)).toHaveLength(1);
        expect(within(modal).getByRole('list', { name: 'Kroki wniosku' })).toBeTruthy();

        fireEvent.click(within(modal).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next(modal));
        expect(filledIn(modal)).toHaveLength(1);

        await pickRange(modal, 7, 9);
        await within(modal).findByText('3 dni robocze');
        expect(filledIn(modal)).toHaveLength(1);

        fireEvent.click(next(modal));
        await within(modal).findByTestId('pdf-viewer');
        expect(filledIn(modal)).toHaveLength(1);

        fireEvent.click(within(modal).getByRole('button', { name: /Wszystko się zgadza/ }));
        await within(modal).findByRole('checkbox', { name: /Znam treść wniosku/ });
        const filled = filledIn(modal);
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Podpisz i wyślij wniosek/);
    });

    it('termin z kalendarza zakresu: dwa kliknięcia ustawiają oba końce, licznik pyta o dni robocze', async () => {
        renderView();
        const modal = await openWizard();
        fireEvent.click(within(modal).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next(modal));
        await pickRange(modal, 7, 9);

        expect(within(modal).getByRole('button', { name: 'Od 07.10.2026' })).toBeTruthy();
        expect(within(modal).getByRole('button', { name: 'Do 09.10.2026' })).toBeTruthy();
        await waitFor(() => expect(api.preview).toHaveBeenCalledWith(start, end));
    });

    it('przy wyborze terminu nie ma osoby zastępującej', async () => {
        renderView();
        const modal = await openWizard();
        fireEvent.click(within(modal).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next(modal));
        await pickRange(modal, 7, 9);
        await within(modal).findByText('3 dni robocze');
        expect(within(modal).queryByText(/zastęp/i)).toBeNull();
        expect(within(modal).queryByRole('combobox')).toBeNull();
    });

    it('„Sprawdź" mówi zwykłymi słowami, o co wniosek prosi, i pokazuje PDF', async () => {
        renderView();
        const modal = await openWizardToReview();
        expect(within(modal).getByText('Prosisz o urlop wypoczynkowy')).toBeTruthy();
        expect(within(modal).getByText('od środy 7 października do piątku 9 października 2026')).toBeTruthy();
    });
});

describe('Okno wniosku - podpis', () => {
    it('„Dalej" z terminu tworzy szkic z wybranymi danymi', async () => {
        renderView();
        await openWizardToReview();
        expect(api.create).toHaveBeenCalledWith({ leaveType: 'ANNUAL', onDemand: false, startDate: start, endDate: end });
        expect(api.document).toHaveBeenCalledWith('draft-1');
    });

    it('bez podpisu albo bez oświadczenia nie da się wysłać', async () => {
        renderView();
        const modal = await openWizardToSigning();
        expect(submitButton(modal).disabled).toBe(true);

        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku i podpisuję go/ }));
        expect(submitButton(modal).disabled).toBe(true);

        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(modal).getByRole('button', { name: 'atrapa: złóż podpis' }));
        expect(submitButton(modal).disabled).toBe(true);

        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        expect(submitButton(modal).disabled).toBe(false);
    });

    it('wysyłka niesie skrót dokumentu, challenge i PNG bez prefiksu; potem dymek i zamknięcie', async () => {
        renderView();
        const modal = await openWizardToSigning();
        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(modal).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(submitButton(modal));

        await waitFor(() => expect(api.submit).toHaveBeenCalledWith('draft-1', {
            signatureImageBase64: 'PODPIS',
            documentSha256: draftSession.documentSha256,
            challenge: 'challenge-1',
            declarationAccepted: true,
        }));
        expect(await screen.findByText('Wniosek wysłany')).toBeTruthy();
        expect(screen.getByText('Czeka na akceptację. Dostaniesz powiadomienie.')).toBeTruthy();
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Wniosek o urlop' })).toBeNull());
        // Wysłany wniosek nie jest szkicem do sprzątnięcia.
        expect(api.withdraw).not.toHaveBeenCalled();
    });

    it('409: nowa sesja, odświeżony dokument do obejrzenia, czysty pad i komunikat', async () => {
        api.submit.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.' } } });
        api.signingSession.mockResolvedValue({ documentSha256: 'b'.repeat(64), challenge: 'challenge-2' });
        renderView();
        const modal = await openWizardToSigning();
        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(modal).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(submitButton(modal));

        expect(await within(modal).findByText('Dokument został odświeżony. Sprawdź go i podpisz ponownie.')).toBeTruthy();
        expect(api.signingSession).toHaveBeenCalledWith('draft-1');
        expect(pad.clear).toHaveBeenCalled();
        // Nowe bajty trzeba obejrzeć: okno wraca do „Sprawdź" z nowym dokumentem.
        await waitFor(() => expect(api.document).toHaveBeenCalledTimes(2));
        fireEvent.click(within(modal).getByRole('button', { name: /Wszystko się zgadza/ }));

        // Oświadczenie trzeba potwierdzić jeszcze raz - dokument jest nowy.
        expect((within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }) as HTMLInputElement).checked).toBe(false);
        expect(submitButton(modal).disabled).toBe(true);

        // Drugie podejście idzie z nowym challenge.
        fireEvent.click(within(modal).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(modal).getByRole('button', { name: 'atrapa: złóż podpis' }));
        await waitFor(() => expect(submitButton(modal).disabled).toBe(false));
        fireEvent.click(submitButton(modal));
        await waitFor(() => expect(api.submit).toHaveBeenLastCalledWith('draft-1', expect.objectContaining({
            documentSha256: 'b'.repeat(64),
            challenge: 'challenge-2',
        })));
    });

    it('błąd walidacji z polem trafia do pola, a nie do dymka', async () => {
        api.create.mockRejectedValueOnce({
            response: { status: 400, data: { message: 'Ten termin nakłada się z Twoim wnioskiem', field: 'startDate' } },
        });
        renderView();
        const modal = await openWizard();
        fireEvent.click(within(modal).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(next(modal));
        await pickRange(modal, 7, 9);
        fireEvent.click(next(modal));

        expect(await within(modal).findByText('Ten termin nakłada się z Twoim wnioskiem')).toBeTruthy();
        expect(within(modal).getByRole('button', { name: /^Od\b/ }).getAttribute('aria-invalid')).toBe('true');
    });

    it('okolicznościowy wymaga powodu, zanim powstanie szkic', async () => {
        renderView();
        const modal = await openWizard();
        fireEvent.click(within(modal).getByRole('radio', { name: /Okolicznościowy/ }));
        fireEvent.click(next(modal));
        await pickRange(modal, 7, 9);
        fireEvent.click(next(modal));

        expect(await within(modal).findByText('Przy urlopie okolicznościowym podaj powód.')).toBeTruthy();
        expect(api.create).not.toHaveBeenCalled();
        expect((within(modal).getByLabelText('Powód') as HTMLTextAreaElement).maxLength).toBe(250);
    });

    it('zamknięcie okna bez wysłania wycofuje szkic', async () => {
        renderView();
        const modal = await openWizardToSigning();
        fireEvent.click(within(modal).getByRole('button', { name: 'Zamknij' }));
        await waitFor(() => expect(api.withdraw).toHaveBeenCalledWith('draft-1'));
    });
});
