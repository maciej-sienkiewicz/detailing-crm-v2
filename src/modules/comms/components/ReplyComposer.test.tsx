// @vitest-environment jsdom
//
// Zgłoszenie z produkcji: wycena 6500 zł dla Alfy Tonale poszła na biuro@carslab.pl -
// do samego studia - bo pole odpowiedzi brało adres „drugiej strony wątku", a przy
// zgłoszeniu z formularza drugą stroną był robot z adresem studia.
//
// Adresata ustala teraz serwer (Reply-To, nigdy adres studia ani robota). Te testy
// pilnują strony ekranu: odpowiedź idzie tam, gdzie wskazał serwer, a gdy serwer nie
// wie, pole „Do" jest puste i edytowalne - nic nie jest podstawiane po cichu.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { ReplyComposer } from './ReplyComposer';

const mutate = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../hooks/useComms', () => ({
    useMailSignature: () => ({ data: null }),
    useProofread: () => ({ mutate: vi.fn(), isPending: false }),
    useSendMail: () => ({ mutate, isPending: false }),
}));
// Edytor to contenteditable z własną logiką - tu wystarczy pole, które oddaje HTML.
vi.mock('./RichTextEditor', () => ({
    RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
        <textarea aria-label="Treść" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}));
vi.mock('./SignatureSettingsModal', () => ({ SignatureSettingsModal: () => null }));
// Przycisk szkicu ma własne testy (ReplyDraftButton.test.tsx) - tu oddaje gotowy szkic.
const draftFixture = {
    bodyText: 'Dzień dobry,\n\nzapraszamy na oględziny [proponowany termin].',
    useSentStyle: true,
    styleApplied: true,
    examples: [{ threadId: 't-9', subject: 'Korekta lakieru', sentAt: '2026-09-01T10:00:00Z', similarity: 0.82 }],
    placeholders: ['[proponowany termin]'],
    unverifiedAmounts: ['350 zł'],
    notice: null,
};
// „Popraw szkic" ma własne testy (ReplyDraftRevise.test.tsx) - tu pokazuje, jaką treść
// dostał z kompozytora, i oddaje poprawioną wersję.
vi.mock('./ReplyDraftRevise', () => ({
    ReplyDraftRevise: ({ currentText, onDraft }: { currentText: string; onDraft: (draft: typeof draftFixture) => void }) => (
        <button
            type="button"
            data-current-text={currentText}
            onClick={() => onDraft({ ...draftFixture, bodyText: 'Dzień dobry,\n\nzapraszamy we wtorek o 10:00.', placeholders: [] })}
        >
            Popraw szkic
        </button>
    ),
}));
vi.mock('./ReplyDraftButton', () => ({
    ReplyDraftButton: ({ onDraft }: { onDraft: (draft: typeof draftFixture) => void }) => (
        <button type="button" onClick={() => onDraft(draftFixture)}>Szkic AI</button>
    ),
}));

const renderComposer = (props: Parameters<typeof ReplyComposer>[0]) =>
    render(
        <ThemeProvider theme={theme}>
            <ReplyComposer {...props} />
        </ThemeProvider>
    );

const typeAndSend = () => {
    fireEvent.change(screen.getByLabelText('Treść'), { target: { value: '<p>Dzień dobry</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }));
};

describe('ReplyComposer - adresat odpowiedzi', () => {
    beforeEach(() => mutate.mockReset());

    it('odpowiedź na zgłoszenie z formularza idzie do klienta wskazanego przez serwer', () => {
        renderComposer({
            threadId: 'thread-1',
            initialTo: 'maciej-winkel@wp.pl',
            recipientLabel: 'Maciej',
            recipientHint: 'zgłoszenie z formularza - odpowiedź trafi prosto do klienta',
        });

        expect(screen.getByText(/Do: Maciej/)).toBeTruthy();
        expect(screen.getByText(/odpowiedź trafi prosto do klienta/)).toBeTruthy();

        typeAndSend();

        expect(mutate).toHaveBeenCalledTimes(1);
        expect(mutate.mock.calls[0][0]).toMatchObject({ threadId: 'thread-1', to: ['maciej-winkel@wp.pl'] });
    });

    it('gdy serwer nie zna klienta, pole „Do" jest puste, edytowalne i z ostrzeżeniem', () => {
        renderComposer({ threadId: 'thread-1', initialTo: '' });

        const input = screen.getByPlaceholderText('adres@klienta.pl') as HTMLInputElement;
        expect(input.value).toBe('');
        expect(input.disabled).toBe(false);
        expect(screen.getByText(/Nie wiemy, kto jest klientem/)).toBeTruthy();

        fireEvent.change(input, { target: { value: 'klient@gmail.com' } });
        typeAndSend();

        expect(mutate.mock.calls[0][0]).toMatchObject({ to: ['klient@gmail.com'] });
    });

    it('pierwsza wiadomość z leada bez wątku niesie jego id - serwer przypnie rozmowę', () => {
        renderComposer({ accountId: 'account-1', initialTo: 'pw.riffey@gmail.com', leadId: 'lead-7' });

        typeAndSend();

        expect(mutate.mock.calls[0][0]).toMatchObject({ leadId: 'lead-7', to: ['pw.riffey@gmail.com'] });
    });
});

describe('ReplyComposer - szkic AI', () => {
    beforeEach(() => mutate.mockReset());

    it('szkic trafia do edytora, a znacznik do uzupełnienia blokuje wysyłkę', () => {
        renderComposer({ threadId: 'thread-1', initialTo: 'klient@gmail.com' });

        fireEvent.click(screen.getByRole('button', { name: 'Szkic AI' }));

        const editor = screen.getByLabelText('Treść') as HTMLTextAreaElement;
        expect(editor.value).toContain('zapraszamy na oględziny [proponowany termin].');
        expect(screen.getByText(/na podstawie 1 wysłanej odpowiedzi/)).toBeTruthy();
        expect(screen.getByText(/Uzupełnij przed wysłaniem: \[proponowany termin\]/)).toBeTruthy();
        expect(screen.getByText(/Sprawdź kwoty, których nie ma w wycenie leada: 350 zł/)).toBeTruthy();

        const send = screen.getByRole('button', { name: /Wyślij/ }) as HTMLButtonElement;
        expect(send.disabled).toBe(true);
        fireEvent.click(send);
        expect(mutate).not.toHaveBeenCalled();
        // Blokady nie da się obejść schowaniem informacji o szkicu.
        expect(screen.queryByRole('button', { name: 'Ukryj informację o szkicu' })).toBeNull();
    });

    it('po uzupełnieniu znacznika wysyłka się odblokowuje', () => {
        renderComposer({ threadId: 'thread-1', initialTo: 'klient@gmail.com' });
        fireEvent.click(screen.getByRole('button', { name: 'Szkic AI' }));

        const editor = screen.getByLabelText('Treść') as HTMLTextAreaElement;
        fireEvent.change(editor, { target: { value: editor.value.replace('[proponowany termin]', 'we wtorek o 10:00') } });
        fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }));

        expect(mutate).toHaveBeenCalledTimes(1);
        expect(mutate.mock.calls[0][0].bodyHtml).toContain('we wtorek o 10:00');
    });

    it('szkic zastępujący napisaną treść można cofnąć', () => {
        renderComposer({ threadId: 'thread-1', initialTo: 'klient@gmail.com' });
        fireEvent.change(screen.getByLabelText('Treść'), { target: { value: '<div>Mój początek</div>' } });

        fireEvent.click(screen.getByRole('button', { name: 'Szkic AI' }));
        fireEvent.click(screen.getByRole('button', { name: /Cofnij/ }));

        expect((screen.getByLabelText('Treść') as HTMLTextAreaElement).value).toBe('<div>Mój początek</div>');
    });

    it('„Popraw szkic" dostaje treść z ręcznymi zmianami, a poprawioną wersję można cofnąć', () => {
        renderComposer({ threadId: 'thread-1', initialTo: 'klient@gmail.com' });
        fireEvent.click(screen.getByRole('button', { name: 'Szkic AI' }));

        const editor = screen.getByLabelText('Treść') as HTMLTextAreaElement;
        fireEvent.change(editor, { target: { value: editor.value.replace('Dzień dobry,', 'Dzień dobry Panie Janie,') } });
        const beforeRevision = editor.value;

        const revise = screen.getByRole('button', { name: 'Popraw szkic' });
        expect(revise.getAttribute('data-current-text')).toContain('Dzień dobry Panie Janie,');
        fireEvent.click(revise);

        expect(editor.value).toContain('zapraszamy we wtorek o 10:00.');
        // Poprawka nie ma już znaczników - wysyłka się odblokowuje.
        expect((screen.getByRole('button', { name: /Wyślij/ }) as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: /Cofnij/ }));
        expect(editor.value).toBe(beforeRevision);
    });

    it('nowa wiadomość bez wątku nie ma szkicu - nie ma na co odpowiadać', () => {
        renderComposer({ accountId: 'account-1', initialTo: 'klient@gmail.com', requireSubject: true });
        expect(screen.queryByRole('button', { name: 'Szkic AI' })).toBeNull();
    });
});
