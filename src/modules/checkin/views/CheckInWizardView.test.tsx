// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 03.10: klient przy podpisie mówi „dorzućmy jeszcze renowację
// kierownicy", a z okna dokumentów nie dało się wrócić do formularza. „Wróć do
// formularza" zamyka okno dokumentów i zostawia szkic; ponowny zapis nie zakłada drugiej
// wizyty, tylko podmienia usługi tego szkicu i otwiera dokumenty od nowa.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const wizard = vi.hoisted(() => ({
    currentStep: 'photos' as 'verification' | 'photos',
    goToStep: vi.fn(),
    submitCheckIn: vi.fn(),
    reviseDraftServices: vi.fn(),
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
        steps: [{ id: 'verification', label: 'Weryfikacja i stan pojazdu' }, { id: 'photos', label: 'Dokumentacja fotograficzna' }],
        updateFormData: vi.fn(),
        nextStep: vi.fn(),
        previousStep: vi.fn(),
        goToStep: wizard.goToStep,
        submitCheckIn: wizard.submitCheckIn,
        reviseDraftServices: wizard.reviseDraftServices,
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
        <div role="dialog" aria-label="Dokumentacja i Podpisy">
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
    wizard.reviseDraftServices.mockResolvedValue({ visitId: 'v-1', protocols: [{ id: 'nowy' }] });
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
        fireEvent.click(screen.getByRole('button', { name: /Zapisz usługi i wróć do dokumentów/ }));
        await waitFor(() => expect(wizard.reviseDraftServices).toHaveBeenCalledWith('v-1'));
        expect(wizard.submitCheckIn).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/nowy/)).toBeInTheDocument();
        expect(screen.queryByText('Poprawiasz założone przyjęcie')).toBeNull();
    });
});
