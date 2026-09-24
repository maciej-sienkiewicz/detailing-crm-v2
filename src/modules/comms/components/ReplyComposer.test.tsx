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
