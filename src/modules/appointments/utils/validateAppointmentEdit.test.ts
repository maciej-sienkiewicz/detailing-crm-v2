import { describe, expect, it } from 'vitest';
import type { CheckInFormData } from '@/modules/checkin/types';
import { validateAppointmentEdit } from './validateAppointmentEdit';

const form = (over: Partial<CheckInFormData> = {}): CheckInFormData => ({
    customerData: { id: 'c1', firstName: 'Jan', lastName: 'Kowalski', phone: '', email: '' },
    hasFullCustomerData: true,
    isNewCustomer: false,
    vehicleData: null,
    services: [{ id: 's1' }] as unknown as CheckInFormData['services'],
    appointmentColorId: 'color-1',
    visitStartAt: '2026-10-24T10:00',
    visitEndAt: '2026-10-24T12:00',
    ...over,
} as CheckInFormData);

describe('walidacja edycji rezerwacji', () => {
    it('poprawna rezerwacja - bez pojazdu i bez kontaktu u klienta z kartoteki', () => {
        expect(validateAppointmentEdit(form())).toEqual({});
    });

    it('brak usług, koloru i koniec przed początkiem', () => {
        expect(validateAppointmentEdit(form({ services: [], appointmentColorId: '', visitEndAt: '2026-10-24T09:00' }))).toEqual({
            services: 'Dodaj przynajmniej jedną usługę',
            color: 'Wybierz kolor rezerwacji',
            schedule: 'Koniec rezerwacji musi być po jej początku',
        });
    });

    it('nowy klient potrzebuje telefonu albo e-maila, zagraniczny numer przechodzi', () => {
        const fresh = { id: '', firstName: 'Anna', lastName: 'Nowak', phone: '', email: '' };
        expect(validateAppointmentEdit(form({ isNewCustomer: true, customerData: fresh }))).toEqual({ contact: 'Podaj e-mail lub numer telefonu' });
        expect(validateAppointmentEdit(form({ isNewCustomer: true, customerData: { ...fresh, phone: '+44 7700 900123' } }))).toEqual({});
    });
});
