// @vitest-environment jsdom
//
// Regresja z produkcji (kalendarz → szybka rezerwacja): usługa założona w locie
// („powłoka na felgi", 900,00 zł brutto, bez zapisu do cennika) dostaje id
// `temp-<Date.now()>`. „Edytuj pozycję" → nowa cena → „Zapisz" wysyłało to id do
// POST /services/update jako `originalServiceId`; backend nie umiał go sparsować
// jako UUID („Invalid UUID string: temp-…"), oddawał 400 i ceny nie dało się zmienić.
//
// Oczekiwane zachowanie: pozycja spoza cennika zmienia się W LOCIE, tylko w tabeli,
// a zapis rezerwacji niesie nową cenę - dokładną, 1900,00 zł, nie 1900,01 zł.
// Ten test przechodzi przez całą drogę formularza: stan → tabela → edycja → stan →
// payload rezerwacji, tymi samymi funkcjami, których używa QuickEventModal.

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';
import type { AppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';
import { buildServicesAsLineItems, withRenamedTempServices } from './servicesAsLineItems';
import type { ServicesAsLineItemsInput } from './servicesAsLineItems';
import { formPricesFromLineItems } from './linePrices';

const TEMP_ID = 'temp-1790326470364';

/** Stan formularza tuż po `handleQuickServiceCreate` - lineId === id usługi. */
const initialState = (): ServicesAsLineItemsInput => ({
    selectedServiceIds: [TEMP_ID],
    serviceRefs: {},
    services: [],
    tempServices: { [TEMP_ID]: { name: 'powłoka na felgi', basePriceNet: 73_171, vatRate: 23 } },
    servicePrices: { [TEMP_ID]: 900 },
    serviceBasePrices: { [TEMP_ID]: 73_171 },
    serviceAdjustments: {},
    serviceNotes: {},
    serviceVatRates: { [TEMP_ID]: 23 },
});

/**
 * Wycinek QuickEventModal: tabela + `handleServicesChange` w tej samej kolejności
 * zapisu stanu, a obok przycisk składający payload rezerwacji z bieżącego stanu.
 */
const Harness = ({ onSaveService, onSubmit }: {
    onSaveService: (id: string) => Promise<string | null>;
    onSubmit: (payload: AppointmentPayload) => void;
}) => {
    const [state, setState] = useState(initialState);

    const handleServicesChange = (items: ServiceLineItem[]) => {
        const prices = formPricesFromLineItems(items);
        setState(prev => ({
            ...prev,
            selectedServiceIds: items.map(i => i.id),
            serviceRefs: Object.fromEntries(items.map(i => [i.id, i.serviceId || i.id])),
            serviceVatRates: Object.fromEntries(items.map(i => [i.id, i.vatRate])),
            servicePrices: prices.servicePrices,
            serviceBasePrices: prices.serviceBasePrices,
            tempServices: withRenamedTempServices(prev.tempServices, items),
        }));
    };

    const submit = () => onSubmit(buildAppointmentPayload({
        title: '',
        customer: { id: 'cust-1', isNew: false },
        vehicle: null,
        startDateTime: '2026-09-25T10:00',
        endDateTime: '2026-09-25T11:00',
        isAllDay: false,
        serviceIds: state.selectedServiceIds,
        serviceRefs: state.serviceRefs,
        tempServices: state.tempServices,
        servicePrices: state.servicePrices,
        serviceBasePrices: state.serviceBasePrices,
        serviceVatRates: state.serviceVatRates,
        colorId: 'color-1',
        sendConfirmationSms: false,
        sendReminderSms: false,
        sendVisitCard: false,
    }));

    return (
        <ThemeProvider theme={theme}>
            <ServicesTable
                services={buildServicesAsLineItems(state)}
                onChange={handleServicesChange}
                onSaveService={(id) => onSaveService(id)}
            />
            <button type="button" onClick={submit}>Zapisz rezerwację</button>
        </ThemeProvider>
    );
};

describe('Szybka rezerwacja - „Edytuj pozycję" na usłudze spoza cennika', () => {
    it('cena zmienia się w tabeli, bez cennika, a rezerwacja zapisuje nową, dokładną cenę', async () => {
        const onSaveService = vi.fn().mockRejectedValue(new Error('400 Invalid UUID string'));
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(<Harness onSaveService={onSaveService} onSubmit={onSubmit} />);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const grossField = screen.getByDisplayValue('900,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        // Żadnego wywołania cennika i żadnego komunikatu o błędzie.
        expect(onSaveService).not.toHaveBeenCalled();
        expect(screen.queryByText('Nie udało się zapisać. Spróbuj ponownie.')).not.toBeInTheDocument();
        // Tabela pokazuje nową cenę.
        expect(screen.getAllByText(/1\s?900[.,]00/).length).toBeGreaterThan(0);

        await user.click(screen.getByRole('button', { name: 'Zapisz rezerwację' }));

        const [line] = (onSubmit.mock.calls[0][0] as AppointmentPayload).services;
        expect(line).toMatchObject({
            serviceId: null,               // nadal usługa spoza cennika
            serviceName: 'powłoka na felgi',
            basePriceNet: 154_472,
            basePriceGross: 190_000,       // 1900,00 zł - nie 1900,01
            vatRate: 23,
        });
    });

    it('zmieniona nazwa też trafia do rezerwacji', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(<Harness onSaveService={vi.fn()} onSubmit={onSubmit} />);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const nameField = screen.getByDisplayValue('powłoka na felgi');
        await user.clear(nameField);
        await user.type(nameField, 'Powłoka na felgi 4 szt.');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));
        await user.click(screen.getByRole('button', { name: 'Zapisz rezerwację' }));

        const [line] = (onSubmit.mock.calls[0][0] as AppointmentPayload).services;
        expect(line).toMatchObject({ serviceName: 'Powłoka na felgi 4 szt.', basePriceGross: 90_000 });
    });
});
