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
import { SettlementSection } from './SettlementSection';
import { SettlementSummary } from './SettlementSummary';
import type { InvoiceControls } from './InvoiceSection';
import { withDerived, type HandoverItem, type HandoverProblem, type HandoverState } from '../../types/handover';
import type { CompanySettings } from '@/modules/settings/types';

const item = (name: string, gross: string, vatRate: HandoverItem['vatRate']): HandoverItem =>
    withDerived({ name, net: '', gross, mode: 'GROSS', vatRate });

const state = (overrides: Partial<HandoverState> = {}): HandoverState => ({
    paymentMethod: 'CARD',
    documentType: 'INVOICE',
    buyer: { nip: '5213017228', name: 'Flota Serwis Sp. z o.o.', addressLine1: 'ul. Przemysłowa 7', addressLine2: '30-001 Kraków', email: '' },
    items: [item('Powłoka ceramiczna', '1500,00', '23'), item('Pranie tapicerki', '200,00', '8')],
    splitRemainder: false,
    remainderMethod: 'CASH',
    remainderWithoutReceipt: false,
    exemptionBasis: '',
    protocolSigned: true,
    sendToKsef: null,
    thankYouSms: false,
    ...overrides,
});

const controls = (overrides: Partial<InvoiceControls> = {}): InvoiceControls => ({
    itemsMatchServices: true,
    vatMismatch: null,
    restoredAt: null,
    resetItemsToServices: vi.fn(),
    setInvoiceOther: vi.fn(),
    applyItemsPerRate: vi.fn(),
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

const left = (s: HandoverState, opts: { invoiceGross?: number; remainder?: number; c?: InvoiceControls; patch?: (c: Partial<HandoverState>) => void; external?: boolean } = {}) =>
    wrap(
        <SettlementSection
            state={s}
            patch={opts.patch ?? vi.fn()}
            currency="PLN"
            invoiceGross={opts.invoiceGross ?? 170_000}
            remainder={opts.remainder ?? 0}
            sellerComplete
            company={company}
            problemsIn={() => []}
            invoicedExternally={opts.external ?? false}
            controls={opts.c ?? controls()}
        />,
    );

const right = (s: HandoverState, opts: { invoiceGross?: number; remainder?: number; problems?: HandoverProblem[]; sendToKsef?: boolean; ksefBlocked?: 'no-token' | 'no-permission' | null; external?: boolean } = {}) =>
    wrap(
        <SettlementSummary
            state={s}
            totals={{ net: 140_470, vat: 29_530, gross: 170_000 }}
            currency="PLN"
            invoiceGross={opts.invoiceGross ?? 170_000}
            remainder={opts.remainder ?? 0}
            invoicedExternally={opts.external ?? false}
            sendToKsef={opts.sendToKsef ?? true}
            ksefBlocked={opts.ksefBlocked ?? null}
            transferDueDate={null}
            problems={opts.problems ?? []}
            company={company}
        />,
    );

afterEach(cleanup);

describe('Lewa kolumna: decyzje', () => {
    it('cztery dokumenty, w tym od razu „Faktura + Inny dokument”', () => {
        left(state());
        const group = screen.getByRole('group', { name: 'Dokument dla klienta' });
        expect(within(group).getAllByRole('button').map(b => b.textContent)).toEqual([
            'Paragon', 'Faktura VAT', 'Faktura + Inny dokument', 'Inne rozliczenie',
        ]);
    });

    it('wybór „Faktura + Inny dokument” ustawia fakturę i włącza podział', () => {
        const patch = vi.fn();
        const c = controls();
        left(state({ documentType: 'RECEIPT' }), { patch, c });

        fireEvent.click(screen.getByRole('button', { name: 'Faktura + Inny dokument' }));

        expect(patch).toHaveBeenCalledWith({ documentType: 'INVOICE' });
        expect(c.setInvoiceOther).toHaveBeenCalledWith(true);
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

    it('„Faktura + Inny dokument”: edycja kwot otwarta, pod nią dwie kwoty', () => {
        left(state({ splitRemainder: true, remainderWithoutReceipt: true, items: [item('Powłoka ceramiczna', '1000,00', '23'), item('Pranie tapicerki', '200,00', '8')] }),
            { invoiceGross: 120_000, remainder: 50_000 });

        expect(screen.getByLabelText('Brutto pozycji 1')).toBeInTheDocument();
        expect(screen.getByText('Kwota na fakturze').parentElement?.textContent).toMatch(/1200,00/);
        expect(screen.getByText('Kwota do zapłaty na innym dokumencie').parentElement?.textContent).toMatch(/500,00/);
        expect(screen.getByText('Forma zapłaty faktury')).toBeInTheDocument();
    });

    it('faktura niższa niż wizyta przy zwykłej fakturze: jedno zdanie i reszta na inny dokument', () => {
        const c = controls();
        left(state(), { invoiceGross: 120_000, remainder: 50_000, c });

        expect(screen.getByRole('alert').textContent).toMatch(/niższa niż kwota wizyty o 500,00/);
        fireEvent.click(screen.getByRole('button', { name: 'Resztę na inny dokument' }));
        expect(c.setInvoiceOther).toHaveBeenCalledWith(true);
    });

    it('księgowość wystawia faktury: bez „Faktura + Inny dokument” i bez pozycji', () => {
        left(state(), { external: true });
        expect(screen.queryByRole('button', { name: 'Faktura + Inny dokument' })).not.toBeInTheDocument();
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

    it('„Faktura + Inny dokument”: kwota faktury i inny dokument gotówką', () => {
        right(state({ splitRemainder: true, remainderWithoutReceipt: true }), { invoiceGross: 120_000, remainder: 50_000 });
        const aside = screen.getByLabelText('Podsumowanie rozliczenia');
        expect(aside.textContent).toMatch(/faktura 1200,00\szł, inny dokument 500,00\szł/);
        expect(aside.textContent).toMatch(/Inny dokument500,00\szłgotówka/);
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

    it('„Podgląd” otwiera wizualizację faktury', () => {
        right(state());
        fireEvent.click(screen.getByRole('button', { name: 'Podgląd' }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('Detail Studio')).toBeInTheDocument();
        expect(within(dialog).getByText('Do zapłaty').parentElement?.textContent).toMatch(/1700,00/);
    });
});
