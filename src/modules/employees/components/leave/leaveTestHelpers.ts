// Pomocniki testów okien urlopowych (nie są testem - vitest ich nie uruchamia).
//
// Termin wybiera się tym samym kalendarzem co przy rezerwacji: pole „Od" otwiera
// jeden kalendarz dla obu końców, pierwsze kliknięcie w dzień to początek, drugie -
// koniec. Testy klikają dokładnie tak, jak człowiek, zamiast wpisywać daty w pola.

import { fireEvent, screen, within } from '@testing-library/react';

/** Zakres w bieżącym miesiącu kalendarza (dni muszą być w nim jednoznaczne). */
export async function pickRange(scope: HTMLElement, fromDay: number, toDay: number) {
    fireEvent.click(within(scope).getByRole('button', { name: /^Od\b/ }));
    const calendar = await screen.findByRole('dialog', { name: 'Wybór zakresu dat' });
    fireEvent.click(within(calendar).getByRole('button', { name: String(fromDay) }));
    fireEvent.click(within(calendar).getByRole('button', { name: String(toDay) }));
    fireEvent.click(within(calendar).getByRole('button', { name: 'Gotowe' }));
}

/** Wypełnione elementy (krok następny) w oknie - CLAUDE.md §2 pozwala na jeden. */
export const filledIn = (root: HTMLElement) =>
    root.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
