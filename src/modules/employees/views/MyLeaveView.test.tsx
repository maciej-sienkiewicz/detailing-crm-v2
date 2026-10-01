// @vitest-environment jsdom
//
// „Urlop" pracownika: liczba jest nagłówkiem, jedyne wypełnienie to „Złóż wniosek",
// a kreator nie ma ścieżki z jednym podpisem - „Podpisz i wyślij wniosek" budzi się
// dopiero po podpisie i oświadczeniu. Wysyłka niesie skrót dokumentu, challenge i PNG
// bez prefiksu; 409 (dokument albo challenge się zmienił) odświeża dokument i czyści pad.
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
import { addDaysIso, todayIso } from '../utils/leaveRequestFormat';
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

/**
 * Termin w połowie miesiąca (14.-22.): siatka kalendarza pokazuje też końcówkę
 * poprzedniego miesiąca (dni 23+) i początek następnego (1-13), więc dzień z tego
 * przedziału jest w niej jednoznaczny.
 */
const firstMidMonthDay = (from: string): string => {
    let iso = from;
    while (Number(iso.slice(8, 10)) < 14 || Number(iso.slice(8, 10)) > 20) iso = addDaysIso(iso, 1);
    return iso;
};
const start = firstMidMonthDay(addDaysIso(todayIso(), 2));
const end = addDaysIso(start, 2);

const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

/** Wybór terminu tak jak użytkownik: kalendarz z rezerwacji, klik w początek, klik w koniec, „Gotowe". */
const pickRange = async (dialog: HTMLElement, from: string, to: string) => {
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Wybierz dzień' })[0]);
    const picker = await screen.findByRole('dialog', { name: 'Wybór zakresu dat' });
    const pickDay = (iso: string) => {
        const label = `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
        for (let i = 0; i < 24 && !within(picker).queryByText(label); i++) {
            fireEvent.click(within(picker).getByRole('button', { name: 'Następny miesiąc' }));
        }
        fireEvent.click(within(picker).getByRole('button', { name: String(Number(iso.slice(8, 10))) }));
    };
    pickDay(from);
    pickDay(to);
    fireEvent.click(within(picker).getByRole('button', { name: 'Gotowe' }));
};
const draftSession = { documentSha256: 'a'.repeat(64), challenge: 'challenge-1' };

beforeEach(() => {
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
});

const openWizardToSigning = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /Złóż wniosek o urlop/ }));
    const drawer = await screen.findByRole('dialog', { name: 'Wniosek o urlop' });
    fireEvent.click(within(drawer).getByRole('radio', { name: /Wypoczynkowy/ }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));
    await pickRange(drawer, start, end);
    expect(await within(drawer).findByText(/3 dni robocze,/)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));
    // Krok „Dokument": dokładnie ten PDF, który się podpisze, potem dopiero podpis.
    await within(drawer).findByTestId('pdf-viewer');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Wszystko się zgadza' }));
    return drawer;
};

const submitButton = (drawer: HTMLElement) =>
    within(drawer).getByRole('button', { name: /Podpisz i wyślij wniosek/ }) as HTMLButtonElement;

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
        const filled = document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
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

describe('Kreator wniosku - podpis', () => {
    it('„Dalej" z terminu tworzy szkic z wybranymi danymi', async () => {
        renderView();
        await openWizardToSigning();
        expect(api.create).toHaveBeenCalledWith({ leaveType: 'ANNUAL', onDemand: false, startDate: start, endDate: end });
        expect(api.document).toHaveBeenCalledWith('draft-1');
    });

    it('bez podpisu albo bez oświadczenia nie da się wysłać', async () => {
        renderView();
        const drawer = await openWizardToSigning();
        expect(submitButton(drawer).disabled).toBe(true);

        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku i podpisuję go/ }));
        expect(submitButton(drawer).disabled).toBe(true);

        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'atrapa: złóż podpis' }));
        expect(submitButton(drawer).disabled).toBe(true);

        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        expect(submitButton(drawer).disabled).toBe(false);
    });

    it('wysyłka niesie skrót dokumentu, challenge i PNG bez prefiksu; potem dymek i zamknięcie', async () => {
        renderView();
        const drawer = await openWizardToSigning();
        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(submitButton(drawer));

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

    it('409: nowa sesja, odświeżony dokument, czysty pad i komunikat', async () => {
        api.submit.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.' } } });
        api.signingSession.mockResolvedValue({ documentSha256: 'b'.repeat(64), challenge: 'challenge-2' });
        renderView();
        const drawer = await openWizardToSigning();
        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(submitButton(drawer));

        expect(await within(drawer).findByText('Dokument został odświeżony. Sprawdź go i podpisz ponownie.')).toBeTruthy();
        expect(api.signingSession).toHaveBeenCalledWith('draft-1');
        expect(pad.clear).toHaveBeenCalled();
        await waitFor(() => expect(api.document).toHaveBeenCalledTimes(2));
        // Nowy dokument trzeba najpierw obejrzeć: kreator wraca do kroku „Dokument".
        expect(within(drawer).getByRole('heading', { name: 'Sprawdź wniosek' })).toBeTruthy();
        fireEvent.click(within(drawer).getByRole('button', { name: 'Wszystko się zgadza' }));
        // Oświadczenie trzeba potwierdzić jeszcze raz - dokument jest nowy.
        expect((within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }) as HTMLInputElement).checked).toBe(false);
        expect(submitButton(drawer).disabled).toBe(true);

        // Drugie podejście idzie z nowym challenge.
        fireEvent.click(within(drawer).getByRole('checkbox', { name: /Znam treść wniosku/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'atrapa: złóż podpis' }));
        await waitFor(() => expect(submitButton(drawer).disabled).toBe(false));
        fireEvent.click(submitButton(drawer));
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
        fireEvent.click(await screen.findByRole('button', { name: /Złóż wniosek o urlop/ }));
        const drawer = await screen.findByRole('dialog', { name: 'Wniosek o urlop' });
        fireEvent.click(within(drawer).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));
        await pickRange(drawer, start, end);
        fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));

        // Błąd stoi przy polu „Pierwszy dzień", w tym samym kroku - nie w dymku.
        const error = await within(drawer).findByText('Ten termin nakłada się z Twoim wnioskiem');
        expect(error.getAttribute('role')).toBe('alert');
        expect(error.parentElement?.textContent).toMatch(/Pierwszy dzień/);
        expect(within(drawer).queryByRole('heading', { name: 'Kiedy?' })).toBeTruthy();
    });

    it('okolicznościowy wymaga powodu, zanim powstanie szkic', async () => {
        renderView();
        fireEvent.click(await screen.findByRole('button', { name: /Złóż wniosek o urlop/ }));
        const drawer = await screen.findByRole('dialog', { name: 'Wniosek o urlop' });
        fireEvent.click(within(drawer).getByRole('radio', { name: /Okolicznościowy/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));
        await pickRange(drawer, start, end);
        fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));

        expect(await within(drawer).findByText('Przy urlopie okolicznościowym podaj powód.')).toBeTruthy();
        expect(api.create).not.toHaveBeenCalled();
        expect((within(drawer).getByLabelText('Powód') as HTMLTextAreaElement).maxLength).toBe(250);
    });

    it('kreator idzie krok po kroku i nie ma pola osoby zastępującej', async () => {
        renderView();
        fireEvent.click(await screen.findByRole('button', { name: /Złóż wniosek o urlop/ }));
        const drawer = await screen.findByRole('dialog', { name: 'Wniosek o urlop' });
        const steps = within(drawer).getByRole('list', { name: 'Kroki wniosku' });
        expect(within(steps).getAllByRole('listitem').map(li => li.textContent).filter(Boolean))
            .toEqual(['1Rodzaj', '2Termin', '3Dokument', '4Podpis']);
        expect(within(drawer).getByRole('heading', { name: 'Jaki to urlop?' })).toBeTruthy();

        fireEvent.click(within(drawer).getByRole('radio', { name: /Wypoczynkowy/ }));
        fireEvent.click(within(drawer).getByRole('button', { name: 'Dalej' }));
        expect(within(drawer).getByRole('heading', { name: 'Kiedy?' })).toBeTruthy();
        expect(within(drawer).queryByText(/zastęp/i)).toBeNull();
    });

    it('zamknięcie kreatora bez wysłania wycofuje szkic', async () => {
        renderView();
        const drawer = await openWizardToSigning();
        fireEvent.click(within(drawer).getByRole('button', { name: 'Zamknij' }));
        await waitFor(() => expect(api.withdraw).toHaveBeenCalledWith('draft-1'));
    });
});
