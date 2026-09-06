// @vitest-environment jsdom
//
// Pole „Wyślij SMS-a z podziękowaniem" na ekranie wydania pojazdu.
//
// Rzecz, o którą tu chodzi, jest jedna: pracownik ma widzieć i móc zmienić godzinę,
// o której klient dostanie wiadomość. Wcześniej godziny nie było - podziękowanie szło
// tyle-a-tyle minut po zamknięciu wizyty w systemie, więc o porze wysyłki decydowało
// to, kiedy komuś starczyło czasu na domknięcie papierów.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { ThankYouSmsSection } from './ThankYouSmsSection';
import { theme } from '@/common/theme';

const setup = (props: Partial<React.ComponentProps<typeof ThankYouSmsSection>> = {}) => {
    const onEnabledChange = vi.fn();
    const onSendAtChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <ThankYouSmsSection
                enabled
                onEnabledChange={onEnabledChange}
                sendAt="2026-09-15T15:15"
                onSendAtChange={onSendAtChange}
                {...props}
            />
        </ThemeProvider>
    );
    return { onEnabledChange, onSendAtChange };
};

const whenField = () => screen.queryByLabelText('Data i godzina wysyłki');

describe('ThankYouSmsSection', () => {
    it('pokazuje godzinę wysyłki, gdy podziękowanie jest zaznaczone', () => {
        setup();

        expect(whenField()).toHaveValue('2026-09-15T15:15');
    });

    it('chowa godzinę, gdy podziękowania nie wysyłamy', () => {
        // Pole daty bez wysyłki to pytanie bez konsekwencji.
        setup({ enabled: false });

        expect(whenField()).not.toBeInTheDocument();
    });

    it('mówi wprost, w jakich godzinach wysyłamy', () => {
        setup();

        expect(screen.getByText(/12:00-18:00/)).toBeInTheDocument();
    });

    it('odznaczenie zgłasza rezygnację, a nie zmianę godziny', async () => {
        const { onEnabledChange, onSendAtChange } = setup();

        await userEvent.click(screen.getByLabelText('Wyślij SMS-a z podziękowaniem'));

        expect(onEnabledChange).toHaveBeenCalledWith(false);
        expect(onSendAtChange).not.toHaveBeenCalled();
    });

    it('zmiana godziny wraca do rodzica jako wartość pola', () => {
        const { onSendAtChange } = setup();

        fireEvent.change(whenField()!, { target: { value: '2026-09-15T16:30' } });

        expect(onSendAtChange).toHaveBeenCalledWith('2026-09-15T16:30');
    });

    // ── Godzina spoza okna ───────────────────────────────────────────────────

    it('godzina spoza okna nie jest po cichu podmieniana, tylko wyjaśniona', () => {
        // Skok wartości pod palcami wygląda jak błąd formularza; blokada zapisu
        // zatrzymywałaby wydanie pojazdu z powodu SMS-a. Zostaje trzecia droga:
        // powiedzieć, o której ta wiadomość naprawdę wyjdzie.
        setup({ sendAt: '2026-09-15T22:00' });

        expect(whenField()).toHaveValue('2026-09-15T22:00');
        expect(screen.getByText(/Poza godzinami wysyłki/)).toBeInTheDocument();
        expect(screen.getByText(/16\.09/)).toBeInTheDocument();
    });

    it('godzina w oknie nie wywołuje ostrzeżenia', () => {
        setup({ sendAt: '2026-09-15T16:30' });

        expect(screen.queryByText(/Poza godzinami wysyłki/)).not.toBeInTheDocument();
    });
});
