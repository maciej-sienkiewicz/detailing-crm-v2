// @vitest-environment jsdom
//
// Pytanie o datę wydania słowami biznesu (05.11.2026): trzy odpowiedzi, a przy „Z inną
// datą" kalendarz ograniczony do dni od rozpoczęcia wizyty do dziś.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { HandoverDateSection } from './HandoverDateSection';
import type { HandoverDateState } from './handoverDate';

afterEach(cleanup);

const renderSection = (value: HandoverDateState, onChange = vi.fn(), problems = [] as { section: 'handoverDate'; message: string }[]) => {
    render(
        <ThemeProvider theme={theme}>
            <HandoverDateSection
                value={value}
                onChange={onChange}
                planned="2026-11-02"
                today="2026-11-05"
                earliest="2026-10-30"
                problems={problems}
            />
        </ThemeProvider>
    );
    return onChange;
};

describe('pytanie o datę wydania', () => {
    it('mówi, co się dzieje, i daje trzy odpowiedzi z dniami', () => {
        renderSection({ choice: null, other: '' });

        expect(screen.getByText('Wydajesz pojazd po planowanej dacie zakończenia wizyty.')).toBeTruthy();
        expect(screen.getByText(/Z jaką datą chcesz zakończyć wizytę\?/)).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Zgodnie z planowaną datą/ })).toBeTruthy();
        expect(screen.getByText('2 listopada 2026')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Z datą dzisiejszą/ })).toBeTruthy();
        expect(screen.getByText('5 listopada 2026')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Z inną datą/ })).toBeTruthy();
        // Kalendarz dopiero po wyborze „Z inną datą”.
        expect(screen.queryByLabelText('Dzień wydania')).toBeNull();
    });

    it('wybór odpowiedzi idzie do stanu', () => {
        const onChange = renderSection({ choice: null, other: '' });

        fireEvent.click(screen.getByRole('radio', { name: /Zgodnie z planowaną datą/ }));
        expect(onChange).toHaveBeenLastCalledWith({ choice: 'PLANNED', other: '' });
        fireEvent.click(screen.getByRole('radio', { name: /Z datą dzisiejszą/ }));
        expect(onChange).toHaveBeenLastCalledWith({ choice: 'TODAY', other: '' });
    });

    it('„Z inną datą” pokazuje kalendarz od rozpoczęcia wizyty do dziś', () => {
        const onChange = renderSection({ choice: 'OTHER', other: '' });

        const input = screen.getByLabelText('Dzień wydania') as HTMLInputElement;
        expect(input.min).toBe('2026-10-30');
        expect(input.max).toBe('2026-11-05');
        fireEvent.change(input, { target: { value: '2026-11-03' } });
        expect(onChange).toHaveBeenLastCalledWith({ choice: 'OTHER', other: '2026-11-03' });
    });

    it('brak stoi przy pytaniu', () => {
        renderSection({ choice: null, other: '' }, vi.fn(), [{ section: 'handoverDate', message: 'Wybierz, z jaką datą zakończyć wizytę.' }]);

        expect(screen.getByText('Wybierz, z jaką datą zakończyć wizytę.')).toBeTruthy();
    });
});
