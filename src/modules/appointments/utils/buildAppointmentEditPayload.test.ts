// src/modules/appointments/utils/buildAppointmentEditPayload.test.ts
//
// Asserts the exact wire contract AppointmentEditView sends to
// PUT /v1/appointments/{id} for every editable field, matching what
// UpdateAppointmentHandler (backend) reads from UpdateAppointmentRequest.
// See UpdateAppointmentHandlerPersistenceTest (backend) for the matching
// real-Postgres proof that each of these fields is actually persisted.

import { describe, expect, it } from 'vitest';
import { buildAppointmentEditPayload, mapTechnicalNotesToPayload } from './buildAppointmentEditPayload';
import type { CheckInFormData } from '@/modules/checkin/types';

const baseFormData = (): CheckInFormData => ({
    title: 'Mycie + wosk',
    customerData: {
        id: 'customer-1',
        firstName: 'Jan',
        lastName: 'Kowalski',
        phone: '600100200',
        email: 'jan@example.com',
    },
    hasFullCustomerData: true,
    isNewCustomer: false,
    vehicleData: {
        id: 'vehicle-1',
        brand: 'Audi',
        model: 'A4',
        yearOfProduction: 2019,
        licensePlate: 'WA12345',
        color: 'czarny',
    },
    isNewVehicle: false,
    vehicleHandoff: {
        isHandedOffByOtherPerson: false,
        contactPerson: { firstName: '', lastName: '', phone: '', email: '' },
    },
    homeAddress: null,
    company: null,
    technicalState: {
        mileage: 0,
        deposit: { keys: false, registrationDocument: false, other: false },
        inspectionNotes: '',
        protocolNotes: '',
    },
    note: '',
    visitStartAt: '2026-01-10T10:00',
    visitEndAt: '2026-01-10T12:00',
    isAllDay: false,
    photos: [],
    damagePoints: [],
    services: [
        {
            id: 'line-1',
            serviceId: 'service-1',
            serviceName: 'Mycie',
            basePriceNet: 10000,
            vatRate: 23,
            adjustment: { type: 'PERCENT', value: 0 },
            requireManualPrice: false,
        },
    ],
    appointmentColorId: 'color-1',
    doorToDoor: undefined,
});

describe('buildAppointmentEditPayload', () => {
    it('mapuje harmonogram na Instanty (UTC ISO z Z)', () => {
        const payload = buildAppointmentEditPayload(baseFormData())!;
        expect(payload.schedule.startDateTime).toMatch(/Z$/);
        expect(payload.schedule.endDateTime).toMatch(/Z$/);
        expect(payload.schedule.isAllDay).toBe(false);
    });

    it('isAllDay=true przenosi się wprost do payloadu', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), isAllDay: true })!;
        expect(payload.schedule.isAllDay).toBe(true);
    });

    it('zwraca null, gdy daty wizyty są puste lub niepoprawne', () => {
        expect(buildAppointmentEditPayload({ ...baseFormData(), visitStartAt: '' })).toBeNull();
        expect(buildAppointmentEditPayload({ ...baseFormData(), visitStartAt: 'nie-data' })).toBeNull();
    });

    it('zwraca null, gdy nie ma żadnej usługi', () => {
        expect(buildAppointmentEditPayload({ ...baseFormData(), services: [] })).toBeNull();
    });

    it('zwraca null, gdy brak koloru rezerwacji', () => {
        expect(buildAppointmentEditPayload({ ...baseFormData(), appointmentColorId: '' })).toBeNull();
    });

    it('appointmentTitle i appointmentColorId trafiają wprost do payloadu', () => {
        const payload = buildAppointmentEditPayload(baseFormData())!;
        expect(payload.appointmentTitle).toBe('Mycie + wosk');
        expect(payload.appointmentColorId).toBe('color-1');
    });

    it('pusty tytuł zamienia się na undefined, nie na pusty string', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), title: '' })!;
        expect(payload.appointmentTitle).toBeUndefined();
    });

    // ── customer ────────────────────────────────────────────────────────────

    it('customer EXISTING, gdy klient nie jest nowy i nie ma id do aktualizacji (brak id)', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            customerData: { ...baseFormData().customerData, id: '' },
        })!;
        expect(payload.customer).toEqual({ mode: 'EXISTING', id: '' });
    });

    it('customer UPDATE wysyła zmienione dane istniejącego klienta', () => {
        const payload = buildAppointmentEditPayload(baseFormData())!;
        expect(payload.customer).toEqual({
            mode: 'UPDATE',
            id: 'customer-1',
            updateData: {
                firstName: 'Jan',
                lastName: 'Kowalski',
                phone: '600100200',
                email: 'jan@example.com',
                company: undefined,
            },
        });
    });

    it('customer UPDATE dołącza dane firmy sklejone w jeden adres', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            company: {
                name: 'Detailing Sp. z o.o.',
                nip: '1234567890',
                regon: '123456785',
                address: { street: 'Polna 1', city: 'Warszawa', postalCode: '00-001', country: 'PL' },
            },
        })!;
        expect(payload.customer).toMatchObject({
            mode: 'UPDATE',
            updateData: {
                company: {
                    name: 'Detailing Sp. z o.o.',
                    nip: '1234567890',
                    regon: '123456785',
                    address: 'Polna 1, 00-001 Warszawa',
                },
            },
        });
    });

    it('customer NEW wysyła nowego klienta, gdy isNewCustomer=true', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), isNewCustomer: true })!;
        expect(payload.customer).toEqual({
            mode: 'NEW',
            newData: {
                firstName: 'Jan',
                lastName: 'Kowalski',
                phone: '600100200',
                email: 'jan@example.com',
                company: undefined,
            },
        });
    });

    // ── vehicle ─────────────────────────────────────────────────────────────

    it('vehicle NONE, gdy formData.vehicleData jest null', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), vehicleData: null })!;
        expect(payload.vehicle).toEqual({ mode: 'NONE' });
    });

    it('vehicle UPDATE wysyła "year" (nie "yearOfProduction") - kontrakt z backendem', () => {
        const payload = buildAppointmentEditPayload(baseFormData())!;
        expect(payload.vehicle).toEqual({
            mode: 'UPDATE',
            id: 'vehicle-1',
            updateData: {
                brand: 'Audi',
                model: 'A4',
                year: 2019,
                licensePlate: 'WA12345',
                color: 'czarny',
            },
        });
        // Regresja: backendowe NewVehicleDataRequest/VehicleIdentity.Update.year nie mają
        // aliasu na "yearOfProduction" - Jackson po cichu odrzuca nieznany klucz i rok
        // produkcji nigdy się nie zapisuje. Ten test pilnuje dokładnego klucza w JSON-ie.
        expect(payload.vehicle).not.toHaveProperty('updateData.yearOfProduction');
    });

    it('vehicle NEW wysyła "year", gdy formData.isNewVehicle=true', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), isNewVehicle: true })!;
        expect(payload.vehicle).toEqual({
            mode: 'NEW',
            newData: {
                brand: 'Audi',
                model: 'A4',
                year: 2019,
                licensePlate: 'WA12345',
                color: 'czarny',
            },
        });
    });

    it('vehicle NEW, gdy wybrany pojazd nie ma jeszcze id', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            vehicleData: { ...baseFormData().vehicleData!, id: '' },
        })!;
        expect(payload.vehicle.mode).toBe('NEW');
    });

    it('brak tablicy rejestracyjnej zamienia się na undefined, nie na pusty string', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            vehicleData: { ...baseFormData().vehicleData!, licensePlate: '' },
        })!;
        expect(payload.vehicle.mode === 'UPDATE' ? payload.vehicle.updateData.licensePlate : 'not-update').toBeUndefined();
    });

    // ── services ────────────────────────────────────────────────────────────

    it('usługa z katalogu przechodzi bez zmian (adjustment PERCENT)', () => {
        const payload = buildAppointmentEditPayload(baseFormData())!;
        expect(payload.services).toEqual([
            {
                id: 'line-1',
                serviceId: 'service-1',
                serviceName: 'Mycie',
                basePriceNet: 10000,
                vatRate: 23,
                adjustment: { type: 'PERCENT', value: 0 },
                requireManualPrice: false,
            },
        ]);
    });

    it('usługa z ręczną ceną (requireManualPrice) zwija cenę do SET_NET na basePriceNet=0', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            services: [
                {
                    id: 'line-1',
                    serviceId: null,
                    serviceName: 'Wycena indywidualna',
                    basePriceNet: 15000,
                    vatRate: 23,
                    adjustment: { type: 'PERCENT', value: 0 },
                    requireManualPrice: true,
                },
            ],
        })!;
        expect(payload.services[0]).toMatchObject({
            basePriceNet: 0,
            adjustment: { type: 'SET_NET', value: 15000 },
        });
    });

    it('podmiana listy usług zamienia całą listę, nie dokleja pozycji', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            services: [
                { id: 'a', serviceId: 's1', serviceName: 'A', basePriceNet: 1000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 }, requireManualPrice: false },
                { id: 'b', serviceId: 's2', serviceName: 'B', basePriceNet: 2000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 }, requireManualPrice: false },
            ],
        })!;
        expect(payload.services).toHaveLength(2);
        expect(payload.services.map(s => s.id)).toEqual(['a', 'b']);
    });

    // ── notes ───────────────────────────────────────────────────────────────

    it('mapTechnicalNotesToPayload wiąże inspectionNotes z note ORAZ internalNote', () => {
        const mapped = mapTechnicalNotesToPayload({
            mileage: 0,
            deposit: { keys: false, registrationDocument: false, other: false },
            inspectionNotes: 'Rysa na progu',
            protocolNotes: 'Podpisano protokół',
        });
        expect(mapped).toEqual({
            note: 'Rysa na progu',
            internalNote: 'Rysa na progu',
            protocolNote: 'Podpisano protokół',
        });
    });

    it('puste notatki zamieniają się na undefined, nie zerują pola pustym stringiem', () => {
        const mapped = mapTechnicalNotesToPayload({
            mileage: 0,
            deposit: { keys: false, registrationDocument: false, other: false },
            inspectionNotes: '',
            protocolNotes: '',
        });
        expect(mapped).toEqual({ note: undefined, internalNote: undefined, protocolNote: undefined });
    });

    it('note/internalNote/protocolNote trafiają do pełnego payloadu', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            technicalState: {
                mileage: 0,
                deposit: { keys: false, registrationDocument: false, other: false },
                inspectionNotes: 'Uwaga wewnętrzna',
                protocolNotes: 'Notatka na protokół',
            },
        })!;
        expect(payload.note).toBe('Uwaga wewnętrzna');
        expect(payload.internalNote).toBe('Uwaga wewnętrzna');
        expect(payload.protocolNote).toBe('Notatka na protokół');
    });

    // ── doorToDoor ──────────────────────────────────────────────────────────

    it('doorToDoor wysyła wszystkie pola adresu odbioru i dostawy, gdy enabled=true', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            doorToDoor: {
                enabled: true,
                pickupAddress: { city: 'Warszawa', street: 'Polna 1' },
                deliveryAddress: { city: 'Kraków', street: 'Długa 2' },
                notes: 'Klucze u sąsiada',
            },
        })!;
        expect(payload.doorToDoor).toEqual({
            pickupCity: 'Warszawa',
            pickupStreet: 'Polna 1',
            deliveryCity: 'Kraków',
            deliveryStreet: 'Długa 2',
            notes: 'Klucze u sąsiada',
        });
    });

    it('doorToDoor.enabled=false zeruje wszystkie jego pola (payload.doorToDoor=undefined)', () => {
        const payload = buildAppointmentEditPayload({
            ...baseFormData(),
            doorToDoor: {
                enabled: false,
                pickupAddress: { city: 'Warszawa', street: 'Polna 1' },
                deliveryAddress: { city: 'Kraków', street: 'Długa 2' },
                notes: 'Klucze u sąsiada',
            },
        })!;
        expect(payload.doorToDoor).toBeUndefined();
    });

    it('brak doorToDoor w formData daje payload.doorToDoor=undefined', () => {
        const payload = buildAppointmentEditPayload({ ...baseFormData(), doorToDoor: undefined })!;
        expect(payload.doorToDoor).toBeUndefined();
    });

    // ── everything at once ──────────────────────────────────────────────────

    it('zmiana wszystkich pól naraz mapuje się spójnie na jeden payload', () => {
        const formData: CheckInFormData = {
            ...baseFormData(),
            title: 'Zmieniony tytuł',
            appointmentColorId: 'color-2',
            isNewVehicle: true,
            technicalState: {
                mileage: 0,
                deposit: { keys: false, registrationDocument: false, other: false },
                inspectionNotes: 'Nowa notatka',
                protocolNotes: 'Nowy protokół',
            },
            doorToDoor: {
                enabled: true,
                pickupAddress: { city: 'Poznań', street: 'Rynek 1' },
                deliveryAddress: { city: 'Poznań', street: 'Rynek 2' },
                notes: '',
            },
        };
        const payload = buildAppointmentEditPayload(formData)!;

        expect(payload.appointmentTitle).toBe('Zmieniony tytuł');
        expect(payload.appointmentColorId).toBe('color-2');
        expect(payload.vehicle).toEqual({
            mode: 'NEW',
            newData: { brand: 'Audi', model: 'A4', year: 2019, licensePlate: 'WA12345', color: 'czarny' },
        });
        expect(payload.internalNote).toBe('Nowa notatka');
        expect(payload.protocolNote).toBe('Nowy protokół');
        expect(payload.doorToDoor).toEqual({
            pickupCity: 'Poznań',
            pickupStreet: 'Rynek 1',
            deliveryCity: 'Poznań',
            deliveryStreet: 'Rynek 2',
            notes: undefined,
        });
    });
});
