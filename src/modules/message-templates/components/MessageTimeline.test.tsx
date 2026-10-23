// @vitest-environment jsdom
//
// Oś wiadomości: karta pokazuje to, co klient przeczyta, z wartościami wstawianymi przez
// system wyróżnionymi; wiadomość wyłączona mówi, że klient nic nie dostaje, i ma jedną
// akcję, która ją włącza; kanał włączony bez treści nie udaje, że coś wyśle.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { MessageTimeline } from './MessageTimeline';
import type { TemplatesDraft } from '../types';

const draft = {
    bookingConfirmation: { sms: { enabled: true, body: 'Cześć {{imie}}! Termin: {{data}} o {{godzina}}.' } },
    rescheduleConfirmation: { sms: { enabled: false, body: 'Nowy termin {{data}}.' } },
    reservationCardLink: {
        sms: { enabled: true, body: '' },
        email: { enabled: true, subject: 'Wizyta {{data}}', body: '\nDzień dobry, {{imie}}.\nDruga linijka.' },
    },
} as unknown as TemplatesDraft;

const shown = new Set(['bookingConfirmation', 'rescheduleConfirmation', 'reservationCardLink']);

const renderTimeline = (props: Partial<Parameters<typeof MessageTimeline>[0]> = {}) => {
    const handlers = { onOpen: vi.fn(), onToggle: vi.fn(), onEnable: vi.fn() };
    render(
        <ThemeProvider theme={theme}>
            <MessageTimeline
                draft={draft}
                matches={spec => shown.has(spec.key)}
                {...handlers}
                {...props}
            />
        </ThemeProvider>,
    );
    return handlers;
};

const card = (name: string) => screen.getByRole('article', { name });

afterEach(() => cleanup());

describe('MessageTimeline', () => {
    it('grupuje wiadomości pod etapem wizyty', () => {
        renderTimeline();
        expect(screen.getByRole('heading', { level: 4, name: 'Rezerwacja' })).toBeTruthy();
        expect(screen.queryByRole('heading', { level: 4, name: 'Odbiór' })).toBeNull();
    });

    it('SMS pokazuje treść z przykładowymi danymi, a wstawione wartości są wyróżnione', () => {
        renderTimeline();
        const bubble = within(card('Potwierdzenie rezerwacji')).getByLabelText('Podgląd SMS-a');
        expect(bubble.textContent).toBe('Cześć Jan! Termin: 15.06.2026 o 14:30.');
        const marked = Array.from(bubble.querySelectorAll('mark')).map(el => el.textContent);
        expect(marked).toEqual(['Jan', '15.06.2026', '14:30']);
    });

    it('wiadomość wyłączona mówi, że klient nic nie dostaje, i włącza się jedną akcją', async () => {
        const { onEnable } = renderTimeline();
        const off = card('Zmiana terminu');
        expect(within(off).getByText('Wyłączona. Klient nic nie dostaje.')).toBeTruthy();
        expect(within(off).queryByLabelText('Podgląd SMS-a')).toBeNull();

        await userEvent.click(within(off).getByRole('button', { name: 'Włącz i wybierz treść' }));
        expect(onEnable).toHaveBeenCalledWith('rescheduleConfirmation');
    });

    it('kanał włączony bez treści ostrzega, a e-mail pokazuje temat i pierwszą linijkę', () => {
        renderTimeline();
        const link = card('Link do Karty rezerwacji');
        expect(within(link).getByText(/SMS jest włączony, ale nie ma treści/)).toBeTruthy();
        const email = within(link).getByLabelText('Podgląd e-maila');
        expect(within(email).getByText('Wizyta 15.06.2026')).toBeTruthy();
        expect(within(email).getByText('Dzień dobry, Jan.')).toBeTruthy();
    });

    it('chip kanału przełącza kanał bez otwierania edytora', async () => {
        const { onToggle, onOpen } = renderTimeline();
        await userEvent.click(within(card('Potwierdzenie rezerwacji')).getByRole('button', { name: 'SMS' }));
        expect(onToggle).toHaveBeenCalledWith('bookingConfirmation', 'sms');
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('bez pasujących wiadomości mówi to zdaniem', () => {
        renderTimeline({ matches: () => false });
        expect(screen.getByText('Żadna wiadomość nie pasuje do wyszukiwania.')).toBeTruthy();
    });
});
