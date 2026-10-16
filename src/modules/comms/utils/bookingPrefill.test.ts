// „Umów wizytę" z leada przenosi wycenę uzgodnioną w korespondencji do formularza
// rezerwacji. Kwota, którą klient dostał w ofercie, ma dojechać co do grosza: 1900,00 zł
// brutto (23%) to 154472 gr netto, a z tego netta wychodzi 1900,01 zł (CLAUDE.md §1) -
// dlatego formularz dostaje OBIE kwoty i żadnej nie przelicza z drugiej.
import { describe, expect, it } from 'vitest';
import { grossToNet } from '@/common/utils/priceAdjustment';
import { buildServicesAsLineItems } from '@/modules/calendar/components/QuickEventModal/servicesAsLineItems';
import type { QuickEventInitialData } from '@/modules/calendar';
import type { ContactCard, Lead, LeadServiceItem } from '../types';
import { contactToBookingPrefill, leadToBookingPrefill } from './bookingPrefill';

/** Pozycja wyceny za 1900,00 zł brutto przy 23%. */
const leadItem = (overrides: Partial<LeadServiceItem> = {}): LeadServiceItem => ({
    id: 'item-1',
    serviceId: 'svc-1',
    name: 'Powłoka ceramiczna',
    priceGross: 190_000,
    priceNet: 154_472,
    vatRate: 23,
    note: null,
    quantity: 1,
    totalGross: 190_000,
    status: 'ACCEPTED',
    source: 'MANUAL',
    priceSource: 'CATALOG',
    ...overrides,
});

const lead = (overrides: Partial<Lead> = {}): Lead => ({
    id: 'lead-1',
    source: 'EMAIL',
    status: 'NEW',
    contactIdentifier: 'jan@example.com',
    customerName: 'Jan Kowalski',
    initialMessage: null,
    estimatedValue: 0,
    requiresVerification: false,
    customerId: null,
    appointmentId: null,
    visitId: null,
    assignedUserId: null,
    assignedUserName: null,
    threadId: null,
    tags: [],
    tagLabels: [],
    vehicleBrand: null,
    vehicleModel: null,
    vehicleDetectionStatus: 'DONE',
    lostReasonCode: null,
    lostReasonLabel: null,
    lostReason: null,
    services: [leadItem()],
    replyState: 'NO_CONVERSATION',
    waitingSince: null,
    lastInboundAt: null,
    lastOutboundAt: null,
    firstResponseAt: null,
    closedAt: null,
    owedSince: null,
    owedNote: null,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides,
});

const card = (overrides: Partial<ContactCard> = {}): ContactCard => ({
    email: 'jan@example.com',
    customer: {
        id: 'cust-1',
        fullName: 'Jan Kowalski',
        phone: '+48 600 100 200',
        completedVisitCount: 2,
        totalSpentGross: 380_000,
        lastVisitAt: null,
    },
    vehicles: [{ id: 'veh-1', brand: 'BMW', model: 'X5', year: 2021, licensePlate: 'WX 12345' }],
    recentVisits: [],
    risk: { abandonedBookings: 0, abandonedLeads: 0 },
    ...overrides,
});

/** Wiersze tabeli usług formularza - dokładnie tak, jak zbuduje je QuickEventModal. */
const formLines = (prefill: QuickEventInitialData, services: Parameters<typeof buildServicesAsLineItems>[0]['services'] = []) =>
    buildServicesAsLineItems({
        selectedServiceIds: prefill.serviceIds ?? [],
        serviceRefs: prefill.serviceRefs ?? {},
        services,
        tempServices: prefill.tempServices ?? {},
        servicePrices: prefill.servicePrices ?? {},
        serviceBasePrices: prefill.serviceBasePrices ?? {},
        serviceAdjustments: {},
        serviceNotes: prefill.serviceNotes ?? {},
        serviceVatRates: prefill.serviceVatRates ?? {},
    });

describe('leadToBookingPrefill - wycena', () => {
    it('brutto 1900,00 i netto 1544,72 przechodzą do formularza bez przeliczania', () => {
        const prefill = leadToBookingPrefill(lead());

        expect(prefill.serviceIds).toEqual(['lead-item-1-0']);
        expect(prefill.serviceRefs).toEqual({ 'lead-item-1-0': 'svc-1' });
        // Formularz trzyma brutto w złotych, a netto w groszach.
        expect(prefill.servicePrices).toEqual({ 'lead-item-1-0': 1900 });
        expect(prefill.serviceBasePrices).toEqual({ 'lead-item-1-0': 154_472 });
        expect(prefill.serviceVatRates).toEqual({ 'lead-item-1-0': 23 });
    });

    it('w tabeli rezerwacji pozycja ma cenę z wyceny (1900,00), nie z cennika', () => {
        const catalog = [{ id: 'svc-1', name: 'Powłoka ceramiczna', basePriceNet: 200_000, basePriceGross: 246_000, vatRate: 23, requireManualPrice: false }];

        const [row] = formLines(leadToBookingPrefill(lead()), catalog);

        expect(row).toMatchObject({ basePriceGross: 190_000, basePriceNet: 154_472, vatRate: 23 });
        // Rabat jest już „wypalony" w kwocie - drugi raz go nie ma.
        expect(row.adjustment).toEqual({ type: 'PERCENT', value: 0 });
    });

    it('rabat z wyceny nie jedzie do formularza osobno, bo jest już w kwocie', () => {
        const prefill = leadToBookingPrefill(lead());

        expect(prefill).not.toHaveProperty('serviceAdjustments');
    });

    it('pozycja bez zapisanego netta: netto „w stu" z brutto, brutto nietknięte', () => {
        const prefill = leadToBookingPrefill(lead({ services: [leadItem({ priceNet: null })] }));

        expect(prefill.servicePrices).toEqual({ 'lead-item-1-0': 1900 });
        expect(prefill.serviceBasePrices).toEqual({ 'lead-item-1-0': grossToNet(190_000, 23) });
    });

    it('pozycja bez stawki (sprzed V75) dostaje 23%', () => {
        const prefill = leadToBookingPrefill(lead({ services: [leadItem({ vatRate: null, priceNet: null, priceGross: 12_300 })] }));

        expect(prefill.serviceVatRates).toEqual({ 'lead-item-1-0': 23 });
        expect(prefill.serviceBasePrices).toEqual({ 'lead-item-1-0': 10_000 });
        expect(prefill.servicePrices).toEqual({ 'lead-item-1-0': 123 });
    });

    it('pozycja zwolniona (zw) zostaje zwolniona, netto równe brutto', () => {
        const prefill = leadToBookingPrefill(lead({ services: [leadItem({ vatRate: -1, priceNet: null, priceGross: 50_000 })] }));

        expect(prefill.serviceVatRates).toEqual({ 'lead-item-1-0': -1 });
        expect(prefill.serviceBasePrices).toEqual({ 'lead-item-1-0': 50_000 });
        expect(prefill.servicePrices).toEqual({ 'lead-item-1-0': 500 });
    });

    it('pozycja spoza katalogu wchodzi jako usługa tymczasowa i też niesie dokładne brutto', () => {
        const prefill = leadToBookingPrefill(lead({ services: [leadItem({ serviceId: null, name: 'Pranie tapicerki' })] }));

        expect(prefill.serviceRefs).toEqual({ 'lead-item-1-0': 'temp-lead-item-1-0' });
        expect(prefill.tempServices).toEqual({
            'temp-lead-item-1-0': { name: 'Pranie tapicerki', basePriceNet: 154_472, vatRate: 23 },
        });

        const [row] = formLines(prefill);
        expect(row).toMatchObject({ serviceName: 'Pranie tapicerki', basePriceGross: 190_000, basePriceNet: 154_472 });
    });

    it('ilość rozwija się na wiersze o tej samej cenie, najwyżej 50', () => {
        const prefill = leadToBookingPrefill(lead({ services: [leadItem({ quantity: 2, totalGross: 380_000 })] }));

        expect(prefill.serviceIds).toEqual(['lead-item-1-0', 'lead-item-1-1']);
        expect(Object.values(prefill.servicePrices ?? {})).toEqual([1900, 1900]);
        expect(Object.values(prefill.serviceBasePrices ?? {})).toEqual([154_472, 154_472]);
        expect(leadToBookingPrefill(lead({ services: [leadItem({ quantity: 1_000 })] })).serviceIds).toHaveLength(50);
    });

    it('do rezerwacji trafiają tylko pozycje przyjęte', () => {
        const prefill = leadToBookingPrefill(
            lead({ services: [leadItem(), leadItem({ id: 'ai-1', status: 'SUGGESTED', source: 'AI' })] })
        );

        expect(prefill.serviceIds).toEqual(['lead-item-1-0']);
    });

    it('notatka pozycji przechodzi, pusta - nie', () => {
        const prefill = leadToBookingPrefill(
            lead({ services: [leadItem({ note: 'bez zderzaka' }), leadItem({ id: 'item-2', note: null })] })
        );

        expect(prefill.serviceNotes).toEqual({ 'lead-item-1-0': 'bez zderzaka' });
    });
});

describe('leadToBookingPrefill - klient i auto', () => {
    it('klient rozpoznany w kartotece wchodzi jako istniejący, z telefonem z kartoteki', () => {
        const prefill = leadToBookingPrefill(lead({ customerId: 'cust-1', customerName: 'Anna Maria Nowak' }), card());

        expect(prefill.customer).toEqual({
            id: 'cust-1',
            firstName: 'Anna Maria',
            lastName: 'Nowak',
            phone: '+48 600 100 200',
            email: 'jan@example.com',
            isNew: false,
        });
        expect(prefill.customerEditing).toBe(false);
    });

    it('klient spoza kartoteki wchodzi jako nowy, do potwierdzenia', () => {
        const prefill = leadToBookingPrefill(lead({ customerName: 'Jan' }));

        expect(prefill.customer).toMatchObject({ firstName: 'Jan', lastName: '', phone: '', isNew: true });
        expect(prefill.customerEditing).toBe(true);
    });

    it('auto z kartoteki pasujące marką i modelem (bez względu na wielkość liter)', () => {
        const prefill = leadToBookingPrefill(lead({ vehicleBrand: 'bmw', vehicleModel: 'x5' }), card());

        expect(prefill.vehicle).toEqual({ id: 'veh-1', kind: 'CAR', brand: 'BMW', model: 'X5', year: 2021, licensePlate: 'WX 12345', isNew: false });
    });

    it('auto spoza kartoteki wchodzi jako nowe', () => {
        const prefill = leadToBookingPrefill(lead({ vehicleBrand: 'Audi', vehicleModel: 'A6' }), card());

        expect(prefill.vehicle).toEqual({ kind: 'CAR', brand: 'Audi', model: 'A6', isNew: true });
    });

    it('bez rozpoznanej marki bierze jedyne auto klienta, a przy kilku - żadnego', () => {
        expect(leadToBookingPrefill(lead(), card()).vehicle).toMatchObject({ id: 'veh-1', isNew: false });

        const twoCars = card({
            vehicles: [
                { id: 'veh-1', brand: 'BMW', model: 'X5', year: 2021, licensePlate: null },
                { id: 'veh-2', brand: 'Audi', model: 'A6', year: null, licensePlate: null },
            ],
        });
        expect(leadToBookingPrefill(lead(), twoCars).vehicle).toBeUndefined();
    });

    // Rodzaj pojazdu: marka motocykla podpowiadana z katalogu aut nie istnieje, a nowy
    // pojazd bez rodzaju trafiłby do kartoteki jako samochód.
    describe('rodzaj pojazdu', () => {
        it('nowy pojazd z leada o motocykl wchodzi jako motocykl', () => {
            const prefill = leadToBookingPrefill(
                lead({ vehicleBrand: 'Honda', vehicleModel: 'CBR 650R', vehicleKind: 'MOTORCYCLE' }),
                card(),
            );

            expect(prefill.vehicle).toEqual({ kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 650R', isNew: true });
        });

        it('lead bez pola rodzaju (sprzed rodzajów) to samochód', () => {
            const prefill = leadToBookingPrefill(lead({ vehicleBrand: 'Audi', vehicleModel: 'A6' }));

            expect(prefill.vehicle?.kind).toBe('CAR');
        });

        it('pojazd z kartoteki przynosi swój rodzaj', () => {
            const motorcycles = card({
                vehicles: [{ id: 'moto-1', kind: 'MOTORCYCLE', brand: 'BMW', model: 'R 1250 GS', year: 2022, licensePlate: null }],
            });

            const prefill = leadToBookingPrefill(
                lead({ vehicleBrand: 'BMW', vehicleModel: 'R 1250 GS', vehicleKind: 'MOTORCYCLE' }),
                motorcycles,
            );

            expect(prefill.vehicle).toEqual({
                id: 'moto-1', kind: 'MOTORCYCLE', brand: 'BMW', model: 'R 1250 GS', year: 2022, licensePlate: null, isNew: false,
            });
        });

        it('samochód tej samej marki nie podszywa się pod motocykl z leada', () => {
            // Z korespondencji wyszła sama marka - „BMW" - i rodzaj. Klient ma w kartotece
            // BMW X5. Bez rodzaju w dopasowaniu rezerwacja na motocykl poszłaby na auto.
            const prefill = leadToBookingPrefill(
                lead({ vehicleBrand: 'BMW', vehicleModel: null, vehicleKind: 'MOTORCYCLE' }),
                card(),
            );

            expect(prefill.vehicle).toEqual({ kind: 'MOTORCYCLE', brand: 'BMW', model: '', isNew: true });
        });

        it('bez marki jedyny pojazd klienta przynosi swój rodzaj', () => {
            const onlyMotorcycle = card({
                vehicles: [{ id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', year: null, licensePlate: null }],
            });

            expect(leadToBookingPrefill(lead(), onlyMotorcycle).vehicle).toMatchObject({ id: 'moto-1', kind: 'MOTORCYCLE' });
            expect(contactToBookingPrefill({ email: 'jan@example.com', participantName: null, contactCard: onlyMotorcycle }).vehicle)
                .toMatchObject({ id: 'moto-1', kind: 'MOTORCYCLE' });
        });
    });
});

describe('contactToBookingPrefill', () => {
    it('kontakt z kartoteki: klient istniejący, bez wyceny', () => {
        const prefill = contactToBookingPrefill({ email: 'jan@example.com', participantName: 'J. K.', contactCard: card() });

        expect(prefill.customer).toMatchObject({ id: 'cust-1', firstName: 'Jan', lastName: 'Kowalski', isNew: false });
        expect(prefill.serviceIds).toBeUndefined();
        expect(prefill.servicePrices).toBeUndefined();
    });

    it('kontakt spoza kartoteki: imię z korespondencji, klient nowy', () => {
        const prefill = contactToBookingPrefill({ email: 'anna@example.com', participantName: 'Anna Nowak' });

        expect(prefill.customer).toMatchObject({ firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com', isNew: true });
        expect(prefill.customerEditing).toBe(true);
        expect(prefill.vehicle).toBeUndefined();
    });
});
