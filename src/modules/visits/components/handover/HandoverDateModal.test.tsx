// @vitest-environment jsdom
//
// Okno przed wydaniem (decyzja biznesu z 05.11.2026): po „Wydaj pojazd”, gdy dziś jest po
// dniu planowanego zakończenia, najpierw pytanie o datę, a „Dalej” dopiero z odpowiedzią.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { HandoverDateModal } from './HandoverDateModal';
import type { HandoverDateState } from './handoverDate';
import type { Visit } from '../../types';

const visit = {
    id: 'v-1',
    scheduledDate: '2026-10-30T08:00:00Z',
    estimatedCompletionDate: '2026-11-02T14:00:00Z',
    vehicle: { brand: 'Tesla', model: 'Model 3', licensePlate: 'WL9NP14' },
    customer: { firstName: 'Maciej', lastName: 'Krajewski' },
} as unknown as Visit;

const renderModal = (initial?: HandoverDateState | null) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <HandoverDateModal visit={visit} isOpen initial={initial} onClose={onClose} onConfirm={onConfirm} />
        </ThemeProvider>
    );
    return { onConfirm, onClose, next: () => screen.getByRole('button', { name: /Dalej/ }) as HTMLButtonElement };
};

describe('okno daty wydania', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 5, 16, 30));
    });
    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('jest osobnym oknem wydania z pytaniem i trzema odpowiedziami', () => {
        renderModal();

        expect(screen.getByText('Wydanie pojazdu')).toBeTruthy();
        expect(screen.getByText('Tesla Model 3, WL9NP14, Maciej Krajewski')).toBeTruthy();
        expect(screen.getByText('Wydajesz pojazd po planowanej dacie zakończenia wizyty.')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Zgodnie z planowaną datą/ })).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Z datą dzisiejszą/ })).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Z inną datą/ })).toBeTruthy();
    });

    it('„Dalej” czeka na odpowiedź, bez czerwonego komunikatu na start', () => {
        const { next, onConfirm } = renderModal();

        expect(next().disabled).toBe(true);
        expect(screen.queryByText('Wybierz, z jaką datą zakończyć wizytę.')).toBeNull();

        fireEvent.click(screen.getByRole('radio', { name: /Zgodnie z planowaną datą/ }));
        expect(next().disabled).toBe(false);
        fireEvent.click(next());
        expect(onConfirm).toHaveBeenCalledWith({ choice: 'PLANNED', other: '' });
    });

    it('„Z inną datą” w przyszłości mówi dlaczego i nie puszcza dalej', () => {
        const { next, onConfirm } = renderModal();

        fireEvent.click(screen.getByRole('radio', { name: /Z inną datą/ }));
        expect(next().disabled).toBe(true);
        // Kalendarz od dnia wizyty z kalendarza do dziś.
        const input = screen.getByLabelText('Dzień wydania') as HTMLInputElement;
        expect(input.min).toBe('2026-10-30');
        expect(input.max).toBe('2026-11-05');
        fireEvent.change(screen.getByLabelText('Dzień wydania'), { target: { value: '2026-11-06' } });
        expect(screen.getByText('Data wydania nie może być w przyszłości.')).toBeTruthy();
        expect(next().disabled).toBe(true);

        fireEvent.change(screen.getByLabelText('Dzień wydania'), { target: { value: '2026-11-03' } });
        fireEvent.click(next());
        expect(onConfirm).toHaveBeenCalledWith({ choice: 'OTHER', other: '2026-11-03' });
    });

    it('po „Zmień datę” wraca z poprzednią odpowiedzią, a „Anuluj” zamyka', () => {
        const { next, onClose } = renderModal({ choice: 'OTHER', other: '2026-11-03' });

        expect((screen.getByRole('radio', { name: /Z inną datą/ }) as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText('Dzień wydania') as HTMLInputElement).value).toBe('2026-11-03');
        expect(next().disabled).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onClose).toHaveBeenCalled();
    });
});
