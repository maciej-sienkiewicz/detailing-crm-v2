// @vitest-environment jsdom
//
// Pusta tablica: brak leadów, same leady z rezerwacją i szukanie bez wyników to trzy
// różne zdania. Dawniej wszystkie trzy były czterema pustymi kolumnami, a przy szukaniu
// kolumna mówiła „Nikt nie czeka na naszą odpowiedź", choć leady były.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BOARD_COLUMNS, boardEmptyKind } from '../../utils/leadBoard';
import { BoardEmpty } from './BoardEmpty';

afterEach(cleanup);

const state = (patch: Partial<Parameters<typeof boardEmptyKind>[0]> = {}) =>
    boardEmptyKind({ loading: false, dragging: false, onBoard: 0, openLeads: 0, query: '', ...patch });

describe('boardEmptyKind', () => {
    it('tablica z kartami, w trakcie ładowania albo przeciągania nie jest pusta', () => {
        expect(state({ onBoard: 1, openLeads: 1 })).toBeNull();
        expect(state({ loading: true })).toBeNull();
        expect(state({ dragging: true })).toBeNull();
    });

    it('szukanie bez wyników wygrywa z brakiem leadów - kolumny nie mówią wtedy „nikt nie czeka"', () => {
        expect(state({ openLeads: 5, query: 'zzzz' })).toBe('search');
        expect(state({ query: '   ' })).toBe('none');
    });

    it('otwarte leady bez kart na tablicy to leady z rezerwacją', () => {
        expect(state({ openLeads: 3 })).toBe('booked');
        expect(state()).toBe('none');
    });
});

describe('BoardEmpty', () => {
    const props = { phone: false, query: '', onClearQuery: vi.fn(), onList: vi.fn() };

    it('bez leadów pokazuje przepływ przez wszystkie kolumny i nic wypełnionego', () => {
        const { container } = render(<BoardEmpty kind="none" {...props} />);

        expect(screen.getByRole('heading', { name: 'Nie ma otwartych zapytań' })).toBeTruthy();
        for (const column of BOARD_COLUMNS) {
            expect(screen.getByText(column.title)).toBeTruthy();
            expect(screen.getByText(column.flow)).toBeTruthy();
        }
        expect(container.querySelector('[data-variant="primary"], [data-variant="success"]')).toBeNull();
    });

    it('szukanie bez wyników nazywa tekst i czyści szukanie', () => {
        const onClearQuery = vi.fn();
        render(<BoardEmpty kind="search" {...props} query=" zzzz " onClearQuery={onClearQuery} />);

        expect(screen.getByRole('heading', { name: 'Nic nie pasuje do „zzzz”' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Wyczyść szukanie' }));
        expect(onClearQuery).toHaveBeenCalledOnce();
    });

    it('same leady z rezerwacją prowadzą do listy', () => {
        const onList = vi.fn();
        render(<BoardEmpty kind="booked" {...props} onList={onList} />);

        fireEvent.click(screen.getByRole('button', { name: 'Pokaż listę' }));
        expect(onList).toHaveBeenCalledOnce();
    });
});
