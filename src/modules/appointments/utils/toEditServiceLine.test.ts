// Edycja rezerwacji: pozycja odczytana z GET /v1/appointments/{id} ma wrócić do
// PUT z tym samym, dokładnym bruttem. Zgłoszenie: usługa ustalona na 1900,00 zł
// (23% VAT: 154472 gr netto, a 154472 × 1,23 = 190001 gr) po zapisaniu samej zmiany
// daty pokazywała się jako 1900,01 zł, bo mapowanie odpowiedzi wyrzucało brutto.
import { describe, expect, it } from 'vitest';
import { toEditServiceLine } from './toEditServiceLine';
import { buildAppointmentEditPayload } from './buildAppointmentEditPayload';
import type { CheckInFormData } from '@/modules/checkin/types';

/** Pozycja spoza cennika wpisana od brutta, tak jak zwraca ją serwer. */
const customLine = {
    id: 'line-1',
    serviceId: null,
    serviceName: 'Usługa spoza cennika',
    basePriceNet: 154472,
    basePriceGross: 190000,
    vatRate: 23,
    adjustment: { type: 'PERCENT' as const, value: 0 },
    note: '',
    finalPriceNet: 154472,
    finalPriceGross: 190000,
};

/** Formularz edycji zbudowany z pozycji tak, jak robi to AppointmentEditView. */
const formWith = (services: CheckInFormData['services']): CheckInFormData => ({
    customerData: { id: 'customer-1', firstName: 'Jan', lastName: 'Kowalski', phone: '600100200', email: '' },
    hasFullCustomerData: true,
    isNewCustomer: false,
    vehicleData: null,
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
    photos: [],
    damagePoints: [],
    services,
    appointmentColorId: 'color-1',
});

describe('toEditServiceLine', () => {
    it('brutto 1900,00 z odpowiedzi wraca w PUT dokładnie takie - 190000, nie 190001', () => {
        const line = toEditServiceLine(customLine);
        const payload = buildAppointmentEditPayload(formWith([line]))!;

        expect(line.basePriceGross).toBe(190000);
        expect(payload.services[0]).toMatchObject({ basePriceNet: 154472, basePriceGross: 190000 });
    });

    it('odpowiedź bez basePriceGross (rezerwacja sprzed zmiany): brutto odtworzone z finalPriceGross przy rabacie zerowym', () => {
        const { basePriceGross: _, ...legacy } = customLine;

        expect(toEditServiceLine(legacy).basePriceGross).toBe(190000);
    });

    it('cena ręczna zapisana jako SET_GROSS wraca do PUT jako ta sama kwota brutto', () => {
        const line = toEditServiceLine({
            ...customLine,
            serviceId: 'svc-manual',
            basePriceNet: 0,
            basePriceGross: null,
            adjustment: { type: 'SET_GROSS', value: 190000 },
        });
        const payload = buildAppointmentEditPayload(formWith([line]))!;

        expect(payload.services[0]).toMatchObject({ basePriceNet: 0, adjustment: { type: 'SET_GROSS', value: 190000 } });
    });

    it('przenosi resztę pozycji tak jak dotychczasowe mapowanie', () => {
        const line = toEditServiceLine({ ...customLine, serviceId: 'svc-1', note: 'Uwaga', requireManualPrice: true });

        expect(line).toMatchObject({
            id: 'line-1',
            serviceId: 'svc-1',
            serviceName: 'Usługa spoza cennika',
            vatRate: 23,
            adjustment: { type: 'PERCENT', value: 0 },
            note: 'Uwaga',
            requireManualPrice: true,
        });
        expect(toEditServiceLine(customLine).requireManualPrice).toBe(false);
    });
});
