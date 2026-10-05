// @vitest-environment jsdom
//
// Rezerwacja 566dd5e0: „Mycie - komplet" za 369 zł, a potem nowa cena w cenniku.
// Pozycja zostaje przy starej cenie (gwarancja ceny dla klienta), dopóki ktoś sam
// nie kliknie „Odśwież cenę".
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from './index';
import type { ServiceLineItem } from './index';
import { applyNewerVersion } from './serviceVersion';

const oldLine: ServiceLineItem = {
    id: 'line-1',
    serviceId: 'old-version',
    serviceName: 'Mycie - komplet',
    basePriceNet: 30_000,
    basePriceGross: 36_900,
    vatRate: 23,
    adjustment: { type: 'PERCENT', value: 10 },
    note: 'klient stały',
    newerVersion: {
        serviceId: 'new-version',
        serviceName: 'Mycie - komplet',
        basePriceNet: 36_585,
        basePriceGross: 45_000,
        vatRate: 23,
        requireManualPrice: false,
    },
};

describe('pozycja na wygaszonej wersji usługi', () => {
    it('pokazuje nową cenę i „Odśwież cenę" podmienia wersję, zostawiając rabat i notatkę', async () => {
        const onChange = vi.fn();
        render(
            <ThemeProvider theme={theme}>
                <ServicesTable services={[oldLine]} onChange={onChange} />
            </ThemeProvider>
        );

        expect(screen.getByText('Cena usługi uległa zmianie, nowa cena: 450,00 zł')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Odśwież cenę' }));

        const [next] = onChange.mock.calls[0][0] as ServiceLineItem[];
        expect(next).toMatchObject({
            serviceId: 'new-version',
            basePriceNet: 36_585,
            basePriceGross: 45_000,
            adjustment: { type: 'PERCENT', value: 10 },
            note: 'klient stały',
            newerVersion: null,
        });
    });

    it('bez kliknięcia pozycja zostaje przy starym id i starej cenie', () => {
        const onChange = vi.fn();
        render(
            <ThemeProvider theme={theme}>
                <ServicesTable services={[oldLine]} onChange={onChange} />
            </ThemeProvider>
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it('przy usłudze z ceną ustalaną ręcznie odświeżenie zmienia wersję, a cenę zostawia', () => {
        const manual = applyNewerVersion({
            ...oldLine,
            newerVersion: { ...oldLine.newerVersion!, basePriceNet: 0, basePriceGross: 0, requireManualPrice: true },
        });
        expect(manual).toMatchObject({ serviceId: 'new-version', basePriceNet: 30_000, basePriceGross: 36_900, requireManualPrice: true });
    });
});
