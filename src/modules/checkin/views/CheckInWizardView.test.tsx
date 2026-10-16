// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 03.10: klient przy podpisie mówi „dorzućmy jeszcze renowację
// kierownicy", a z okna dokumentów nie dało się wrócić do formularza. „Wróć do
// formularza" zamyka okno dokumentów i zostawia szkic; ponowny zapis nie zakłada drugiej
// wizyty, tylko podmienia usługi tego szkicu i otwiera dokumenty od nowa.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const wizard = vi.hoisted(() => ({
    currentStep: 'photos' as 'verification' | 'photos',
    goToStep: vi.fn(),
    submitCheckIn: vi.fn(),
    reviseDraftServices: vi.fn(),
    // Hook trzyma błąd zapisu w mutacji; tu ustawia go sama atrapa zapisu.
    submitError: null as unknown,
    resetSubmitError: vi.fn(),
}));
const visits = vi.hoisted(() => ({
    getOpenDraftForAppointment: vi.fn(),
    getOpenDrafts: vi.fn(),
    cancelDraftVisit: vi.fn(),
}));

vi.mock('../hooks/useCheckInWizard', () => ({
    useCheckInWizard: () => ({
        currentStep: wizard.currentStep,
        completedSteps: [],
        formData: {
            customerData: { firstName: 'Jan', lastName: 'Kowalski', phone: '', email: '' },
            vehicleData: { brand: 'BMW', model: 'X5' },
            services: [], photos: [{ id: 'p1' }], damagePoints: [],
        },
        steps: [{ id: 'verification', label: 'Klient, auto i usługi' }, { id: 'photos', label: 'Zdjęcia i uszkodzenia' }],
        updateFormData: vi.fn(),
        nextStep: vi.fn(),
        previousStep: vi.fn(),
        goToStep: wizard.goToStep,
        submitCheckIn: wizard.submitCheckIn,
        reviseDraftServices: wizard.reviseDraftServices,
        isSubmitting: false,
        submitError: wizard.submitError,
        resetSubmitError: wizard.resetSubmitError,
    }),
}));
vi.mock('@/modules/visits/api/visitApi', () => ({ visitApi: visits }));
vi.mock('@/widgets/Sidebar/context/SidebarContext', () => ({ useSidebar: () => ({ isCollapsed: false }) }));
vi.mock('../hooks/useCheckInValidation', () => ({ useCheckInValidation: () => ({ errors: {}, isStepValid: true }) }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock('../components/VerificationStep', () => ({ VerificationStep: () => <p>formularz z usługami</p> }));
vi.mock('../components/PhotoDocumentationStep', () => ({ PhotoDocumentationStep: () => <p>zdjęcia</p> }));
vi.mock('../components/ResumeCheckInModal', () => ({
    ResumeCheckInModal: (p: { draft: { visitId: string; visitNumber: string; customerName: string | null }; onBackToForm?: () => void }) => (
        <div role="dialog" aria-label="Dokumenty szkicu z serwera">
            {`${p.draft.visitNumber} (${p.draft.visitId}) ${p.draft.customerName ?? ''}`}
            {p.onBackToForm && <button type="button" onClick={p.onBackToForm}>Wróć do formularza ze szkicu</button>}
        </div>
    ),
}));
vi.mock('../components/SigningRequirementModal', () => ({
    SigningRequirementModal: (p: {
        isCreating: boolean; visitId: string | null; visitNumber: string;
        protocols: { id: string }[]; onBackToForm?: () => void; fromReservation?: boolean;
    }) => (
        <div role="dialog" aria-label="Dokumenty do podpisu">
            {p.isCreating ? 'tworzenie' : `${p.visitNumber}: ${p.protocols.map(x => x.id).join(',')}`}
            <span>{p.fromReservation ? 'z rezerwacji' : 'walk-in'}</span>
            <button type="button" onClick={p.onBackToForm}>Wróć do formularza</button>
        </div>
    ),
}));

import { CheckInWizardView } from './CheckInWizardView';

// Kreator kończy sesję zdjęć w cache przy wyjściu (usePhotoUpload), więc w aplikacji
// zawsze stoi pod QueryClientProvider - tu też.
const queryClient = new QueryClient();
const Location = () => <span data-testid="sciezka">{useLocation().pathname}</span>;
const view = (reservationId?: string) => (
    <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkin']}>
            <ThemeProvider theme={theme}>
                <CheckInWizardView reservationId={reservationId} initialData={{}} colors={[]} onComplete={vi.fn()} />
                <Location />
            </ThemeProvider>
        </MemoryRouter>
    </QueryClientProvider>
);
const renderView = (reservationId?: string) => render(view(reservationId));

/** Błąd axiosa w kształcie, który czyta kreator. */
const httpError = (status: number, data: object) => Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
});
/** Zapis kończy się błędem tak, jak w hooku: mutacja zapamiętuje błąd, wywołanie rzuca. */
const failWith = (error: unknown) => async () => { wizard.submitError = error; throw error; };

beforeEach(() => {
    wizard.currentStep = 'photos';
    wizard.submitError = null;
    wizard.resetSubmitError.mockImplementation(() => { wizard.submitError = null; });
    wizard.submitCheckIn.mockResolvedValue({ visitId: 'v-1', protocols: [{ id: 'stary' }] });
    wizard.reviseDraftServices.mockResolvedValue({ visitId: 'v-1', protocols: [{ id: 'nowy' }] });
    visits.cancelDraftVisit.mockResolvedValue({ reservationKept: false });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

/** Kreator po „Wróć do formularza": szkic v-1 założony, na ekranie formularz z usługami. */
const backOnTheForm = (reservationId?: string) => {
    const utils = renderView(reservationId);
    return {
        ...utils,
        async open() {
            fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));
            await screen.findByText(/stary/);
            fireEvent.click(screen.getByRole('button', { name: 'Wróć do formularza' }));
            wizard.currentStep = 'verification';
            utils.rerender(view(reservationId));
        },
    };
};

describe('CheckInWizardView - „Wróć do formularza"', () => {
    it('wraca do formularza, a ponowny zapis poprawia ten sam szkic zamiast zakładać nową wizytę', async () => {
        const { rerender } = renderView();

        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));
        expect(await screen.findByText(/stary/)).toBeInTheDocument();
        // Walk-in z kalendarza - okno opisze anulowanie bez obietnicy rezerwacji.
        expect(screen.getByText('walk-in')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Wróć do formularza' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(wizard.goToStep).toHaveBeenCalledWith('verification');

        // Kreator wraca na formularz z usługami (stan kroku trzyma hook).
        wizard.currentStep = 'verification';
        rerender(view());
        expect(screen.getByText('Poprawiasz założone przyjęcie')).toBeInTheDocument();
        expect(screen.getByText('formularz z usługami')).toBeInTheDocument();

        // Zapis idzie od razu z formularza - zdjęcia są już w wizycie.
        fireEvent.click(screen.getByRole('button', { name: /Zapisz usługi i wróć do dokumentów/ }));
        await waitFor(() => expect(wizard.reviseDraftServices).toHaveBeenCalledWith('v-1'));
        expect(wizard.submitCheckIn).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/nowy/)).toBeInTheDocument();
        expect(screen.queryByText('Poprawiasz założone przyjęcie')).toBeNull();
    });
});

/*
 * Zgłoszenie z lady (to, od którego zaczęła się ta poprawka): „Wróć do formularza", dopisana
 * usługa, zapis - i błąd serwera. Okno dokumentów znikało, a jedynym przyciskiem był ten sam
 * zapis, który znowu się wywracał. Sprzedawca nie wiedział, co zrobić, klient czekał.
 */
describe('CheckInWizardView - poprawka usług się nie zapisała', () => {
    const serverError = httpError(500, {
        message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z pomocą techniczną.',
    });

    it('mówi, co się stało i że nic nie przepadło, i daje dwa wyjścia niezależne od zapisu', async () => {
        const wizardView = backOnTheForm();
        await wizardView.open();
        wizard.reviseDraftServices.mockImplementationOnce(failWith(serverError));

        fireEvent.click(screen.getByRole('button', { name: /Zapisz usługi i wróć do dokumentów/ }));

        expect(await screen.findByText('Serwer nie dokończył zapisu usług.')).toBeInTheDocument();
        expect(screen.getByText(/Przyjęcie jest zapisane razem ze zdjęciami/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Wróć do dokumentów bez zmian' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Przerwij przyjęcie' })).toBeInTheDocument();
        // Szkic dalej jest poprawiany - ponowny zapis idzie na ten sam szkic.
        expect(screen.getByText('Poprawiasz założone przyjęcie')).toBeInTheDocument();
        // Wyjścia nie są wypełnione: wypełniony zostaje tylko krok następny (CLAUDE.md §2).
        expect(screen.getByRole('button', { name: 'Wróć do dokumentów bez zmian' })).toHaveAttribute('data-variant', 'outline');
        expect(screen.getByRole('button', { name: 'Przerwij przyjęcie' })).toHaveAttribute('data-variant', 'danger');
    });

    it('„Wróć do dokumentów bez zmian" otwiera dokumenty tego szkicu z serwera i pozwala wrócić do formularza', async () => {
        const wizardView = backOnTheForm();
        await wizardView.open();
        wizard.reviseDraftServices.mockImplementationOnce(failWith(serverError));
        fireEvent.click(screen.getByRole('button', { name: /Zapisz usługi i wróć do dokumentów/ }));

        fireEvent.click(await screen.findByRole('button', { name: 'Wróć do dokumentów bez zmian' }));

        const documents = screen.getByRole('dialog', { name: 'Dokumenty szkicu z serwera' });
        expect(documents).toHaveTextContent('VIS-v-1 (v-1) Jan Kowalski');
        expect(wizard.resetSubmitError).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Wróć do formularza ze szkicu' }));
        expect(screen.queryByRole('dialog', { name: 'Dokumenty szkicu z serwera' })).toBeNull();
        expect(wizard.goToStep).toHaveBeenLastCalledWith('verification');
    });

    it('„Przerwij przyjęcie" pyta, a po potwierdzeniu anuluje ten szkic i wraca do kalendarza', async () => {
        const wizardView = backOnTheForm();
        await wizardView.open();
        wizard.reviseDraftServices.mockImplementationOnce(failWith(serverError));
        fireEvent.click(screen.getByRole('button', { name: /Zapisz usługi i wróć do dokumentów/ }));

        fireEvent.click(await screen.findByRole('button', { name: 'Przerwij przyjęcie' }));
        expect(screen.getByText('Przerwać przyjęcie pojazdu?')).toBeInTheDocument();
        expect(visits.cancelDraftVisit).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Anuluj wizytę/ }));

        await waitFor(() => expect(visits.cancelDraftVisit).toHaveBeenCalledWith('v-1'));
        await waitFor(() => expect(screen.getByTestId('sciezka')).toHaveTextContent('/calendar'));
    });
});

describe('CheckInWizardView - przyjęcie ma już szkic (409)', () => {
    const conflict = httpError(409, {
        code: 'DRAFT_VISIT_ALREADY_EXISTS',
        visitId: 'v-9', visitNumber: '1077/26', createdAt: '2026-10-16T09:00:00Z', createdByName: 'Anna',
        message: 'Trwa już nieukończone przyjęcie tego auta.',
    });

    // Walk-in po zerwanej odpowiedzi: serwer założył szkic, sprzedawca kliknął jeszcze raz.
    // Dawniej wznawiała się tylko rezerwacja, a walk-in dostawał drugą wizytę.
    it('walk-in wraca do szkicu wskazanego w 409 zamiast zakładać drugą wizytę', async () => {
        visits.getOpenDrafts.mockResolvedValue({
            total: 2,
            drafts: [
                { visitId: 'v-inny', visitNumber: '1000/26', customerName: 'Ktoś' },
                { visitId: 'v-9', visitNumber: '1077/26', customerName: 'Jan Kowalski (serwer)' },
            ],
        });
        wizard.submitCheckIn.mockImplementationOnce(failWith(conflict));
        renderView();

        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));

        expect(await screen.findByRole('dialog', { name: 'Dokumenty szkicu z serwera' }))
            .toHaveTextContent('1077/26 (v-9) Jan Kowalski (serwer)');
        expect(visits.getOpenDraftForAppointment).not.toHaveBeenCalled();
    });

    it('gdy listy nie da się wczytać, wraca do szkicu z 409 z danymi z formularza', async () => {
        visits.getOpenDrafts.mockRejectedValue(new Error('Network Error'));
        wizard.submitCheckIn.mockImplementationOnce(failWith(conflict));
        renderView();

        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));

        expect(await screen.findByRole('dialog', { name: 'Dokumenty szkicu z serwera' }))
            .toHaveTextContent('1077/26 (v-9) Jan Kowalski');
    });

    it('gdy szkicu nie da się otworzyć, prowadzi do listy nieukończonych przyjęć', async () => {
        visits.getOpenDraftForAppointment.mockResolvedValue(null);
        wizard.submitCheckIn.mockImplementationOnce(failWith(conflict));
        renderView('r-1');

        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));

        const goToDrafts = await screen.findByRole('button', { name: 'Przejdź do nieukończonych przyjęć' });
        expect(screen.getByText('Trwa już nieukończone przyjęcie tego auta.')).toBeInTheDocument();
        expect(visits.getOpenDraftForAppointment).toHaveBeenCalledWith('r-1');
        fireEvent.click(goToDrafts);
        expect(screen.getByTestId('sciezka')).toHaveTextContent('/operations');
    });
});

describe('CheckInWizardView - komunikat błędu zapisu', () => {
    it('zerwane połączenie: po polsku i z informacją, że dane zostały, nie „Network Error"', async () => {
        wizard.submitCheckIn.mockImplementationOnce(failWith(
            Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' }),
        ));
        renderView();

        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));

        expect(await screen.findByText('Brak połączenia z serwerem. Dane formularza są zachowane, spróbuj ponownie.'))
            .toBeInTheDocument();
        expect(screen.queryByText('Network Error')).toBeNull();
    });
});
