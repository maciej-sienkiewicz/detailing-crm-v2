// @vitest-environment jsdom
//
// „Nic nie może zginąć" przy zakładaniu rezerwacji z szybkiego formularza: seria musi
// dostać door-to-door i notatkę tak samo jak pojedyncza rezerwacja, a rezerwacja z leada
// nie może po cichu zgubić reguły powtarzania (serwer nie zakłada serii z leada).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';
import { useQuickEventCreation } from './useQuickEventCreation';

const data = (overrides: Partial<QuickEventFormData> = {}): QuickEventFormData => ({
    title: 'Ceramika',
    customer: { id: 'cust-1', isNew: false },
    vehicle: null,
    startDateTime: '2026-09-14T10:00',
    endDateTime: '2026-09-14T11:00',
    isAllDay: false,
    serviceIds: [],
    colorId: 'color-1',
    notes: 'Klucze u portiera',
    doorToDoor: {
        enabled: true,
        pickupAddress: { city: 'Kraków', street: 'Długa 1' },
        deliveryAddress: { city: 'Wieliczka', street: 'Krótka 2' },
        notes: 'Dzwonić przed',
    } as QuickEventFormData['doorToDoor'],
    sendConfirmationSms: false,
    sendReminderSms: false,
    sendVisitCard: false,
    recurrence: {
        type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['MONDAY'], endType: 'COUNT', maxOccurrences: 4,
    },
    ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

afterEach(() => vi.restoreAllMocks());

describe('useQuickEventCreation', () => {
    it('seria wysyła door-to-door i notatkę razem z regułą', async () => {
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
        const { result } = renderHook(() => useQuickEventCreation(), { wrapper });

        await result.current.createQuickEventAsync(data());

        expect(post).toHaveBeenCalledTimes(1);
        const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
        expect(url).toBe('/v1/appointments/recurring');
        expect(body.note).toBe('Klucze u portiera');
        expect(body.doorToDoor).toEqual({
            pickupCity: 'Kraków', pickupStreet: 'Długa 1',
            deliveryCity: 'Wieliczka', deliveryStreet: 'Krótka 2', notes: 'Dzwonić przed',
        });
        expect(body.recurrence).toMatchObject({ type: 'WEEKLY', maxOccurrences: 4 });
    });

    it('rezerwacja z leada wysyła door-to-door', async () => {
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
        const { result } = renderHook(() => useQuickEventCreation(), { wrapper });

        await result.current.createBookingAsync({ data: data({ recurrence: null }), leadId: 'lead-1' });

        const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
        expect(url).toBe('/v1/appointments/from-lead/lead-1');
        expect(body.doorToDoor).toMatchObject({ pickupCity: 'Kraków', deliveryCity: 'Wieliczka' });
    });

    it('rezerwacja z leada z regułą powtarzania nie powstaje po cichu jako pojedyncza', async () => {
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
        const { result } = renderHook(() => useQuickEventCreation(), { wrapper });

        await expect(result.current.createBookingAsync({ data: data(), leadId: 'lead-1' })).rejects.toThrow(/cyklicznej/);
        expect(post).not.toHaveBeenCalled();
    });
});
