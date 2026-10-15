// @vitest-environment jsdom
//
// Zgłoszenie biznesu: na telefonie dzień z wizytami schowanymi pod „+N" po dotknięciu
// zakładał nową rezerwację, zamiast pokazać, co już na nim stoi. Arkusz dnia pokazuje
// wizyty jak widok Lista, a nowa rezerwacja jest w nim krokiem następnym.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { scrollLockCount } from '@/common/utils/scrollLock';
import { DayEventsSheet, type DayEventsSheetProps } from './DayEventsSheet';
import type { AppointmentEventData, CalendarEvent } from '../types';

const reservation = (id: string, title: string, start: string, end: string): CalendarEvent => ({
    id,
    title,
    start,
    end,
    allDay: false,
    backgroundColor: '#6366f1',
    borderColor: 'transparent',
    textColor: '#ffffff',
    extendedProps: { id, type: 'APPOINTMENT', status: 'CREATED' } as AppointmentEventData,
});

const EVENTS = [
    reservation('b', 'Anna Nowak', '2026-10-15T12:00:00', '2026-10-15T14:00:00'),
    reservation('a', 'Jan Kowalski', '2026-10-15T08:00:00', '2026-10-15T10:00:00'),
];

const props = (overrides: Partial<DayEventsSheetProps> = {}): DayEventsSheetProps => ({
    date: new Date(2026, 9, 15),
    events: EVENTS,
    onClose: () => {},
    onEventClick: () => {},
    onAddClick: () => {},
    ...overrides,
});

const renderSheet = (p: DayEventsSheetProps) => render(
    <ThemeProvider theme={theme}><DayEventsSheet {...p} /></ThemeProvider>,
);

afterEach(cleanup);

describe('DayEventsSheet - lista dnia z siatki miesiąca', () => {
    it('pokazuje wszystkie wizyty dnia po godzinie, a nie w kolejności z API', () => {
        renderSheet(props());
        const names = screen.getAllByText(/Kowalski|Nowak/).map(el => el.textContent);
        expect(names).toEqual(['Jan Kowalski', 'Anna Nowak']);
    });

    it('„Nowa rezerwacja" jest jedynym wypełnionym przyciskiem i woła tworzenie', () => {
        const onAddClick = vi.fn();
        const { container } = renderSheet(props({ onAddClick }));
        expect(container.ownerDocument.querySelectorAll('[data-variant="primary"], [data-variant="success"]'))
            .toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: /Nowa rezerwacja/ }));
        expect(onAddClick).toHaveBeenCalledTimes(1);
    });

    it('bez prawa do tworzenia wizyt nie obiecuje nowej rezerwacji', () => {
        renderSheet(props({ onAddClick: undefined }));
        expect(screen.queryByRole('button', { name: /Nowa rezerwacja/ })).toBeNull();
    });

    it('dotknięcie wizyty otwiera jej podgląd', () => {
        const onEventClick = vi.fn();
        renderSheet(props({ onEventClick }));
        fireEvent.click(screen.getByText('Anna Nowak'));
        expect(onEventClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'b' }),
            expect.any(Object),
        );
    });

    it('blokuje przewijanie tła i zwalnia blokadę po zamknięciu', () => {
        const before = scrollLockCount();
        const { unmount } = renderSheet(props());
        expect(scrollLockCount()).toBe(before + 1);
        unmount();
        expect(scrollLockCount()).toBe(before);
    });

    it('Escape zamyka arkusz', () => {
        const onClose = vi.fn();
        renderSheet(props({ onClose }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('DayEventsSheet - pod podglądem wizyty', () => {
    it('Escape zamyka tylko podgląd na wierzchu, lista dnia zostaje', () => {
        const onClose = vi.fn();
        renderSheet(props({ onClose, closeOnEscape: false }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });
});
