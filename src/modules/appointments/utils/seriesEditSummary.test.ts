import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckInFormData } from '@/modules/checkin/types';

const put = vi.fn();
vi.mock('@/core', () => ({ apiClient: { put: (...args: unknown[]) => put(...args) } }));

import { appointmentApi } from '../api/appointmentApi';
import {
    changedSeriesFields,
    customerRecordEdited,
    detectIdentitySwap,
    seriesOverwriteSentence,
    seriesResultToast,
    seriesSkippedSentence,
} from './seriesEditSummary';

const base = {
    title: 'Mycie cotygodniowe',
    customerData: { id: 'c-1', firstName: 'Jan', lastName: 'Kowalski', phone: '600100200', email: 'jan@example.pl' },
    isNewCustomer: false,
    vehicleData: { id: 'v-1', brand: 'Toyota', model: 'Corolla' },
    isNewVehicle: false,
    homeAddress: null,
    company: null,
    services: [],
    appointmentColorId: 'col-1',
    technicalState: { inspectionNotes: 'stała', protocolNotes: '' },
    visitStartAt: '2026-11-02T10:00',
    visitEndAt: '2026-11-02T12:00',
} as unknown as CheckInFormData;

const edit = (patch: Partial<CheckInFormData>) => ({ ...base, ...patch }) as CheckInFormData;

describe('appointmentApi - zakres serii idzie tylko wtedy, gdy go wybrano', () => {
    beforeEach(() => put.mockReset().mockResolvedValue({ data: { id: 'a-1' } }));

    it('zwykły zapis nie wysyła żadnego zakresu (serwer: tylko ta rezerwacja)', async () => {
        await appointmentApi.updateAppointment('a-1', {} as never);

        expect(put).toHaveBeenCalledTimes(1);
        const [url, , config] = put.mock.calls[0];
        expect(url).toBe('/v1/appointments/a-1');
        expect(String(url)).not.toContain('scope');
        expect(config).toBeUndefined();
    });

    it('zapis w serii wysyła wybrany zakres', async () => {
        await appointmentApi.updateAppointmentWithScope('a-1', {} as never, 'ALL');

        const [url, , config] = put.mock.calls[0];
        expect(url).toBe('/v1/appointments/a-1');
        expect(config).toEqual({ params: { scope: 'ALL' } });
    });
});

describe('seriesEditSummary - co nadpisze zapis w serii', () => {
    it('podmiana klienta to inny identyfikator, a poprawka danych tego samego klienta nie', () => {
        const typo = edit({ customerData: { ...base.customerData, firstName: 'Janusz' } });
        expect(detectIdentitySwap(base, typo)).toEqual({ customer: false, vehicle: false });
        expect(customerRecordEdited(base, typo)).toBe(true);

        const swapped = edit({ customerData: { ...base.customerData, id: 'c-2' } });
        expect(detectIdentitySwap(base, swapped).customer).toBe(true);
        expect(customerRecordEdited(base, swapped)).toBe(false);

        expect(detectIdentitySwap(base, edit({ vehicleData: null })).vehicle).toBe(true);
    });

    it('wskazuje pola zmienione w tej rezerwacji', () => {
        const changed = edit({
            title: 'Nowy',
            technicalState: { ...base.technicalState, protocolNotes: 'klucze u portiera' },
        });
        expect(changedSeriesFields(base, changed)).toEqual(['tytuł', 'notatki']);
        expect(changedSeriesFields(base, base)).toEqual([]);
    });

    it('zdanie główne podaje liczbę i odmianę', () => {
        expect(seriesOverwriteSentence('THIS_AND_FUTURE', 1, { customer: false, vehicle: false }))
            .toBe('Nadpiszesz tytuł, kolor, usługi z cenami, notatki i door-to-door w 1 kolejnej rezerwacji tej serii wartościami z tej rezerwacji.');
        expect(seriesOverwriteSentence('ALL', 7, { customer: true, vehicle: false }))
            .toContain('notatki, door-to-door i klienta w 7 pozostałych rezerwacjach');
    });

    it('pominięte są zgłaszane wprost, bez kropki środkowej', () => {
        expect(seriesSkippedSentence({ skippedDetachedCount: 2, skippedConvertedCount: 1 }))
            .toBe('Bez zmian zostaną: 2 rezerwacje zmieniane wcześniej osobno, 1 rezerwacja przyjęta już jako wizyta.');
        expect(seriesSkippedSentence({ skippedDetachedCount: 0, skippedConvertedCount: 0 })).toBeNull();
    });

    it('toast po zapisie liczy inne rezerwacje bez edytowanej', () => {
        expect(seriesResultToast({ scope: 'ALL', updatedCount: 8, skippedDetachedCount: 1, skippedConvertedCount: 0 }))
            .toEqual({
                title: 'Zapisano tę rezerwację i 7 rezerwacji z serii',
                message: 'Bez zmian zostaną: 1 rezerwacja zmieniana wcześniej osobno.',
            });
    });
});
