// @vitest-environment jsdom
//
// Rezerwacja z minionego dnia: auto mogło stać u nas od terminu (nikt nie kliknął
// przyjęcia) albo klient przyjechał dopiero dziś. Okno nie wybiera za użytkownika
// i oddaje kreatorowi dokładnie tę datę, którą wskazał.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ArrivalDateModal } from './ArrivalDateModal';

const NOW = new Date(2026, 9, 17, 11, 42);
const PLANNED = new Date(2026, 9, 13, 9, 0).toISOString();

const renderModal = (onConfirm = vi.fn(), onBack = vi.fn(), plannedStart = PLANNED) => {
    render(
        <ThemeProvider theme={theme}>
            <ArrivalDateModal plannedStart={plannedStart} vehicleLabel="BMW X5, WA 12345" onConfirm={onConfirm} onBack={onBack} now={NOW} />
        </ThemeProvider>,
    );
    return { onConfirm, onBack };
};

const confirmButton = () => screen.getByRole('button', { name: 'Przejdź do przyjęcia' });

afterEach(cleanup);

describe('ArrivalDateModal', () => {
    it('mówi, na kiedy była rezerwacja i jak dawno', () => {
        renderModal();
        expect(screen.getByText(/wtorek, 13 października, 09:00/)).toBeTruthy();
        expect(screen.getByText(/4 dni temu/)).toBeTruthy();
    });

    it('nie zaznacza niczego z góry - bez odpowiedzi nie da się przejść dalej', () => {
        renderModal();
        expect(screen.getAllByRole('radio').some(r => (r as HTMLInputElement).checked)).toBe(false);
        expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('„Od dnia rezerwacji" zostawia termin rezerwacji', () => {
        const { onConfirm } = renderModal();
        fireEvent.click(screen.getByText(/Od dnia rezerwacji/));
        fireEvent.click(confirmButton());
        expect(onConfirm).toHaveBeenCalledWith('2026-10-13T09:00');
    });

    it('„Od dziś" wpisuje bieżącą chwilę', () => {
        const { onConfirm } = renderModal();
        fireEvent.click(screen.getByText(/Od dziś/));
        fireEvent.click(confirmButton());
        expect(onConfirm).toHaveBeenCalledWith('2026-10-17T11:42');
    });

    it('rozpoczęcie z innego miesiąca ostrzega, do którego miesiąca pójdzie przychód', () => {
        renderModal(vi.fn(), vi.fn(), new Date(2026, 8, 29, 9, 0).toISOString());
        expect(screen.queryByText(/zaliczy się do miesiąca/)).toBeNull();
        fireEvent.click(screen.getByText(/Od dnia rezerwacji/));
        expect(screen.getByText(/zaliczy się do miesiąca wrzesień 2026/)).toBeTruthy();
    });

    it('„Wróć" wychodzi z przyjęcia bez odpowiedzi', () => {
        const { onConfirm, onBack } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Wróć' }));
        expect(onBack).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
