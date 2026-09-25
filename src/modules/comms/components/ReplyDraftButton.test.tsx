// @vitest-environment jsdom
//
// Styl szkicu steruje jedna flaga (useSentStyle). Pierwsze kliknięcie pyta o nią
// użytkownika, zapamiętany wybór idzie od razu do serwera - bez pytania za każdym razem.
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { ReplyDraftPreferences } from '../types';
import { ReplyDraftButton } from './ReplyDraftButton';

const draftMutate = vi.fn();
const saveMutate = vi.fn();
let preferences: ReplyDraftPreferences | undefined;

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../hooks/useReplyDraft', () => ({
    useReplyDraftPreferences: () => ({ data: preferences, isLoading: false }),
    useSaveReplyDraftPreferences: () => ({ mutate: saveMutate, isPending: false }),
    useDraftReply: () => ({ mutate: draftMutate, isPending: false }),
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

const renderButton = () =>
    render(
        <ThemeProvider theme={theme}>
            <ReplyDraftButton threadId="thread-1" signatureAppended onDraft={vi.fn()} />
        </ThemeProvider>
    );

describe('ReplyDraftButton - flaga stylu szkicu', () => {
    beforeEach(() => {
        draftMutate.mockReset();
        saveMutate.mockReset();
    });

    it('bez zapisanego wyboru pierwsze kliknięcie pyta o styl, a nie generuje w ciemno', () => {
        preferences = { useSentStyle: null, sentMessageCount: 42 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));

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
        fireEvent.click(screen.getByRole('button', { name: /Propozycja asystenta/ }));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Napisz szkic/ }));

        expect(saveMutate).not.toHaveBeenCalled();
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ useSentStyle: false });
    });

    it('zapamiętany wybór generuje od razu, bez okna', () => {
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: /Szkic AI/ }));

        expect(screen.queryByText('Jak ma pisać asystent?')).toBeNull();
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ threadId: 'thread-1', useSentStyle: false });
    });

    it('ikona obok przycisku zmienia zapamiętany styl', () => {
        preferences = { useSentStyle: false, sentMessageCount: 10 };
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: 'Styl szkicu: propozycja asystenta' }));
        fireEvent.click(screen.getByRole('button', { name: /W moim stylu/ }));
        fireEvent.click(screen.getByRole('button', { name: /Napisz szkic/ }));

        expect(saveMutate).toHaveBeenCalledWith(true);
        expect(draftMutate.mock.calls[0][0]).toMatchObject({ useSentStyle: true });
    });
});
