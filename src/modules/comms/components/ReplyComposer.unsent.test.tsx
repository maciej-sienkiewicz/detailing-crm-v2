// @vitest-environment jsdom
//
// Zgłoszenie biznesu: pracownik zaczyna odpisywać na leada, przechodzi do kalendarza
// sprawdzić wolne terminy, wraca - i cała wiadomość jest skasowana. Przejście do innego
// widoku odmontowuje okno odpowiedzi, więc tutaj „wyjście i powrót" to unmount i render.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { ReplyComposer } from './ReplyComposer';
import { discardUnsentReply, unsentReplyKeys } from '../utils/unsentReplies';

const mutate = vi.fn();
const auth = vi.hoisted(() => ({ user: { userId: 'u-1', firstName: 'Jakub' } }));

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/modules/subscription/hooks/useCapabilityGate', () => ({
    useCapabilityGate: () => ({ enabled: true, run: (action: () => void) => action(), upsell: null }),
}));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../hooks/useLeads', () => ({
    useChangeLeadStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useComms', () => ({
    useMailSignature: () => ({ data: null }),
    useProofread: () => ({ mutate: vi.fn(), isPending: false }),
    useSendMail: () => ({ mutate, isPending: false }),
}));
vi.mock('./RichTextEditor', () => ({
    RichTextEditor: ({ value, onChange, actions }: { value: string; onChange: (html: string) => void; actions?: React.ReactNode }) => (
        <div>
            <textarea aria-label="Treść" value={value} onChange={(event) => onChange(event.target.value)} />
            {actions}
        </div>
    ),
}));
vi.mock('./SignatureSettingsModal', () => ({ SignatureSettingsModal: () => null }));
vi.mock('./ReplyDraftButton', () => ({ ReplyDraftButton: () => null }));
vi.mock('./ReplyDraftRevise', () => ({ ReplyDraftRevise: () => null }));

const open = (props: Partial<Parameters<typeof ReplyComposer>[0]> = {}) =>
    render(
        <ThemeProvider theme={theme}>
            <ReplyComposer threadId="t-1" initialTo="klient@wp.pl" {...props} />
        </ThemeProvider>
    );

const body = () => (screen.getByLabelText('Treść') as HTMLTextAreaElement).value;
const write = (html: string) => fireEvent.change(screen.getByLabelText('Treść'), { target: { value: html } });

describe('ReplyComposer - wersja robocza', () => {
    beforeEach(() => {
        mutate.mockReset();
        auth.user = { userId: 'u-1', firstName: 'Jakub' };
        ['u-1', 'u-2'].forEach((user) => unsentReplyKeys(user).forEach((key) => discardUnsentReply(user, key)));
        window.localStorage.clear();
    });

    it('zaczęta odpowiedź wraca po wyjściu do kalendarza i powrocie do leada', () => {
        const first = open();
        write('<p>Dzień dobry, wolny termin mamy w</p>');
        first.unmount();

        open();

        expect(body()).toBe('<p>Dzień dobry, wolny termin mamy w</p>');
        expect(screen.getByText(/Wersja robocza, zapisana dziś/)).toBeTruthy();
    });

    it('każda rozmowa ma swoją wersję roboczą', () => {
        const first = open();
        write('<p>Do pana Kowalskiego</p>');
        first.unmount();

        open({ threadId: 't-2' });

        expect(body()).toBe('');
    });

    it('wersja robocza jednej osoby nie pokazuje się po przełączeniu na drugą', () => {
        const first = open();
        write('<p>Pisze Jakub</p>');
        first.unmount();

        auth.user = { userId: 'u-2', firstName: 'Ola' };
        open();

        expect(body()).toBe('');
    });

    it('wysłana odpowiedź nie zostawia wersji roboczej', () => {
        const first = open();
        write('<p>Zapraszamy we wtorek</p>');
        fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }));
        expect(mutate).toHaveBeenCalledTimes(1);
        act(() => mutate.mock.calls[0][1].onSuccess({ threadId: 't-1' }));
        first.unmount();

        open();

        expect(body()).toBe('');
        expect(unsentReplyKeys('u-1')).toEqual([]);
    });

    it('nieudana wysyłka zostawia wersję roboczą', () => {
        const first = open();
        write('<p>Zapraszamy we wtorek</p>');
        fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }));
        act(() => mutate.mock.calls[0][1].onError(new Error('SMTP')));
        first.unmount();

        open();

        expect(body()).toBe('<p>Zapraszamy we wtorek</p>');
    });

    it('wyczyszczona treść nie zostawia wersji roboczej', () => {
        const first = open();
        write('<p>Dzień</p>');
        write('');
        first.unmount();

        expect(unsentReplyKeys('u-1')).toEqual([]);
    });

    it('„Odrzuć" czyści okno i usuwa wersję, a treść da się jeszcze przywrócić', () => {
        const first = open();
        write('<p>Stara wersja</p>');
        first.unmount();
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Odrzuć' }));

        expect(body()).toBe('');
        expect(unsentReplyKeys('u-1')).toEqual([]);

        fireEvent.click(screen.getByRole('button', { name: 'Cofnij' }));
        expect(body()).toBe('<p>Stara wersja</p>');
        expect(unsentReplyKeys('u-1')).toEqual(['thread:t-1']);
    });

    it('nowa wiadomość pamięta też temat i ręcznie wpisanego adresata', () => {
        const first = open({ threadId: undefined, initialTo: undefined, accountId: 'a-1', requireSubject: true });
        fireEvent.change(screen.getByPlaceholderText('adres@klienta.pl'), { target: { value: 'nowy@klient.pl' } });
        fireEvent.change(screen.getByPlaceholderText('Temat wiadomości'), { target: { value: 'Wycena ceramiki' } });
        first.unmount();

        open({ threadId: undefined, initialTo: undefined, accountId: 'a-1', requireSubject: true });

        expect((screen.getByPlaceholderText('adres@klienta.pl') as HTMLInputElement).value).toBe('nowy@klient.pl');
        expect((screen.getByPlaceholderText('Temat wiadomości') as HTMLInputElement).value).toBe('Wycena ceramiki');
    });
});
