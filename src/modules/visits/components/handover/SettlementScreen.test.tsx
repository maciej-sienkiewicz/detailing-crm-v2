// @vitest-environment jsdom
//
// Ekran rozliczenia przy wydaniu po przeprojektowaniu: decyzje po lewej, kwota,
// „Sprawdź przed wysłaniem” i braki po prawej, przycisk nazwany skutkiem. Biznes zgłaszał,
// że dawny ekran „nie budzi zaufania” i „nie wiadomo, gdzie patrzeć”.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SettlementSection, type PriceControls } from './SettlementSection';
import { SettlementSummary } from './SettlementSummary';
import type { InvoiceControls } from './InvoiceSection';
import {
    invoiceItemsOf,
    linesFromPrices,
    priceFromService,
    totalsOf,
    type HandoverProblem,
    type HandoverState,
} from '../../types/handover';
import type { CompanySettings } from '@/modules/settings/types';

const prices = [
    priceFromService({ id: 'c', serviceName: 'Powłoka ceramiczna', vatRate: 23, basePriceGross: 150_000, finalPriceNet: 121_951, finalPriceGross: 150_000 }),
    priceFromService({ id: 'p', serviceName: 'Pranie tapicerki', vatRate: 8, basePriceGross: 20_000, finalPriceNet: 18_519, finalPriceGross: 20_000 }),
];

const state = (overrides: Partial<HandoverState> = {}): HandoverState => ({
    paymentMethod: 'CARD',
    documentType: 'INVOICE',
    buyer: { nip: '5213017228', name: 'Flota Serwis Sp. z o.o.', addressLine1: 'ul. Przemysłowa 7', addressLine2: '30-001 Kraków', email: '' },
    prices,
    lines: linesFromPrices(prices),
    splitRemainder: false,
    remainderInput: '',
    exemptionBasis: '',
    protocolSigned: true,
    sendToKsef: null,
    thankYouSms: false,
    ...overrides,
});

const controls = (overrides: Partial<InvoiceControls> = {}): InvoiceControls => ({
    linesMatch: true,
    restoredAt: null,
    resetLines: vi.fn(),
    setInvoiceOther: vi.fn(),
    setRemainderInput: vi.fn(),
    changeLine: vi.fn(),
    mergeSelected: vi.fn(() => null),
    unmerge: vi.fn(),
    ...overrides,
});

const priceControls = (overrides: Partial<PriceControls> = {}): PriceControls => ({
    changePrice: vi.fn(),
    resetPrices: vi.fn(),
    discount: 0,
    totalGross: 170_000,
    ...overrides,
});

const company = {
    name: 'Detail Studio', taxId: '5261040828', street: 'ul. Zabłocie 23', postalCode: '30-701', city: 'Kraków',
} as unknown as CompanySettings;

const wrap = (node: React.ReactNode) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>{node}</ThemeProvider>
    </QueryClientProvider>,
);

const left = (s: HandoverState, opts: { remainder?: number; c?: InvoiceControls; pc?: PriceControls; patch?: (c: Partial<HandoverState>) => void; external?: boolean } = {}) => {
    const items = invoiceItemsOf(s);
    return wrap(
        <SettlementSection
            state={s}
            patch={opts.patch ?? vi.fn()}
            currency="PLN"
            invoiceItems={items}
            invoiceGross={items.reduce((sum, i) => sum + Number(i.gross.replace(',', '.')) * 100, 0)}
            remainder={opts.remainder ?? 0}
            remainderAuto={opts.remainder ?? 0}
            settledGross={totalsOf(s.prices).gross}
            sellerComplete
            company={company}
            problemsIn={() => []}
            invoicedExternally={opts.external ?? false}
            controls={opts.c ?? controls()}
            priceControls={opts.pc ?? priceControls()}
        />,
    );
};

const right = (s: HandoverState, opts: { invoiceGross?: number; remainder?: number; originalGross?: number; problems?: HandoverProblem[]; sendToKsef?: boolean; ksefBlocked?: 'no-token' | 'no-permission' | null; external?: boolean } = {}) =>
    wrap(
        <SettlementSummary
            state={s}
            totals={totalsOf(s.prices)}
            originalGross={opts.originalGross ?? 170_000}
            currency="PLN"
            invoiceItems={invoiceItemsOf(s)}
            invoiceGross={opts.invoiceGross ?? 170_000}
            remainder={opts.remainder ?? 0}
            payable={s.splitRemainder ? (opts.invoiceGross ?? 170_000) + (opts.remainder ?? 0) : undefined}
            invoicedExternally={opts.external ?? false}
            sendToKsef={opts.sendToKsef ?? true}
            ksefBlocked={opts.ksefBlocked ?? null}
            transferDueDate={null}
            problems={opts.problems ?? []}
        />,
    );

afterEach(cleanup);

describe('Lewa kolumna: decyzje', () => {
    it('trzy dokumenty: Paragon, Faktura VAT, Inny dokument', () => {
        left(state());
        const group = screen.getByRole('group', { name: 'Dokument dla klienta' });
        expect(within(group).getAllByRole('button').map(b => b.textContent)).toEqual([
            'Paragon', 'Faktura VAT', 'Inny dokument',
        ]);
    });

    it('podział to sposób zapłaty faktury: link przy formie zapłaty, tylko przy fakturze', () => {
        const c = controls();
        left(state(), { c });
        fireEvent.click(screen.getByRole('button', { name: 'Podziel płatność: faktura + inny dokument' }));
        expect(c.setInvoiceOther).toHaveBeenCalledWith(true);

        cleanup();
        left(state({ documentType: 'RECEIPT' }));
        expect(screen.queryByRole('button', { name: /Podziel płatność/ })).not.toBeInTheDocument();
    });

    it('„Nie dziel” wraca do faktury na całość; zmiana dokumentu zdejmuje podział', () => {
        const patch = vi.fn();
        const c = controls();
        left(state({ splitRemainder: true }), { patch, c, remainder: 50_000 });

        fireEvent.click(screen.getByRole('button', { name: 'Nie dziel' }));
        expect(c.setInvoiceOther).toHaveBeenLastCalledWith(false);

        fireEvent.click(screen.getByRole('button', { name: 'Paragon' }));
        expect(patch).toHaveBeenCalledWith({ documentType: 'RECEIPT' });
    });

    it('bez etykiety „dlaczego”, bez przełącznika KSeF, bez ostrzeżenia o nieodwracalności', () => {
        left(state());
        expect(screen.queryByText(/bo klient ma NIP/)).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByText(/nie można edytować ani usunąć/)).not.toBeInTheDocument();
    });

    it('nabywca z NIP-em i adresem, pozycje zwinięte do jednej linii i rozwijane', () => {
        left(state());
        expect(screen.getByText('Flota Serwis Sp. z o.o.')).toBeInTheDocument();
        expect(screen.getByText('NIP 521-301-72-28')).toBeInTheDocument();
        expect(screen.getByText(/2 pozycje/).textContent).toMatch(/1700,00\szł brutto/);
        expect(screen.queryByRole('list', { name: 'Pozycje faktury' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Pokaż pozycje' }));

        expect(within(screen.getByRole('list', { name: 'Pozycje faktury' })).getByText('Pranie tapicerki')).toBeInTheDocument();
    });

    it('„Podgląd faktury” w lewej kolumnie otwiera wizualizację faktury', () => {
        left(state());
        fireEvent.click(screen.getByRole('button', { name: 'Podgląd faktury' }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('Detail Studio')).toBeInTheDocument();
        expect(within(dialog).getByText('Do zapłaty').parentElement?.textContent).toMatch(/1700,00/);
    });

    it('podział: każda pozycja na fakturze z polem kwoty, bez kolumny „Dokument”, pod nimi dwie kwoty', () => {
        const lines = linesFromPrices(prices).map(l => (l.serviceIds[0] === 'p' ? { ...l, partialGross: '0' } : l));
        const c = controls();
        left(state({ splitRemainder: true, lines }), { remainder: 18_519, c });

        expect(screen.queryByText('Dokument')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Jedna pozycja na każdą stawkę' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Pozycja 2 na fakturze')).not.toBeInTheDocument();
        expect(screen.getByText('Kwota na fakturze').parentElement?.textContent).toMatch(/1500,00/);
        // Inny dokument to pole z kwotą wyliczoną (netto prania, bez VAT) w podpowiedzi.
        expect(screen.getByLabelText('Kwota innego dokumentu')).toHaveAttribute('placeholder', expect.stringMatching(/185,19/));
        expect(screen.getByText('Forma zapłaty faktury')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Kwota innego dokumentu'), { target: { value: '190' } });
        expect(c.setRemainderInput).toHaveBeenCalledWith('190');
        fireEvent.change(screen.getByLabelText('Kwota na fakturze, pozycja 2'), { target: { value: '150' } });
        expect(c.changeLine).toHaveBeenCalledWith(1, { partialGross: '150' });
    });

    it('podział: pod przemianowaną pozycją nie ma „Usługa: …”', () => {
        const lines = linesFromPrices(prices).map(l => (l.serviceIds[0] === 'c' ? { ...l, name: 'Pozycja na fakturze' } : l));
        left(state({ splitRemainder: true, lines }));

        expect(screen.queryByText(/Usługa: Powłoka ceramiczna/)).not.toBeInTheDocument();
    });

    it('ceny usług: zmiana ceny w edytorze to zmiana ceny wizyty, z rabatem widocznym od razu', () => {
        const pc = priceControls({ discount: 50_000, totalGross: 120_000 });
        left(state(), { pc });

        expect(screen.getByText('Rabat przy wydaniu 500,00 zł')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Zmień ceny' }));
        fireEvent.change(screen.getByLabelText('Brutto: Powłoka ceramiczna'), { target: { value: '1000,00' } });
        expect(pc.changePrice).toHaveBeenCalledWith('c', { gross: '1000,00' });
    });

    it('scalenie zaznaczonych pozycji idzie do akcji, a jej odmowa jest pokazana', () => {
        const c = controls({ mergeSelected: vi.fn(() => 'Scalić można tylko usługi z tą samą stawką VAT.') });
        left(state(), { c });
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż pozycje' }));
        fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
        fireEvent.click(screen.getByLabelText('Zaznacz pozycję 1 do scalenia'));
        fireEvent.click(screen.getByLabelText('Zaznacz pozycję 2 do scalenia'));
        fireEvent.click(screen.getByRole('button', { name: /Scal zaznaczone/ }));

        expect(c.mergeSelected).toHaveBeenCalledWith([0, 1]);
        expect(screen.getByRole('alert').textContent).toMatch(/tą samą stawką VAT/);
    });

    it('księgowość wystawia faktury: bez podziału i bez pozycji', () => {
        left(state(), { external: true });
        expect(screen.queryByRole('button', { name: /Podziel płatność/ })).not.toBeInTheDocument();
        expect(screen.queryByText(/pozycje,/)).not.toBeInTheDocument();
        expect(screen.getByText(/Fakturę wystawi księgowość/)).toBeInTheDocument();
    });
});

describe('Prawa kolumna: kwota, sprawdź przed wysłaniem, braki', () => {
    it('faktura do KSeF: dokument, nabywca, data, kwota faktury, płatność, protokół', () => {
        right(state());
        const review = screen.getByRole('heading', { name: 'Sprawdź przed wysłaniem' }).parentElement!;
        expect(review.textContent).toMatch(/Faktura VAT/);
        expect(review.textContent).toMatch(/trafi do KSeF/);
        expect(review.textContent).toMatch(/Flota Serwis Sp\. z o\.o\./);
        expect(review.textContent).toMatch(/NIP 521-301-72-28/);
        expect(review.textContent).toMatch(/Dziś,/);
        expect(review.textContent).toMatch(/Karta/);
        expect(review.textContent).toMatch(/Podpisany/);
        expect(screen.getByLabelText('Podsumowanie rozliczenia').textContent).toMatch(/1700,00\szł/);
    });

    it('brak tokenu: podsumowanie mówi wprost, że faktura nie trafi do KSeF', () => {
        right(state(), { sendToKsef: false, ksefBlocked: 'no-token' });
        expect(screen.getByText(/nie trafi do KSeF: brak tokenu/)).toBeInTheDocument();
    });

    it('„Faktura + Inny dokument”: do zapłaty faktura + inny dokument, bez VAT od części poza fakturą', () => {
        right(state({ splitRemainder: true }), { invoiceGross: 120_000, remainder: 40_651 });
        const aside = screen.getByLabelText('Podsumowanie rozliczenia');
        expect(aside.textContent).toMatch(/Do zapłaty1606,51\szł/);
        expect(aside.textContent).toMatch(/faktura 1200,00\szł, inny dokument 406,51\szł/);
        expect(aside.textContent).toMatch(/cena usług 1700,00\szł, bez VAT na innym dokumencie 93,49\szł mniej/);
        expect(aside.textContent).toMatch(/Inny dokument406,51\szłbez paragonu, bez VAT, gotówka/);
    });

    it('netto i VAT pokazane z faktury, a rabat przy wydaniu obok kwoty', () => {
        right(state(), { originalGross: 180_000 });
        const aside = screen.getByLabelText('Podsumowanie rozliczenia');
        expect(aside.textContent).toMatch(/netto 1404,70\szł, VAT 295,30\szł/);
        expect(aside.textContent).toMatch(/było 1800,00\szł, rabat przy wydaniu 100,00\szł/);
    });

    it('paragon: podsumowanie bez nabywcy i bez KSeF', () => {
        right(state({ documentType: 'RECEIPT' }));
        expect(screen.getByRole('heading', { name: 'Podsumowanie' })).toBeInTheDocument();
        expect(screen.queryByText(/KSeF/)).not.toBeInTheDocument();
        expect(screen.queryByText('Nabywca')).not.toBeInTheDocument();
    });

    it('braki: jedna lista „Zanim wydasz auto”, każda pozycja prowadzi do pola', () => {
        right(state(), { problems: [{ section: 'buyer', message: 'NIP nabywcy ma błędną sumę kontrolną - sprawdź cyfry.' }] });
        const list = screen.getByRole('alert', { name: 'Do poprawienia' });
        expect(within(list).getByRole('button', { name: /błędną sumę kontrolną/ })).toBeInTheDocument();
    });

    it('podsumowanie tylko pokazuje: zmiany nabywcy, pozycji i płatności są tylko w lewej kolumnie', () => {
        right(state());
        const aside = screen.getByLabelText('Podsumowanie rozliczenia');
        expect(within(aside).queryByRole('button', { name: 'Zmień' })).not.toBeInTheDocument();
        expect(within(aside).queryByRole('button', { name: /Podgląd/ })).not.toBeInTheDocument();
    });
});
