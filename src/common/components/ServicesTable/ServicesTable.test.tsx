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

type User = ReturnType<typeof userEvent.setup>;

/** Klik w cenę wiersza - jedyna droga do „Cena w tej rezerwacji". */
const openPrice = (user: User, serviceName: string) =>
    user.click(screen.getByRole('button', { name: new RegExp(`^Zmień cenę w tej rezerwacji: ${serviceName}`) }));

/** Pozycja menu ⋯ wiersza. */
const openMenuItem = async (user: User, serviceName: string, item: string) => {
    await user.click(screen.getByRole('button', { name: `Więcej akcji: ${serviceName}` }));
    await user.click(screen.getByRole('menuitem', { name: item }));
};

describe('ServicesTable - rabat na pozycji z ceną ręczną', () => {
    it('okno ceny pokazuje ustaloną cenę jako cenę wyjściową, a nie 0 zł', async () => {
        const { user } = renderTable([manualLine()]);

        await openPrice(user, 'Wycena indywidualna');

        const base = within(screen.getByText('Cena ustalona ręcznie').parentElement!);
        expect(base.getByText(/^1\s?900,00 zł$/)).toBeInTheDocument();
        expect(base.getByText(/1\s?544,72 zł netto/)).toBeInTheDocument();
    });

    it('rabat 10% liczy się od ustalonej ceny, a cena przechodzi do bazy z dokładnym brutto', async () => {
        const { onChange, user } = renderTable([manualLine()]);

        await openPrice(user, 'Wycena indywidualna');
        await user.click(screen.getByRole('button', { name: 'Rabat' }));
        await user.click(screen.getByRole('button', { name: '%' }));
        await user.type(screen.getByPlaceholderText('0'), '10');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        expect(lastLines(onChange)[0]).toMatchObject({
            basePriceNet: NET,
            basePriceGross: GROSS,
            adjustment: { type: 'PERCENT', value: -10 },
        });
    });

    it('pozycja z ceną ręczną bez zmiany nie ma znacznika ani przycisku powrotu', async () => {
        const { user } = renderTable([manualLine()]);

        expect(screen.queryByText(/^(Rabat|Dopłata) /)).not.toBeInTheDocument();
        await openPrice(user, 'Wycena indywidualna');
        expect(screen.queryByRole('button', { name: 'Usuń zmianę ceny' })).not.toBeInTheDocument();
    });

    it('„Usuń zmianę ceny" zostawia cenę 1900,00 zł, a nie robi z pozycji usługi za 0 zł', async () => {
        // Stan po rabacie na pozycji z ceną ręczną: ustalona cena siedzi już w bazie.
        const discounted: ServiceLineItem = {
            ...manualLine(),
            basePriceNet: NET,
            basePriceGross: GROSS,
            requireManualPrice: true,
            adjustment: { type: 'PERCENT', value: -10 },
        };
        const { onChange, user } = renderTable([discounted]);

        await openPrice(user, 'Wycena indywidualna');
        await user.click(screen.getByRole('button', { name: 'Usuń zmianę ceny' }));

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
        await user.click(screen.getByRole('button', { name: 'Kwota brutto' }));
        await user.type(screen.getByPlaceholderText('0'), '200');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        const [manual, typed] = lastLines(onChange);
        expect(manual).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, adjustment: { type: 'FIXED_GROSS', value: 10_000 } });
        expect(typed).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, adjustment: { type: 'FIXED_GROSS', value: 10_000 } });
    });
});

describe('ServicesTable - „Cena w tej rezerwacji" nie rusza cennika', () => {
    it('„Ustal cenę" 1900,00 zł brutto: dokładnie 190000 gr, cennik nie jest wołany', async () => {
        const onSaveService = vi.fn();
        const { onChange, user } = renderTable([catalogLine()], onSaveService);

        await openPrice(user, 'Mycie zewnętrzne');
        const gross = screen.getByLabelText('Brutto');
        await user.clear(gross);
        await user.type(gross, '1900');
        // Netto liczy się z brutta raz - i to brutto zostaje, nie odtworzone z netta.
        expect(screen.getByLabelText('Netto')).toHaveValue('1544,72');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        expect(onSaveService).not.toHaveBeenCalled();
        expect(lastLines(onChange)[0]).toMatchObject({
            serviceId: 'svc-net',
            basePriceNet: 10_000,
            basePriceGross: 12_300,
            adjustment: { type: 'SET_GROSS', value: GROSS },
        });
    });

    it('„Dopłata" 300 zł brutto do 1900,00 zł daje równo 2200,00 zł brutto', async () => {
        const { onChange, user } = renderTable([typedGrossLine()]);

        await openPrice(user, 'Powłoka ceramiczna');
        await user.click(screen.getByRole('button', { name: 'Dopłata' }));
        await user.type(screen.getByPlaceholderText('0'), '300');
        expect(screen.getByText(/Drożej o 300,00 zł/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        expect(lastLines(onChange)[0]).toMatchObject({
            basePriceNet: NET,
            basePriceGross: GROSS,
            adjustment: { type: 'SET_GROSS', value: 220_000 },
        });
    });

    it('„Dopłata" 10% zapisuje procent na plus', async () => {
        const { onChange, user } = renderTable([catalogLine()]);

        await openPrice(user, 'Mycie zewnętrzne');
        await user.click(screen.getByRole('button', { name: 'Dopłata' }));
        await user.click(screen.getByRole('button', { name: '%' }));
        await user.type(screen.getByPlaceholderText('0'), '10');
        await user.click(screen.getByRole('button', { name: 'Zastosuj' }));

        expect(lastLines(onChange)[0].adjustment).toEqual({ type: 'PERCENT', value: 10 });
    });

    it('wiersz mówi, co się stało z ceną: dopłata i rabat mają swoje słowa', () => {
        renderTable([
            { ...typedGrossLine(), adjustment: { type: 'SET_GROSS', value: 220_000 } },
            { ...catalogLine(), adjustment: { type: 'PERCENT', value: -10 } },
        ]);

        expect(screen.getByText(/^Dopłata 300,00 zł$/)).toBeInTheDocument();
        expect(screen.getByText('Rabat 10%')).toBeInTheDocument();
    });

    it('okno ma jeden wypełniony przycisk - „Zastosuj" (CLAUDE.md §2)', async () => {
        const { user } = renderTable([catalogLine()]);

        await openPrice(user, 'Mycie zewnętrzne');

        const dialog = screen.getByRole('dialog', { name: 'Cena w tej rezerwacji' });
        const filled = dialog.querySelectorAll('[data-variant="primary"]');
        expect(filled).toHaveLength(1);
        expect(filled[0]).toHaveTextContent('Zastosuj');
        expect(within(dialog).getByText(/Cennik zostaje bez zmian/)).toBeInTheDocument();
    });
});

describe('ServicesTable - menu ⋯ wiersza', () => {
    it('usługa z cennika ma „Zmień w cenniku…", z ostrzeżeniem w oknie', async () => {
        const { user } = renderTable([catalogLine()]);

        await openMenuItem(user, 'Mycie zewnętrzne', 'Zmień w cenniku…');

        expect(screen.getByText('Zmiana dla wszystkich kolejnych klientów')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zapisz w cenniku' })).toBeInTheDocument();
    });

    it('usługa spoza cennika nie ma „Zmień w cenniku…"', async () => {
        const { user } = renderTable([{ ...catalogLine(), id: 'temp-1', serviceId: 'temp-1' }]);

        await user.click(screen.getByRole('button', { name: 'Więcej akcji: Mycie zewnętrzne' }));

        expect(screen.queryByRole('menuitem', { name: 'Zmień w cenniku…' })).not.toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Edytuj usługę…' })).toBeInTheDocument();
    });

    it('„Usuń z rezerwacji" usuwa pozycję', async () => {
        const { onChange, user } = renderTable([catalogLine(), typedGrossLine()]);

        await openMenuItem(user, 'Mycie zewnętrzne', 'Usuń z rezerwacji');

        expect(lastLines(onChange)).toEqual([typedGrossLine()]);
    });
});

describe('ServicesTable - „Zmień w cenniku"', () => {
    it('wyczyszczone brutto czyści też netto - „Zapisz" nie wysyła połowy pary sprzed zmiany', async () => {
        const { onChange, onSaveService, user } = renderTable([typedGrossLine()]);

        await openMenuItem(user, 'Powłoka ceramiczna', 'Zmień w cenniku…');
        await user.clear(screen.getByDisplayValue('1900,00'));

        expect(screen.queryByDisplayValue('1544,72')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Zapisz w cenniku' }));

        expect(screen.getByText('Podaj poprawną cenę')).toBeInTheDocument();
        expect(onSaveService).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('wpisane brutto 1900,00 idzie do cennika i do pozycji dokładnie', async () => {
        const onSaveService = vi.fn().mockResolvedValue(null);
        const { onChange, user } = renderTable([{ ...catalogLine() }], onSaveService);

        await openMenuItem(user, 'Mycie zewnętrzne', 'Zmień w cenniku…');
        const grossField = screen.getByDisplayValue('123,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        expect(screen.getByDisplayValue('1544,72')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Zapisz w cenniku' }));

        expect(onSaveService).toHaveBeenCalledWith('svc-net', expect.objectContaining({
            basePriceNet: NET,
            basePriceGross: GROSS,
        }));
        expect(lastLines(onChange)[0]).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS });
    });
});

describe('ServicesTable - „Edytuj usługę" na usłudze spoza cennika', () => {
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

        await openMenuItem(user, 'powłoka na felgi', 'Edytuj usługę…');
        const grossField = screen.getByDisplayValue('900,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        await user.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(onSaveService).not.toHaveBeenCalled();
        expect(screen.queryByText('Nie udało się zapisać. Spróbuj ponownie.')).not.toBeInTheDocument();
        // Okno się zamknęło, a pozycja niesie dokładną parę - 1900,00 zł brutto, nie 1900,01.
        expect(screen.queryByText('Edytuj usługę')).not.toBeInTheDocument();
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

        await openMenuItem(user, 'powłoka na felgi', 'Edytuj usługę…');
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

        await openMenuItem(user, 'Mycie zewnętrzne', 'Zmień w cenniku…');
        const grossField = screen.getByDisplayValue('123,00');
        await user.clear(grossField);
        await user.type(grossField, '1900');
        await user.click(screen.getByRole('button', { name: 'Zapisz w cenniku' }));

        expect(onSaveService).toHaveBeenCalledTimes(1);
    });
});
