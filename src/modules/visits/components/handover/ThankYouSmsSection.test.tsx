// @vitest-environment jsdom
//
// Pole „Wyślij SMS-a z podziękowaniem" na ekranie wydania pojazdu.
//
// Do wyboru jest jedna rzecz: wysyłamy albo nie. Godziny nie ma i nie ma jej celowo -
// wyznacza ją backend (kwadrans po wydaniu, dociągnięte do okna 12:00-18:00), bo
// przeglądarka nie zna ani jego zegara, ani strefy studia. Wcześniej stało tu pole
// „Data i godzina wysyłki", które pytało człowieka przy ladzie o coś, na co odpowiedź
// jest zawsze ta sama, i pozwalało ustawić podziękowanie na przyszły wtorek.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { ThankYouSmsSection } from './ThankYouSmsSection';
import { theme } from '@/common/theme';

const setup = (props: Partial<React.ComponentProps<typeof ThankYouSmsSection>> = {}) => {
    const onEnabledChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <ThankYouSmsSection enabled onEnabledChange={onEnabledChange} {...props} />
        </ThemeProvider>
    );
    return { onEnabledChange };
};

describe('ThankYouSmsSection', () => {
    it('mówi wprost, w jakich godzinach wysyłamy', () => {
        setup();

        expect(screen.getByText(/12:00-18:00/)).toBeInTheDocument();
    });

    it('nie pyta o datę ani godzinę wysyłki', () => {
        setup();

        expect(screen.queryByLabelText(/Data i godzina/)).not.toBeInTheDocument();
        expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
    });

    it('odznaczenie zgłasza rezygnację', async () => {
        const { onEnabledChange } = setup();

        await userEvent.click(screen.getByLabelText('Wyślij SMS-a z podziękowaniem'));

        expect(onEnabledChange).toHaveBeenCalledWith(false);
    });

    it('zaznaczenie wyłączonego podziękowania wraca jako zgoda', async () => {
        const { onEnabledChange } = setup({ enabled: false });

        await userEvent.click(screen.getByLabelText('Wyślij SMS-a z podziękowaniem'));

        expect(onEnabledChange).toHaveBeenCalledWith(true);
    });
});
