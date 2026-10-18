// @vitest-environment jsdom
//
// Pasek rezerwacji: termin, kto i kiedy założył, los SMS-a i delikatny przycisk szkicu.
// Przy rezerwacji usuniętej - bez przycisku i bez zdania o SMS-ie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { LeadBooking } from '../types';
import { BookingNote } from './BookingNote';

afterEach(cleanup);

const booking = (patch: Partial<LeadBooking> = {}): LeadBooking => ({
    appointmentId: 'a1',
    bookedAt: new Date(2026, 9, 18, 12, 30).toISOString(),
    bookedByName: 'Jakub Bartłomiejczak',
    start: new Date(2026, 10, 2, 9, 0).toISOString(),
    end: new Date(2026, 10, 2, 13, 0).toISOString(),
    allDay: false,
    status: 'CREATED',
    services: [],
    confirmationSms: { status: 'NOT_SENT', at: null, reason: 'AUTOMATION_OFF' },
    ...patch,
});

describe('BookingNote', () => {
    it('mówi, na kiedy, kto założył i że klient nie dostał SMS-a', () => {
        const prepare = vi.fn();
        render(<BookingNote booking={booking()} onPrepareConfirmation={prepare} />);

        expect(screen.getByText('Rezerwacja na poniedziałek, 2 listopada, 09:00')).toBeTruthy();
        expect(screen.getByText('Założono 18 października, 12:30')).toBeTruthy();
        expect(screen.getByText('Przez: Jakub Bartłomiejczak')).toBeTruthy();
        expect(screen.getByText(/automatyczne potwierdzenia są wyłączone/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Przygotuj treść wiadomości z potwierdzeniem rezerwacji' }));
        expect(prepare).toHaveBeenCalledOnce();
    });

    it('usunięta rezerwacja zostaje w historii, ale bez szkicu potwierdzenia', () => {
        render(<BookingNote booking={booking({ status: 'DELETED' })} onPrepareConfirmation={vi.fn()} />);

        expect(screen.getByText(/Rezerwacja usunięta z kalendarza/)).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByText(/SMS/)).toBeNull();
    });

    it('bez kompozytora maila nie ma przycisku szkicu', () => {
        render(<BookingNote booking={booking()} />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
