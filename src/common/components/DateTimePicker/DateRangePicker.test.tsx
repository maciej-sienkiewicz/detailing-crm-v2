// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { DateRangePicker, type DateRangePickerProps } from './index';

/**
 * Jeden kalendarz dla pary „od” i „do”: kliknięcie dnia nie zamyka okna, drugie
 * kliknięcie ustawia koniec, zakres jest podświetlony, a zamyka dopiero „Gotowe”.
 * Wrzesień 2026 zaczyna się we wtorek, więc dni 2..30 są w siatce jednoznaczne.
 */
const renderPicker = (props: Partial<DateRangePickerProps> = {}) => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    const onBlur = vi.fn();
    render(
        <StyledThemeProvider theme={theme}>
            <DateRangePicker
                role="start"
                start="2026-09-10T14:00"
                end="2026-09-11T12:00"
                onStartChange={onStartChange}
                onEndChange={onEndChange}
                onBlur={onBlur}
                {...props}
            />
        </StyledThemeProvider>,
    );
    return { onStartChange, onEndChange, onBlur };
};

const day = (n: number) => screen.getByRole('button', { name: String(n) });
const done = () => screen.queryByRole('button', { name: 'Gotowe' });

describe('DateRangePicker', () => {
    it('pierwsze klikniecie ustawia poczatek i nie zamyka kalendarza, drugie ustawia koniec', async () => {
        const user = userEvent.setup();
        const { onStartChange, onEndChange, onBlur } = renderPicker();

        await user.click(screen.getByRole('button', { name: '10.09.2026, 14:00' }));
        expect(done()).not.toBeNull();
        expect(screen.getByText('Wybierz dzień rozpoczęcia')).toBeInTheDocument();

        await user.click(day(15));
        expect(onStartChange).toHaveBeenCalledWith('2026-09-15T14:00');
        // Koniec (11.09) został za nowym początkiem, więc idzie za nim z własną godziną.
        expect(onEndChange).toHaveBeenCalledWith('2026-09-15T15:00');
        expect(done()).not.toBeNull();
        expect(onBlur).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /^Do\b/ })).toHaveAttribute('aria-pressed', 'true');

        await user.click(day(20));
        expect(onEndChange).toHaveBeenLastCalledWith('2026-09-20T12:00');
        expect(onStartChange).toHaveBeenCalledTimes(1);
        expect(done()).not.toBeNull();

        await user.click(done()!);
        expect(done()).toBeNull();
        expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('podswietla zakres pasem miedzy poczatkiem a koncem', async () => {
        const user = userEvent.setup();
        renderPicker({ start: '2026-09-10T14:00', end: '2026-09-14T12:00' });

        await user.click(screen.getByRole('button', { name: '10.09.2026, 14:00' }));

        const bandOf = (n: number) => day(n).parentElement?.getAttribute('data-range') ?? null;
        expect(bandOf(9)).toBeNull();
        expect(bandOf(10)).toBe('start');
        expect(bandOf(11)).toBe('middle');
        expect(bandOf(13)).toBe('middle');
        expect(bandOf(14)).toBe('end');
        expect(bandOf(15)).toBeNull();
        expect(day(10)).toHaveAttribute('aria-pressed', 'true');
        expect(day(14)).toHaveAttribute('aria-pressed', 'true');
        expect(day(12)).toHaveAttribute('aria-pressed', 'false');
    });

    it('pole „do" otwiera ten sam kalendarz z aktywnym koncem, a dzien przed poczatkiem staje sie poczatkiem', async () => {
        const user = userEvent.setup();
        const { onStartChange, onEndChange } = renderPicker({ role: 'end' });

        await user.click(screen.getByRole('button', { name: '11.09.2026, 12:00' }));
        expect(screen.getByRole('button', { name: /^Do\b/ })).toHaveAttribute('aria-pressed', 'true');

        await user.click(day(5));
        expect(onStartChange).toHaveBeenCalledWith('2026-09-05T14:00');
        expect(onEndChange).not.toHaveBeenCalled();

        await user.click(day(18));
        expect(onEndChange).toHaveBeenCalledWith('2026-09-18T12:00');
    });

    it('koniec tego samego dnia z wczesniejsza godzina przesuwa sie godzine po poczatku', async () => {
        const user = userEvent.setup();
        const { onEndChange } = renderPicker({ role: 'end', start: '2026-09-10T14:00', end: '2026-09-12T09:00' });

        await user.click(screen.getByRole('button', { name: '12.09.2026, 09:00' }));
        await user.click(day(10));

        expect(onEndChange).toHaveBeenCalledWith('2026-09-10T15:00');
    });

    it('godzina zmienia tylko aktywny koniec zakresu', async () => {
        const user = userEvent.setup();
        const { onStartChange, onEndChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: '10.09.2026, 14:00' }));
        expect(screen.getByText('Godzina od')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Godzina do przodu' }));
        expect(onStartChange).toHaveBeenCalledWith('2026-09-10T15:00');
        expect(onEndChange).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: /^Do\b/ }));
        expect(screen.getByText('Godzina do')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: ':30' }));
        expect(onEndChange).toHaveBeenCalledWith('2026-09-11T12:30');
        expect(onStartChange).toHaveBeenCalledTimes(1);
    });

    it('koniec bez godziny jest oddawany jako sama data', async () => {
        const user = userEvent.setup();
        const { onEndChange } = renderPicker({ start: '2026-09-10T14:00', end: '2026-09-11T23:59:59', endHasTime: false });

        await user.click(screen.getByRole('button', { name: '10.09.2026, 14:00' }));
        await user.click(screen.getByRole('button', { name: /^Do\b/ }));
        expect(screen.getByText(/bez godziny/)).toBeInTheDocument();

        await user.click(day(16));
        expect(onEndChange).toHaveBeenCalledWith('2026-09-16');
    });
});
