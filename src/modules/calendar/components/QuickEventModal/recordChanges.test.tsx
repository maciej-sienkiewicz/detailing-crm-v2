// @vitest-environment jsdom
//
// Zapis szybkiej rezerwacji po poprawkach z audytu (docs/QUICK_EVENT_MODAL_AUDIT_2026-10.md):
// zmiana danych klienta/pojazdu z kartoteki pyta „Zmienić dane…?" (decyzja biznesu
// z 21.10.2026), SMS-y idą tylko tam, gdzie jest numer, a seria, której serwer nie
// przyjmie, nie wychodzi z formularza.

import type { FormEvent, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';
import type { Vehicle } from '@/modules/appointments/types';
import { useQuickEventForm } from './useQuickEventForm';
import type { QuickEventFormData } from './types';

const never = () => new Promise<never>(() => {});

const CUSTOMER_VEHICLES: Record<string, Vehicle[]> = {
    'cust-one': [{ id: 'car-1', kind: 'CAR', brand: 'BMW', model: 'X5', year: 2020, licensePlate: 'WA 1111A' }],
};

vi.mock('@/core', () => ({ apiClient: { get: () => never() } }));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: false }) }));
vi.mock('@/modules/appointment-colors', () => ({ pickInitialColorId: () => '' }));
vi.mock('@/modules/appointment-colors/api/appointmentColorApi', () => ({ appointmentColorApi: {} }));
vi.mock('@/modules/sms-campaigns/api/smsCampaignsApi', () => ({ fetchAutomationConfig: () => never() }));
vi.mock('@/modules/visit-card/api/visitCardApi', () => ({ visitCardApi: { getSettings: () => never() } }));
vi.mock('@/modules/appointments/hooks/useAppointmentForm', () => ({
    useCustomerVehicles: (customerId: string | undefined) => ({
        data: customerId ? (CUSTOMER_VEHICLES[customerId] ?? []) : undefined,
        isLoading: false,
    }),
    useCustomerSearch: () => ({ data: [] }),
}));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', async () => {
    const { useCallback, useState } = await import('react');
    return {
        useMessageDefaults: () => ({ sms: () => undefined, email: () => undefined }),
        useDefaultChoice: (defaultValue: boolean | undefined, fallback: boolean) => {
            const [choice, setChoice] = useState<boolean | null>(null);
            const set = useCallback((next: boolean) => setChoice(next), []);
            const reset = useCallback(() => setChoice(null), []);
            return [choice ?? defaultValue ?? fallback, set, reset] as const;
        },
    };
});

const setup = () => {
    const onSave = vi.fn<(data: QuickEventFormData) => void>();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
        ({ isOpen }: { isOpen: boolean }) => useQuickEventForm({ isOpen, eventData: null, onClose: () => {}, onSave, ref: null }),
        { wrapper, initialProps: { isOpen: true } },
    );
    return { result, onSave, rerender };
};

type Form = ReturnType<typeof useQuickEventForm>;

const fillRest = (f: Form) => {
    f.setStartDateTime('2026-10-24T10:00');
    f.setEndDateTime('2026-10-24T12:00');
    f.setSelectedColorId('color-1');
    f.setSelectedServiceIds(['line-1']);
    f.setServicePrices({ 'line-1': 300 });
};

const submit = (f: Form) => f.handleSubmit({ preventDefault: () => {} } as FormEvent);

const JAN = { id: 'cust-one', firstName: 'Jan', lastName: 'Kowalski', phone: '+48123456789', email: '', isNew: false };

describe('„Zmienić dane klienta?" przy zapisie', () => {
    const editedCustomer = async () => {
        const ctx = setup();
        act(() => { ctx.result.current.handleCustomerSelect(JAN); fillRest(ctx.result.current); });
        await waitFor(() => expect(ctx.result.current.selectedVehicle?.id).toBe('car-1'));
        act(() => ctx.result.current.handleEnterEditMode());
        act(() => ctx.result.current.setCustomerLastName('Nowak'));
        await act(() => submit(ctx.result.current));
        return ctx;
    };

    it('zmiana nazwiska wstrzymuje zapis i pyta', async () => {
        const { result, onSave } = await editedCustomer();

        expect(onSave).not.toHaveBeenCalled();
        expect(result.current.pendingChoice).toEqual({ kind: 'customer', resubmit: true, decided: {} });
    });

    it('„Edytuj istniejącego" zapisuje zmianę w karcie klienta', async () => {
        const { result, onSave } = await editedCustomer();

        await act(async () => result.current.answerPendingChoice('edit'));

        expect(onSave).toHaveBeenCalledTimes(1);
        const payload = buildAppointmentPayload(onSave.mock.calls[0][0]);
        expect(payload.customer).toMatchObject({ mode: 'UPDATE', id: 'cust-one', updateData: { lastName: 'Nowak' } });
        expect(payload.vehicle).toEqual({ mode: 'EXISTING', id: 'car-1' });
    });

    it('„Dodaj jako nowego" zakłada nowego klienta, a jego auto idzie jako nowe', async () => {
        const { result, onSave } = await editedCustomer();

        await act(async () => result.current.answerPendingChoice('new'));

        const payload = buildAppointmentPayload(onSave.mock.calls[0][0]);
        expect(payload.customer).toMatchObject({ mode: 'NEW', newData: { firstName: 'Jan', lastName: 'Nowak' } });
        expect(payload.vehicle).toMatchObject({ mode: 'NEW', newData: { brand: 'BMW', model: 'X5' } });
    });

    it('sam inny zapis numeru (spacje) to nie zmiana - zapis idzie bez pytania', async () => {
        const { result, onSave } = setup();
        act(() => { result.current.handleCustomerSelect(JAN); fillRest(result.current); });
        act(() => result.current.handleEnterEditMode());

        await act(() => submit(result.current));

        expect(result.current.pendingChoice).toBeNull();
        expect(buildAppointmentPayload(onSave.mock.calls[0][0]).customer).toEqual({ mode: 'EXISTING', id: 'cust-one' });
    });

    it('odpowiedź z „Zatwierdź zmiany" nie pada drugi raz przy zapisie', async () => {
        const { result, onSave } = setup();
        act(() => { result.current.handleCustomerSelect(JAN); fillRest(result.current); });
        act(() => result.current.handleEnterEditMode());
        act(() => result.current.setCustomerLastName('Nowak'));
        act(() => result.current.handleConfirmEdit());
        expect(result.current.pendingChoice).toEqual({ kind: 'customer', resubmit: false });

        act(() => result.current.answerPendingChoice('edit'));
        await act(() => submit(result.current));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(buildAppointmentPayload(onSave.mock.calls[0][0]).customer).toMatchObject({ mode: 'UPDATE' });
    });
});

describe('„Zmienić dane pojazdu?"', () => {
    it('poprawka auta z kartoteki pyta, „Dodaj jako nowy" zakłada nowe auto', async () => {
        const { result, onSave } = setup();
        act(() => { result.current.handleCustomerSelect(JAN); fillRest(result.current); });
        await waitFor(() => expect(result.current.selectedVehicle?.id).toBe('car-1'));
        act(() => result.current.handleEnterVehicleEditMode());
        act(() => result.current.setVehicleModel('X6'));
        act(() => result.current.handleConfirmVehicleEdit());

        expect(result.current.pendingChoice).toEqual({ kind: 'vehicle', resubmit: false });
        act(() => result.current.answerPendingChoice('new'));
        await act(() => submit(result.current));

        expect(buildAppointmentPayload(onSave.mock.calls[0][0]).vehicle).toMatchObject({ mode: 'NEW', newData: { brand: 'BMW', model: 'X6' } });
    });
});

describe('SMS a numer klienta', () => {
    it('nowy klient wpisany w pola: numer z pól, SMS idzie', async () => {
        const { result, onSave } = setup();
        act(() => {
            fillRest(result.current);
            result.current.setCustomerFirstName('Anna');
            result.current.setCustomerPhone('600 100 200');
            result.current.setSendConfirmationSms(true);
        });

        expect(result.current.smsPhone).toBe('+48 600 100 200');
        await act(() => submit(result.current));
        expect(onSave.mock.calls[0][0].sendConfirmationSms).toBe(true);
    });

    it('bez numeru żaden SMS nie idzie, choćby był zaznaczony', async () => {
        const { result, onSave } = setup();
        act(() => {
            fillRest(result.current);
            result.current.setCustomerFirstName('Anna');
            result.current.setCustomerEmail('anna@example.com');
            result.current.setSendConfirmationSms(true);
            result.current.setSendReminderSms(true);
        });

        expect(result.current.smsPhone).toBeNull();
        await act(() => submit(result.current));
        const data = onSave.mock.calls[0][0];
        expect([data.sendConfirmationSms, data.sendReminderSms, data.sendVisitCard]).toEqual([false, false, false]);
    });
});

describe('Seria rezerwacji', () => {
    it('dzień miesiąca 31 nie wychodzi do serwera', async () => {
        const { result, onSave } = setup();
        act(() => {
            fillRest(result.current);
            result.current.handleCustomerSelect(JAN);
            result.current.setIsRecurring(true);
        });
        act(() => result.current.setRecurrenceRule({ type: 'MONTHLY', dayOfMonth: 31, endType: 'COUNT', maxOccurrences: 6 }));

        await act(() => submit(result.current));

        expect(onSave).not.toHaveBeenCalled();
        expect(result.current.errors.recurrence).toBe('Dzień miesiąca musi być od 1 do 28');
    });
});

describe('Szkic', () => {
    it('zamknięcie odkłada formularz do szkicu, przywrócenie zostawia nowy termin', () => {
        const { result, rerender } = setup();
        act(() => {
            result.current.setCustomerFirstName('Anna');
            result.current.setStartDateTime('2026-10-24T10:00');
        });

        rerender({ isOpen: false });

        expect(result.current.customerFirstName).toBe('');
        expect(result.current.draft?.customerFirstName).toBe('Anna');
        expect(result.current.draftSummary).toBe('Anna');

        rerender({ isOpen: true });
        act(() => result.current.setStartDateTime('2026-10-30T09:00'));
        act(() => result.current.restoreDraft());

        expect(result.current.customerFirstName).toBe('Anna');
        expect(result.current.startDateTime).toBe('2026-10-30T09:00');
        expect(result.current.draft).toBeNull();
    });

    it('pusty formularz nie zostawia szkicu', () => {
        const { result, rerender } = setup();

        rerender({ isOpen: false });

        expect(result.current.draft).toBeNull();
    });
});
