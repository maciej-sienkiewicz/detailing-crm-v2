// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 03.10: klient przy podpisie mówi „dorzućmy jeszcze renowację
// kierownicy", a z okna dokumentów nie dało się wrócić do formularza. „Wróć do
// formularza" zamyka okno dokumentów i zostawia szkic; ponowny zapis nie zakłada drugiej
// wizyty, tylko zapisuje do szkicu poprawiony formularz i otwiera dokumenty od nowa.
// Zgłoszenie z 19.10: poprawka zapisywała tylko usługi, a protokół pokazywał dane sprzed poprawki.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const wizard = vi.hoisted(() => ({
    currentStep: 'photos' as 'verification' | 'photos',
    goToStep: vi.fn(),
    submitCheckIn: vi.fn(),
    reviseDraft: vi.fn(),
    nextStep: vi.fn(),
    updateFormData: vi.fn(),
}));

vi.mock('../hooks/useCheckInWizard', () => ({
    useCheckInWizard: () => ({
        currentStep: wizard.currentStep,
        completedSteps: [],
        formData: {
            customerData: { firstName: 'Jan', lastName: 'Kowalski', phone: '', email: '' },
            vehicleData: { brand: 'BMW', model: 'X5' },
            visitEndAt: '2099-01-01T12:00',
            services: [], photos: [{ id: 'p1' }], damagePoints: [],
        },
        steps: [{ id: 'verification', label: 'Klient, auto i usługi' }, { id: 'photos', label: 'Zdjęcia i uszkodzenia' }],
        updateFormData: wizard.updateFormData,
        nextStep: wizard.nextStep,
        previousStep: vi.fn(),
        goToStep: wizard.goToStep,
        submitCheckIn: wizard.submitCheckIn,
        reviseDraft: wizard.reviseDraft,
        isSubmitting: false,
        submitError: null,
    }),
}));
vi.mock('@/widgets/Sidebar/context/SidebarContext', () => ({ useSidebar: () => ({ isCollapsed: false }) }));
vi.mock('../hooks/useCheckInValidation', () => ({ useCheckInValidation: () => ({ errors: {}, isStepValid: true }) }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock('../components/VerificationStep', () => ({ VerificationStep: () => <p>formularz z usługami</p> }));
vi.mock('../components/PhotoDocumentationStep', () => ({ PhotoDocumentationStep: () => <p>zdjęcia</p> }));
vi.mock('../components/ResumeCheckInModal', () => ({ ResumeCheckInModal: () => null }));
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

const renderView = () => render(
    <MemoryRouter>
        <ThemeProvider theme={theme}>
            <CheckInWizardView initialData={{}} colors={[]} onComplete={vi.fn()} />
        </ThemeProvider>
    </MemoryRouter>,
);

beforeEach(() => {
    wizard.currentStep = 'photos';
    wizard.submitCheckIn.mockResolvedValue({ visitId: 'v-1', protocols: [{ id: 'stary' }] });
    wizard.reviseDraft.mockResolvedValue({ visitId: 'v-1', protocols: [{ id: 'nowy' }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

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
        rerender(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <CheckInWizardView initialData={{}} colors={[]} onComplete={vi.fn()} />
                </ThemeProvider>
            </MemoryRouter>,
        );
        expect(screen.getByText('Poprawiasz założone przyjęcie')).toBeInTheDocument();
        expect(screen.getByText('formularz z usługami')).toBeInTheDocument();

        // Zapis idzie od razu z formularza - zdjęcia są już w wizycie.
        fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany i wróć do dokumentów/ }));
        await waitFor(() => expect(wizard.reviseDraft).toHaveBeenCalledWith('v-1'));
        expect(wizard.submitCheckIn).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/nowy/)).toBeInTheDocument();
        expect(screen.queryByText('Poprawiasz założone przyjęcie')).toBeNull();
    });

    it('przy poprawce da się przejść do zdjęć i uszkodzeń', async () => {
        const { rerender } = renderView();
        fireEvent.click(screen.getByRole('button', { name: /Utwórz wizytę/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Wróć do formularza' }));

        wizard.currentStep = 'verification';
        rerender(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <CheckInWizardView initialData={{}} colors={[]} onComplete={vi.fn()} />
                </ThemeProvider>
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', { name: /Zdjęcia i uszkodzenia/ }));
        expect(wizard.nextStep).toHaveBeenCalled();
    });
});

describe('CheckInWizardView - rezerwacja z minionego dnia', () => {
    const renderReservation = (plannedStartAt: string) => render(
        <MemoryRouter>
            <ThemeProvider theme={theme}>
                <CheckInWizardView reservationId="r-1" plannedStartAt={plannedStartAt} initialData={{}} colors={[]} onComplete={vi.fn()} />
            </ThemeProvider>
        </MemoryRouter>,
    );

    it('najpierw pyta, kiedy auto trafiło do studia, i wpisuje odpowiedź w datę rozpoczęcia', () => {
        const planned = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        planned.setHours(9, 0, 0, 0);
        renderReservation(planned.toISOString());

        expect(screen.getByText('Kiedy auto trafiło do studia?')).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Od dnia rezerwacji/));
        fireEvent.click(screen.getByRole('button', { name: 'Przejdź do przyjęcia' }));

        const pad = (n: number) => String(n).padStart(2, '0');
        expect(wizard.updateFormData).toHaveBeenCalledWith({
            visitStartAt: `${planned.getFullYear()}-${pad(planned.getMonth() + 1)}-${pad(planned.getDate())}T09:00`,
        });
        expect(screen.queryByText('Kiedy auto trafiło do studia?')).toBeNull();
    });

    it('rezerwacja z dzisiaj nie pyta o nic', () => {
        renderReservation(new Date().toISOString());
        expect(screen.queryByText('Kiedy auto trafiło do studia?')).toBeNull();
    });
});
