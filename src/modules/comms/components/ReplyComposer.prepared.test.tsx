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
let signature: { bodyHtml: string; enabledByDefault: boolean } | null = { bodyHtml: '<p>Jakub</p>', enabledByDefault: true };

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

describe('ReplyComposer - odpowiedź przygotowana po zapytaniu', () => {
    beforeEach(() => {
        sendMutate.mockReset();
        acceptSuggestion.mockClear();
        signature = { bodyHtml: '<p>Jakub</p>', enabledByDefault: true };
    });

    it('otwiera edytor z przygotowaną wyceną, bez klikania „Odpisz"', () => {
        renderComposer();

        expect(editorText()).toContain('przyciemnienie szyb to 1 000,00 zł');
        expect(screen.getByRole('button', { name: 'Wycena' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('nie wysyła, dopóki termin nie jest wpisany - podpowiedź z kalendarza go wpisuje', () => {
        renderComposer();
        expect((screen.getByRole('button', { name: /^Wyślij$/ }) as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /pt 30\.10/ }));

        expect(editorText()).toContain('piątek 30.10');
        expect(editorText()).not.toContain('[proponowany termin]');
        expect((screen.getByRole('button', { name: /^Wyślij$/ }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('wysłana wycena przyjmuje swoje sugestie na leadzie', () => {
        renderComposer();
        fireEvent.click(screen.getByRole('button', { name: /pt 30\.10/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Wyślij$/ }));

        sendMutate.mock.calls[0][1].onSuccess({ threadId: 'thread-1' });

        expect(acceptSuggestion).toHaveBeenCalledWith('lead-1', 'item-1');
    });

    it('po przełączeniu na szybką odpowiedź wysyłka nie rusza wyceny leada', () => {
        renderComposer();
        fireEvent.click(screen.getByRole('button', { name: 'Zaproś na oględziny' }));
        expect(editorText()).toContain('oględzinach');

        fireEvent.click(screen.getByRole('button', { name: /^Wyślij$/ }));
        sendMutate.mock.calls[0][1].onSuccess({ threadId: 'thread-1' });

        expect(acceptSuggestion).not.toHaveBeenCalled();
    });

    it('z szybkiej odpowiedzi wraca się do przygotowanej jednym kliknięciem', () => {
        renderComposer();
        fireEvent.click(screen.getByRole('button', { name: 'Nie robimy tego' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wycena' }));

        expect(editorText()).toContain('przyciemnienie szyb to 1 000,00 zł');
        expect(screen.queryByText(/Po wysłaniu zapytanie zamknie się/)).toBeNull();
    });

    it('szkic pisany pod stopkę nie wpada, gdy stopki nie ma - podpis wyszedłby bez imienia', () => {
        signature = null;
        renderComposer();

        expect(screen.queryByLabelText('Treść')).toBeNull();
        expect(screen.getByRole('button', { name: /Odpisz/ })).toBeTruthy();
    });

    it('stały klient i duża wycena dostają zdanie o telefonie', () => {
        renderComposer({ preparedHint: 'Stały klient (3 wizyty). Po wysłaniu warto zadzwonić.' });
        expect(screen.getByText(/Po wysłaniu warto zadzwonić/)).toBeTruthy();
    });
});
