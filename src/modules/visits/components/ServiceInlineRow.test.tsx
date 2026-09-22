// src/modules/visits/components/ServiceInlineRow.test.tsx
// @vitest-environment jsdom
//
// Wiersz „Dodaj usługę" w wykazie usług wizyty. Zgłoszenie: usługa wpisana jako
// 1900,00 zł brutto wracała po zapisie jako 1900,01 zł, bo wiersz zamieniał brutto
// na netto i tylko netto jechało do serwera. Brutto wpisane przez człowieka musi
// dojść do payloadu bez przeliczania (CLAUDE.md §1).

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServiceInlineRow } from './ServiceInlineRow';
import type { NewRow } from './ServiceInlineRow';

const catalog = [{
    id: 'svc-ceramic',
    name: 'Powłoka ceramiczna',
    basePriceNet: 154472,
    basePriceGross: 190000,
    vatRate: 23,
    requireManualPrice: false,
}];

vi.mock('@/modules/services/api/servicesApi', () => ({
    servicesApi: {
        getServices: vi.fn(async () => ({ services: catalog, pagination: { total: 1 } })),
    },
}));

const baseRow = (extra: Partial<NewRow> = {}): NewRow => ({
    draftId: 'draft-1',
    serviceId: null,
    serviceName: 'Usługa spoza cennika',
    basePriceNet: 0,
    vatRate: 23,
    requireManualPrice: true,
    adjustment: { type: 'FIXED_NET', value: 0 },
    ...extra,
});

const renderRow = (row: NewRow, onUpdate = vi.fn()) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <table><tbody>
                    <ServiceInlineRow row={row} onUpdate={onUpdate} onRemove={vi.fn()} onAddCustom={vi.fn()} />
                </tbody></table>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return onUpdate;
};

const priceInputs = () => screen.getAllByPlaceholderText('0.00') as HTMLInputElement[];

describe('ServiceInlineRow - cena wpisana w wierszu', () => {
    beforeEach(() => {
        // Wiersz na telefonie otwiera arkusz wyboru; tu sprawdzamy układ biurkowy.
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('brutto 1900,00 zł jedzie do wiersza jako dokładne brutto, netto liczy się z niego', () => {
        const onUpdate = renderRow(baseRow());
        const [net, gross] = priceInputs();

        fireEvent.change(gross, { target: { value: '1900,00' } });

        expect(onUpdate).toHaveBeenLastCalledWith({ basePriceNet: 154472, basePriceGross: 190000 });
        expect(net.value).toBe('1544.72');
    });

    it('netto wpisane ręcznie nie niesie brutto - to wolno policzyć', () => {
        const onUpdate = renderRow(baseRow());
        const [net, gross] = priceInputs();

        fireEvent.change(net, { target: { value: '1000' } });

        expect(onUpdate).toHaveBeenLastCalledWith({ basePriceNet: 100000, basePriceGross: undefined });
        expect(gross.value).toBe('1230.00');
    });

    it('wyczyszczenie ceny kasuje też dokładne brutto', () => {
        const onUpdate = renderRow(baseRow({ basePriceNet: 154472, basePriceGross: 190000 }));
        const [, gross] = priceInputs();

        fireEvent.change(gross, { target: { value: '' } });

        expect(onUpdate).toHaveBeenLastCalledWith({ basePriceNet: 0, basePriceGross: undefined });
    });

    it('wiersz z dokładnym brutto pokazuje 1900.00, nie 1900.01', () => {
        renderRow(baseRow({ basePriceNet: 154472, basePriceGross: 190000 }));
        const [net, gross] = priceInputs();

        expect(net.value).toBe('1544.72');
        expect(gross.value).toBe('1900.00');
    });

    it('usługa wybrana z cennika przynosi brutto z cennika', async () => {
        const onUpdate = renderRow(baseRow({ serviceName: '' }));

        fireEvent.change(screen.getByPlaceholderText('Wyszukaj lub wpisz nazwę usługi...'), { target: { value: 'Powł' } });
        fireEvent.click(await screen.findByText('Powłoka ceramiczna'));

        expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
            serviceId: 'svc-ceramic',
            basePriceNet: 154472,
            basePriceGross: 190000,
            vatRate: 23,
            requireManualPrice: false,
        }));
    });
});
