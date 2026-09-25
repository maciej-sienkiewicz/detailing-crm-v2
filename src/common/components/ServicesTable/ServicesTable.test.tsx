// @vitest-environment jsdom
//
// Wspólna tabela usług: przyjęcie pojazdu, edycja rezerwacji, szybka rezerwacja
// z kalendarza i wycena leada. Sprawdza, że przyciski tabeli naprawdę przechodzą
// przez reguły z CLAUDE.md §1 - cena wpisana jako 1900,00 zł brutto (23% VAT:
// 154472 gr netto, a 154472 × 1,23 = 190001 gr) zostaje 190000, a nie 190001.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ServicesTable } from './index';
import type { ServiceLineItem } from './index';

const NET = 154_472;
const GROSS = 190_000;

/** Pozycja wpisana od strony brutto - brutto nie wynika z netta. */
const typedGrossLine = (): ServiceLineItem => ({
    id: 'line-gross',
    serviceId: 'svc-gross',
    serviceName: 'Powłoka ceramiczna',
    basePriceNet: NET,
    basePriceGross: GROSS,
    vatRate: 23,
    adjustment: { type: 'PERCENT', value: 0 },
});

/** Pozycja z cennika, której brutto zgadza się z netto × stawka. */
const catalogLine = (): ServiceLineItem => ({
    id: 'line-net',
    serviceId: 'svc-net',
    serviceName: 'Mycie zewnętrzne',
    basePriceNet: 10_000,
    basePriceGross: 12_300,
    vatRate: 23,
    adjustment: { type: 'PERCENT', value: 0 },
});

/** Cena ręczna tak, jak wraca z API: baza 0, cena w SET_GROSS. */
const manualLine = (): ServiceLineItem => ({
    id: 'line-manual',
    serviceId: 'svc-manual',
    serviceName: 'Wycena indywidualna',
    basePriceNet: 0,
    vatRate: 23,
    adjustment: { type: 'SET_GROSS', value: GROSS },
});

const renderTable = (services: ServiceLineItem[], onSaveService = vi.fn()) => {
    const onChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <ServicesTable services={services} onChange={onChange} onSaveService={onSaveService} />
        </ThemeProvider>
    );
    return { onChange, onSaveService, user: userEvent.setup() };
};

/** Ostatnia lista pozycji oddana rodzicowi. */
const lastLines = (onChange: ReturnType<typeof vi.fn>): ServiceLineItem[] =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0];

describe('ServicesTable - zbiorcza zmiana stawki VAT', () => {
    it('ta sama stawka nie rusza pozycji - dokładne brutto 1900,00 zostaje', async () => {
        const { onChange, user } = renderTable([typedGrossLine(), catalogLine()]);

        await user.click(screen.getByTitle('Zmień stawkę VAT dla wszystkich'));
        await user.click(screen.getByRole('button', { name: '23%' }));

        expect(lastLines(onChange)).toEqual([typedGrossLine(), catalogLine()]);
    });

    it('23% → 8%: wpisane brutto zostaje, netto liczy się od nowa; pozycja z netta zachowuje netto', async () => {
        const { onChange, user } = renderTable([typedGrossLine(), catalogLine()]);

        await user.click(screen.getByTitle('Zmień stawkę VAT dla wszystkich'));
        await user.click(screen.getByRole('button', { name: '8%' }));

        const [gross, net] = lastLines(onChange);
        expect(gross).toMatchObject({ vatRate: 8, basePriceGross: GROSS, basePriceNet: 175_926 });
        expect(net).toMatchObject({ vatRate: 8, basePriceNet: 10_000 });
        // Brutto policzone przy starej stawce nie może udawać dokładnego przy nowej.
        expect(net.basePriceGross).toBeUndefined();
    });
});

describe('ServicesTable - rabat na pozycji z ceną ręczną', () => {
    it('okno rabatu pokazuje ustaloną cenę jako cenę przed rabatem, a nie 0 zł', async () => {
        const { user } = renderTable([manualLine()]);

        await user.click(screen.getByTitle('Edytuj rabat'));

        const before = within(screen.getByText('Cena przed rabatem').parentElement!);
        expect(before.getByText('1544.72 zł')).toBeInTheDocument();
        expect(before.getByText('1900.00 zł')).toBeInTheDocument();
    });

    it('rabat 10% liczy się od ustalonej ceny, a cena przechodzi do bazy z dokładnym brutto', async () => {
        const { onChange, user } = renderTable([manualLine()]);

        await user.click(screen.getByTitle('Edytuj rabat'));
        await user.click(screen.getByRole('button', { name: 'Procent' }));
        await user.type(screen.getByPlaceholderText('0'), '10');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        expect(lastLines(onChange)[0]).toMatchObject({
            basePriceNet: NET,
            basePriceGross: GROSS,
            adjustment: { type: 'PERCENT', value: -10 },
        });
    });

    it('„Usuń rabat" zostawia cenę 1900,00 zł, a nie robi z pozycji usługi za 0 zł', async () => {
        const { onChange, user } = renderTable([manualLine()]);

        await user.click(screen.getByTitle('Edytuj rabat'));
        await user.click(screen.getByRole('button', { name: 'Usuń rabat' }));

        expect(lastLines(onChange)[0]).toMatchObject({
            basePriceNet: NET,
            basePriceGross: GROSS,
            adjustment: { type: 'PERCENT', value: 0 },
        });
    });

    it('„Rabatuj wszystko" upustem brutto: każda pozycja schodzi z dokładnego brutto', async () => {
        const { onChange, user } = renderTable([manualLine(), typedGrossLine()]);

        await user.click(screen.getByRole('button', { name: /Rabatuj wszystko/ }));
        // Łącznie przed rabatem liczy pozycję ręczną jej ceną, nie zerem.
        const before = within(screen.getByText('Łącznie przed rabatem').parentElement!);
        expect(before.getByText('3800.00 zł')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '−Brutto' }));
        await user.type(screen.getByPlaceholderText('0'), '200');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        const [manual, typed] = lastLines(onChange);
        expect(manual).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, adjustment: { type: 'FIXED_GROSS', value: 10_000 } });
        expect(typed).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, adjustment: { type: 'FIXED_GROSS', value: 10_000 } });
    });
});

describe('ServicesTable - „Edytuj pozycję"', () => {
    it('wyczyszczone brutto czyści też netto - „Zapisz" nie wysyła połowy pary sprzed zmiany', async () => {
        const { onChange, onSaveService, user } = renderTable([typedGrossLine()]);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        await user.clear(screen.getByDisplayValue('1900,00'));

        expect(screen.queryByDisplayValue('1544,72')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(screen.getByText('Podaj poprawną cenę')).toBeInTheDocument();
        expect(onSaveService).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('wpisane brutto 1900,00 idzie do cennika i do pozycji dokładnie', async () => {
        const onSaveService = vi.fn().mockResolvedValue(null);
        const { onChange, user } = renderTable([{ ...catalogLine() }], onSaveService);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const grossField = screen.getByDisplayValue('123,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        expect(screen.getByDisplayValue('1544,72')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(onSaveService).toHaveBeenCalledWith('svc-net', expect.objectContaining({
            basePriceNet: NET,
            basePriceGross: GROSS,
        }));
        expect(lastLines(onChange)[0]).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS });
    });
});

describe('ServicesTable - „Edytuj pozycję" na usłudze spoza cennika', () => {
    // Stan z produkcji: szybka rezerwacja w kalendarzu, usługa założona w locie
    // (QuickServiceModal bez zapisu do cennika) dostaje id `temp-<Date.now()>`, a pozycja
    // - to samo id jako lineId i serviceId (useQuickEventForm.handleQuickServiceCreate).
    const tempLine = (): ServiceLineItem => ({
        id: 'temp-1790326470364',
        serviceId: 'temp-1790326470364',
        serviceName: 'powłoka na felgi',
        basePriceNet: 73_171,
        basePriceGross: 90_000,
        vatRate: 23,
        adjustment: { type: 'PERCENT', value: 0 },
    });

    it('nowa cena nie idzie do cennika - pozycja zmienia się lokalnie, bez błędu', async () => {
        const onSaveService = vi.fn().mockRejectedValue(new Error('400 Invalid UUID string'));
        const { onChange, user } = renderTable([tempLine()], onSaveService);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const grossField = screen.getByDisplayValue('900,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(onSaveService).not.toHaveBeenCalled();
        expect(screen.queryByText('Nie udało się zapisać. Spróbuj ponownie.')).not.toBeInTheDocument();
        // Okno się zamknęło, a pozycja niesie dokładną parę - 1900,00 zł brutto, nie 1900,01.
        expect(screen.queryByText('Edytuj pozycję')).not.toBeInTheDocument();
        expect(lastLines(onChange)[0]).toMatchObject({
            id: 'temp-1790326470364',
            serviceId: 'temp-1790326470364',
            basePriceNet: NET,
            basePriceGross: GROSS,
        });
    });

    it('zmiana nazwy też zostaje na pozycji, bez wołania cennika', async () => {
        const onSaveService = vi.fn();
        const { onChange, user } = renderTable([tempLine()], onSaveService);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const nameField = screen.getByDisplayValue('powłoka na felgi');
        await user.clear(nameField);
        await user.type(nameField, 'Powłoka na felgi 4 szt.');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(onSaveService).not.toHaveBeenCalled();
        expect(lastLines(onChange)[0]).toMatchObject({ serviceName: 'Powłoka na felgi 4 szt.', basePriceGross: 90_000 });
    });

    it('pozycja z cennika nadal idzie do cennika', async () => {
        const onSaveService = vi.fn().mockResolvedValue(null);
        const { user } = renderTable([catalogLine()], onSaveService);

        await user.click(screen.getByTitle('Edytuj pozycję'));
        const grossField = screen.getByDisplayValue('123,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(onSaveService).toHaveBeenCalledTimes(1);
    });
});
