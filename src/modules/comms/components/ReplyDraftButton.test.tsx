// @vitest-environment jsdom
//
// Styl szkicu steruje jedna flaga (useSentStyle). Pierwsze kliknięcie pyta o nią
// użytkownika, zapamiętany wybór idzie od razu do serwera - bez pytania za każdym razem.
// Każde kliknięcie zaczyna się od pytania o ofertę (lista usług z cenami w odpowiedzi).
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { DraftOfferLine, Lead, ReplyDraftPreferences } from '../types';
import { ReplyDraftButton } from './ReplyDraftButton';

const draftMutate = vi.fn();
const saveMutate = vi.fn();
let preferences: ReplyDraftPreferences | undefined;
let lead: Partial<Lead> | undefined;
const OFFER: DraftOfferLine[] = [{ name: 'Powłoka ceramiczna', quantity: 1, priceGross: 180_000, regularPriceGross: 200_000 }];

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../hooks/useReplyDraft', () => ({
    useReplyDraftPreferences: () => ({ data: preferences, isLoading: false }),
    useSaveReplyDraftPreferences: () => ({ mutate: saveMutate, isPending: false }),
    useDraftReply: () => ({ mutate: draftMutate, isPending: false }),
}));
vi.mock('../hooks/useLeads', () => ({
    useLead: (leadId: string | null) => ({ data: leadId ? lead : undefined }),
}));
// Wybór usług ma własne testy edytora - tu liczy się tylko to, co oddaje dalej.
vi.mock('./ReplyDraftOfferModal', () => ({
    ReplyDraftOfferModal: ({ lead: modalLead, onReady }: { lead: Lead | null; onReady: (offer: DraftOfferLine[]) => void }) => (
        <div>
            <span>{modalLead ? `wycena leada ${modalLead.id}` : 'bez leada'}</span>
            <button type="button" onClick={() => onReady(OFFER)}>Napisz szkic z ofertą</button>
        </div>
    ),
}));
// Okno w portalu z blokadą scrolla nie jest tu przedmiotem testu - wystarczy jego treść.
vi.mock('@/common/components/ModalKit', () => {
    const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    return {
        ModalShell: passthrough,
        ModalHeader: passthrough,
        ModalTitleGroup: passthrough,
        ModalTitle: passthrough,
        ModalSubtitle: passthrough,
        ModalContent: passthrough,
        ModalFooter: passthrough,
        CloseBtn: () => null,
    };
});

const renderButton = (leadId: string | null = null, onDraft = vi.fn()) =>
    render(
        <ThemeProvider theme={theme}>
            <ReplyDraftButton threadId="thread-1" signatureAppended leadId={leadId} onDraft={onDraft} />
        </ThemeProvider>
    );

/** Pierwszy krok każdego szkicu: „Bez oferty" i dalej. */
const skipOffer = () => {
    fireEvent.click(screen.getByRole('button', { name: /Bez oferty/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
};

describe('ReplyDraftButton - flaga stylu szkicu', () => {
    beforeEach(() => {
        draftMutate.mockReset();
        saveMutate.mockReset();
    });

    it('bez zapisanego wyboru pierwsze kliknięcie pyta o styl, a nie generuje w ciemno', () => {
        preferences = { useSentStyle: null, sentMessageCount: 42 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        skipOffer();

        expect(draftMutate).not.toHaveBeenCalled();
        expect(screen.getByText('Jak ma pisać asystent?')).toBeTruthy();
        expect(screen.getByText('W skrzynce jest 42 wysłane wiadomości.')).toBeTruthy();
        // Dopóki nic nie wybrano, nie ma czego potwierdzać.
        expect((screen.getByRole('button', { name: /Napisz szkic/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('wybór „W moim stylu" z zapamiętaniem zapisuje flagę i generuje z nią szkic', () => {
        preferences = { useSentStyle: null, sentMessageCount: 42 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        skipOffer();
        fireEvent.click(screen.getByRole('button', { name: /W moim stylu/ }));
        fireEvent.click(screen.getByRole('button', { name: /Napisz szkic/ }));

        expect(saveMutate).toHaveBeenCalledWith(true);
        expect(draftMutate.mock.calls[0][0]).toEqual({
            threadId: 'thread-1',
            useSentStyle: true,
            signatureAppended: true,
        });
    });

    it('bez zapamiętania generuje, ale ustawienia nie rusza', () => {
        preferences = { useSentStyle: null, sentMessageCount: 0 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        skipOffer();
        fireEvent.click(screen.getByRole('button', { name: /Propozycja asystenta/ }));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Napisz szkic/ }));

        expect(saveMutate).not.toHaveBeenCalled();
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ useSentStyle: false });
    });

    it('zapamiętany wybór generuje od razu po pytaniu o ofertę, bez okna stylu', () => {
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        expect(draftMutate).not.toHaveBeenCalled();
        skipOffer();

        expect(screen.queryByText('Jak ma pisać asystent?')).toBeNull();
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ threadId: 'thread-1', useSentStyle: false });
    });

    it('ikona obok przycisku zmienia zapamiętany styl', () => {
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: 'Styl szkicu: propozycja asystenta' }));
        fireEvent.click(screen.getByRole('button', { name: /W moim stylu/ }));
        fireEvent.click(screen.getByRole('button', { name: /Napisz szkic/ }));
        skipOffer();

        expect(saveMutate).toHaveBeenCalledWith(true);
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ useSentStyle: true });
    });

    it('bez oferty szkic idzie bez pozycji oferty', () => {
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        skipOffer();

        expect(draftMutate.mock.calls[0][0]).not.toHaveProperty('offer');
    });
});

describe('ReplyDraftButton - oferta w odpowiedzi', () => {
    beforeEach(() => {
        draftMutate.mockReset();
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        lead = undefined;
    });

    it('lead z wyceną: pytanie mówi, że asystent użyje wyceny leada, a okno otwiera się na niej', () => {
        lead = { id: 'lead-7', services: [{ status: 'ACCEPTED' } as Lead['services'][number]] };
        renderButton('lead-7');

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        expect(screen.getByText(/usługi z wyceny leada/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Z ofertą/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));

        expect(screen.getByText('wycena leada lead-7')).toBeTruthy();
        expect(draftMutate).not.toHaveBeenCalled();
    });

    it('rozmowa bez leada: pytanie zapowiada założenie leada', () => {
        renderButton(null);

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));

        expect(screen.getByText(/Rozmowa zostanie leadem/)).toBeTruthy();
    });

    it('wybrana oferta idzie do szkicu i zostaje przy nim dla „Popraw"', () => {
        const onDraft = vi.fn();
        draftMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ bodyText: 'Szkic' }));
        renderButton(null, onDraft);

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));
        fireEvent.click(screen.getByRole('button', { name: /Z ofertą/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
        fireEvent.click(screen.getByRole('button', { name: 'Napisz szkic z ofertą' }));

        expect(draftMutate.mock.calls[0][0]).toEqual({
            threadId: 'thread-1', useSentStyle: false, signatureAppended: true, offer: OFFER,
        });
        expect(onDraft).toHaveBeenCalledWith({ bodyText: 'Szkic', offer: OFFER });
    });
});
