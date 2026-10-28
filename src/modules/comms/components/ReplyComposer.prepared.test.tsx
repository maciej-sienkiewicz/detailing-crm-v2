// @vitest-environment jsdom
//
// Pierwsza odpowiedź przygotowana zaraz po przyjściu zapytania (serwer: LeadReplyDraftPreparer).
// Edytor otwiera się z nią sam, termin wpisuje człowiek, a wycena wysłana z tej odpowiedzi
// przechodzi do wyceny leada - kwota w mailu i na leadzie muszą być te same.
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { PreparedReply } from '../types';
import { ReplyComposer } from './ReplyComposer';

const sendMutate = vi.fn();
const acceptSuggestion = vi.fn().mockResolvedValue({});
const saveReplyFacts = vi.fn().mockResolvedValue(undefined);
let signature: { bodyHtml: string; enabledByDefault: boolean } | null = { bodyHtml: '<p>Jakub</p>', enabledByDefault: true };

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { firstName: 'Jakub' } }) }));
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
    useMailSignature: () => ({ data: signature }),
    useProofread: () => ({ mutate: vi.fn(), isPending: false }),
    useSendMail: () => ({ mutate: sendMutate, isPending: false }),
}));
vi.mock('../api/commsApi', () => ({
    commsApi: { saveReplyFacts: (...args: unknown[]) => saveReplyFacts(...args) },
}));
vi.mock('../api/leadsApi', () => ({
    leadsApi: { acceptSuggestion: (...args: unknown[]) => acceptSuggestion(...args) },
}));
vi.mock('./RichTextEditor', () => ({
    RichTextEditor: ({ value, onChange, afterContent, toolbarExtra, toolbarAppend, actions }: {
        value: string;
        onChange: (html: string) => void;
        afterContent?: ReactNode;
        toolbarExtra?: ReactNode;
        toolbarAppend?: ReactNode;
        actions?: ReactNode;
    }) => (
        <div>
            <textarea aria-label="Treść" value={value} onChange={(event) => onChange(event.target.value)} />
            {afterContent}
            {toolbarExtra}
            {toolbarAppend}
            {actions}
        </div>
    ),
}));
vi.mock('./SignatureSettingsModal', () => ({ SignatureSettingsModal: () => null }));
vi.mock('./ReplyDraftRevise', () => ({ ReplyDraftRevise: () => null }));
vi.mock('./ReplyDraftButton', () => ({ ReplyDraftButton: () => null }));

const prepared: PreparedReply = {
    kind: 'QUOTE',
    bodyText: 'Dzień dobry,\n\nprzyciemnienie szyb to 1 000,00 zł. Najbliższy termin: [proponowany termin].',
    useSentStyle: true,
    signatureAppended: true,
    offer: [{ itemId: 'item-1', name: 'Przyciemnie szyb - 7 sztuk', quantity: 1, priceGross: 100_000, suggested: true }],
    preparedAt: '2026-10-28T08:00:00Z',
    calendar: [
        { date: '2026-10-29', bookings: 4 },
        { date: '2026-10-30', bookings: 1 },
    ],
};

const renderComposer = (extra: Partial<Parameters<typeof ReplyComposer>[0]> = {}) =>
    render(
        <ThemeProvider theme={theme}>
            <ReplyComposer threadId="thread-1" threadLeadId="lead-1" initialTo="klient@example.com" layout="collapsed" prepared={prepared} {...extra} />
        </ThemeProvider>
    );

const editorText = () => (screen.getByLabelText('Treść') as HTMLTextAreaElement).value;
const openPrepared = () => fireEvent.click(screen.getByRole('button', { name: 'Otwórz odpowiedź' }));
const otherReply = (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: /Inna odpowiedź/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: label }));
};

describe('ReplyComposer - odpowiedź przygotowana po zapytaniu', () => {
    beforeEach(() => {
        sendMutate.mockReset();
        acceptSuggestion.mockClear();
        signature = { bodyHtml: '<p>Jakub</p>', enabledByDefault: true };
    });

    // Właściciel, 28.10.2026: szkic wpisany sam do edytora zaskakiwał, a rozsunięty edytor
    // zostawiał rozmowie kilka centymetrów. Teraz to propozycja - edytor jest zamknięty.
    it('najpierw karta z rodzajem, kwotą i podglądem - edytor zamknięty, nic nie jest wpisane', () => {
        renderComposer();

        expect(screen.getByText(/^Gotowa odpowiedź: wycena na 1\s000,00\szł$/)).toBeTruthy();
        expect(screen.getByText(/przyciemnienie szyb to 1 000,00 zł/)).toBeTruthy();
        expect(screen.queryByLabelText('Treść')).toBeNull();
        // Jedyny wypełniony przycisk: krok następny (CLAUDE.md §2).
        expect(screen.getByRole('button', { name: 'Otwórz odpowiedź' })).toBeTruthy();
    });

    it('„Otwórz odpowiedź" wstawia szkic; jedna linia nad treścią, bez rzędu rodzajów', () => {
        renderComposer();
        openPrepared();

        expect(editorText()).toContain('przyciemnienie szyb to 1 000,00 zł');
        expect(screen.getByText('Wpisz termin, zanim wyślesz:')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Poproś o zdjęcia' })).toBeNull();
        expect(screen.queryByText(/Uzupełnij przed wysłaniem/)).toBeNull();
    });

    it('nie wysyła, dopóki termin nie jest wpisany - podpowiedź z kalendarza go wpisuje', () => {
        renderComposer();
        openPrepared();
        expect((screen.getByRole('button', { name: /^Wyślij$/ }) as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /pt 30\.10/ }));

        expect(editorText()).toContain('piątek 30.10');
        expect(editorText()).not.toContain('[proponowany termin]');
        expect(screen.getByText('Gotowa odpowiedź. Przeczytaj ją przed wysłaniem.')).toBeTruthy();
        expect((screen.getByRole('button', { name: /^Wyślij$/ }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('wysłana wycena przyjmuje swoje sugestie na leadzie', () => {
        renderComposer();
        openPrepared();
        fireEvent.click(screen.getByRole('button', { name: /pt 30\.10/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Wyślij$/ }));

        sendMutate.mock.calls[0][1].onSuccess({ threadId: 'thread-1' });

        expect(acceptSuggestion).toHaveBeenCalledWith('lead-1', 'item-1');
    });

    it('„Odrzuć" zamyka edytor i wraca do karty', () => {
        renderComposer();
        openPrepared();
        fireEvent.click(screen.getByRole('button', { name: 'Odrzuć' }));

        expect(screen.queryByLabelText('Treść')).toBeNull();
        expect(screen.getByRole('button', { name: 'Otwórz odpowiedź' })).toBeTruthy();
    });

    it('inna odpowiedź z menu - wysyłka nie rusza wyceny leada', () => {
        renderComposer();
        otherReply('Zaproś na oględziny');
        expect(editorText()).toContain('oględzinach');

        fireEvent.click(screen.getByRole('button', { name: /^Wyślij$/ }));
        sendMutate.mock.calls[0][1].onSuccess({ threadId: 'thread-1' });

        expect(acceptSuggestion).not.toHaveBeenCalled();
    });

    it('„Napiszę od zera" otwiera pusty edytor i chowa kartę', () => {
        renderComposer();
        otherReply('Napiszę od zera');

        expect(editorText()).toBe('');
        expect(screen.queryByRole('button', { name: 'Otwórz odpowiedź' })).toBeNull();
    });

    // Zapytanie z 28.10.2026: szkic był gotowy 11 s po przyjściu maila, a odpisujący nie miał
    // stopki - edytor odrzucił szkic po cichu i pokazał samo „Odpisz".
    it('bez stopki szkic też jest - imię odpisującego staje pod pożegnaniem', () => {
        signature = null;
        renderComposer({ prepared: { ...prepared, bodyText: `${prepared.bodyText}\n\nPozdrawiam serdecznie` } });
        openPrepared();

        expect(editorText()).toContain('przyciemnienie szyb to 1 000,00 zł');
        expect(editorText()).toMatch(/Pozdrawiam serdecznie(?:<[^>]+>|\s)*Jakub(?:<[^>]+>|\s)*$/);
    });

    it('stały klient i duża wycena dostają zdanie o telefonie w karcie', () => {
        renderComposer({ preparedHint: 'Stały klient (3 wizyty). Po wysłaniu warto zadzwonić.' });
        expect(screen.getByText(/Po wysłaniu warto zadzwonić/)).toBeTruthy();
    });

    // „Model musi się uczyć" (29.10.2026): odpowiedź wpisana w miejsce znacznika o studiu
    // trafia do wiedzy studia, a wpisany termin - nie.
    it('po wysłaniu studio zapamiętuje, co wpisano w miejsce znacznika o studiu', () => {
        const withCare = {
            ...prepared,
            bodyText: 'Dzień dobry,\n\nchętnie umyjemy auto. [jak dbamy o powłokę ceramiczną przy myciu] Odkurzymy też wnętrze.\n\nNajbliższy termin: [proponowany termin].',
        };
        renderComposer({ prepared: withCare });
        openPrepared();
        fireEvent.click(screen.getByRole('button', { name: /pt 30\.10/ }));
        const editor = screen.getByLabelText('Treść') as HTMLTextAreaElement;
        fireEvent.change(editor, {
            target: { value: editor.value.replace('[jak dbamy o powłokę ceramiczną przy myciu]', 'Myjemy szamponem o neutralnym pH.') },
        });
        fireEvent.click(screen.getByRole('button', { name: /^Wyślij$/ }));
        sendMutate.mock.calls[0][1].onSuccess({ threadId: 'thread-1' });

        expect(saveReplyFacts).toHaveBeenCalledWith('thread-1', [
            { topic: 'jak dbamy o powłokę ceramiczną przy myciu', answer: 'Myjemy szamponem o neutralnym pH.' },
        ]);
    });
});
