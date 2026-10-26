// Pole „Wyślij klientowi SMS o zmianie terminu" musi dojść do serwera w obu zapisach terminu.
// Brak wyboru (pole niewidoczne) nie wysyła parametru - serwer zostaje przy swoim.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const put = vi.fn().mockResolvedValue({ data: {} });
const patch = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@/core', () => ({ apiClient: { put: (...a: unknown[]) => put(...a), patch: (...a: unknown[]) => patch(...a) } }));

import { appointmentApi } from './appointmentApi';
import { operationApi } from '@/modules/operations/api/operationApi';
import type { AppointmentCreateRequest } from '../types';

const body = {} as AppointmentCreateRequest;

describe('SMS o zmianie terminu - wybór dochodzi do serwera', () => {
    beforeEach(() => { put.mockClear(); patch.mockClear(); });

    it('edycja rezerwacji: odznaczone pole idzie jako notifyCustomer=false', async () => {
        await appointmentApi.updateAppointment('a1', body, false);
        expect(put).toHaveBeenCalledWith('/v1/appointments/a1', body, { params: { notifyCustomer: false } });
    });

    it('edycja rezerwacji bez pola nie wysyła parametru', async () => {
        await appointmentApi.updateAppointment('a1', body);
        expect(put).toHaveBeenCalledWith('/v1/appointments/a1', body, undefined);
    });

    it('„Zmień datę": wybór idzie w treści zapisu terminu', async () => {
        await operationApi.updateReservationDate('a1', 's', 'e', true);
        expect(patch).toHaveBeenCalledWith('/v1/appointments/a1/schedule', { startDateTime: 's', endDateTime: 'e', notifyCustomer: true });
    });
});
