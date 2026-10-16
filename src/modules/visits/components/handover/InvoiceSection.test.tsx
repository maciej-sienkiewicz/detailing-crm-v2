// @vitest-environment jsdom
//
// Rozliczenie wizyty dwoma dokumentami: klient prosi o fakturę na część kwoty, resztę
// płaci za paragonem. Ekran ma prowadzić jednym polem kwoty, a suma obu dokumentów
// zawsze równa się kwocie wizyty - bez ręcznego przeliczania pozycji.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { KsefAutomation } from '@/modules/finance/hooks';
import { InvoiceSection, type InvoiceControls } from './InvoiceSection';
import { withDerived, type HandoverItem, type HandoverState } from '../../types/handover';

const item = (name: string, gross: string, vatRate: HandoverItem['vatRate']): HandoverItem =>
    withDerived({ name, net: '', gross, mode: 'GROSS', vatRate });

const state = (overrides: Partial<HandoverState> = {}): HandoverState => ({
    paymentMethod: 'TRANSFER',
    documentType: 'INVOICE',
    buyer: { nip: '5213017228', name: 'Auto Serwis sp. z o.o.', addressLine1: '', addressLine2: '', email: '' },
    items: [item('Powłoka ceramiczna', '15000,00', '23'), item('Tapicerka', '2000,00', '8')],
    splitRemainder: false,
    remainderMethod: 'CASH',
    remainderWithoutReceipt: false,
    exemptionBasis: '',
    protocolSigned: false,
    sendToKsef: null,
    thankYouSms: false,
    ...overrides,
});

const controls = (overrides: Partial<InvoiceControls> = {}): InvoiceControls => ({
    itemsMatchServices: true,
    vatMismatch: null,
    restoredAt: null,
    resetItemsToServices: vi.fn(),
    setInvoiceAmount: vi.fn(),
    setInvoiceNet: vi.fn(),
    visitNet: 1_404_668,
    setInvoiceOther: vi.fn(),
    applyItemsPerRate: vi.fn(),
    ...overrides,
});

const ksef = { isLoading: false, moduleEnabled: false, configured: false } as unknown as KsefAutomation;

const renderSection = (
    s: HandoverState,
    invoiceGross: number,
    c: InvoiceControls,
    visitGross = 1_700_000,
    patch: (changes: Partial<HandoverState>) => void = vi.fn(),
) =>
    render(
        <ThemeProvider theme={theme}>
            <InvoiceSection
                state={s}
                patch={patch}
                currency="PLN"
                visitGross={visitGross}
                invoiceGross={invoiceGross}
                remainder={visitGross - invoiceGross}
                sellerComplete
                company={undefined}
                problemsIn={() => []}
                ksef={ksef}
                sendToKsef={false}
                canChooseSendToKsef={false}
                onSendToKsefChange={vi.fn()}
                controls={c}
            />
        </ThemeProvider>,
    );

afterEach(cleanup);

describe('InvoiceSection - Faktura + Inny', () => {
    const other = (overrides: Partial<HandoverState> = {}) =>
        state({ splitRemainder: true, remainderWithoutReceipt: true, ...overrides });

    it('zwykła faktura VAT nie pokazuje pól kwoty ani podziału', () => {
        renderSection(state(), 1_700_000, controls());

        expect(screen.queryByLabelText('Faktura netto')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Faktura brutto')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Podział kwoty wizyty')).not.toBeInTheDocument();
    });

    it('wpisane brutto przelicza fakturę od brutto', () => {
        const c = controls();
        renderSection(other(), 1_700_000, c);

        const gross = screen.getByLabelText('Faktura brutto');
        fireEvent.focus(gross);
        fireEvent.change(gross, { target: { value: '10 000,00' } });

        expect(c.setInvoiceAmount).toHaveBeenLastCalledWith(1_000_000);
        expect(c.setInvoiceNet).not.toHaveBeenCalled();
    });

    it('wpisane netto przelicza fakturę od netto', () => {
        const c = controls();
        renderSection(other(), 1_700_000, c);

        const net = screen.getByLabelText('Faktura netto');
        fireEvent.focus(net);
        fireEvent.change(net, { target: { value: '8130,08' } });

        expect(c.setInvoiceNet).toHaveBeenLastCalledWith(813_008);
        expect(c.setInvoiceAmount).not.toHaveBeenCalled();
    });

    it('bez fokusu oba pola pokazują sumy pozycji - drugie jest policzone z wpisanego', () => {
        renderSection(other({ items: [item('Powłoka ceramiczna', '10000,00', '23')] }), 1_000_000, controls());

        expect((screen.getByLabelText('Faktura brutto') as HTMLInputElement).value).toBe('10000,00');
        expect((screen.getByLabelText('Faktura netto') as HTMLInputElement).value).toBe('8130,08');
    });

    it('równanie Wizyta = Faktura + Inny, „Inny” zawsze gotówką i bez VAT - bez pytania o formę zapłaty', () => {
        renderSection(
            other({ items: [item('Powłoka ceramiczna', '8823,53', '23'), item('Tapicerka', '1176,47', '8')] }),
            1_000_000,
            controls({ itemsMatchServices: false }),
        );

        const equation = screen.getByLabelText('Podział kwoty wizyty');
        expect(within(equation).getByText('Wizyta').textContent).toMatch(/17\s000,00/);
        expect(within(equation).getByText('Faktura').textContent).toMatch(/10\s000,00/);
        expect(within(equation).getByText('Inny').textContent).toMatch(/7000,00/);
        expect(screen.queryByText(/Jak klient zapłacił/)).not.toBeInTheDocument();
        expect(screen.getByText('„Inny” zapisze się jako gotówka, bez VAT.')).toBeInTheDocument();
        expect(screen.queryByText(/zgodnie z usługami wizyty/)).not.toBeInTheDocument();
    });

    it('kwota równa kwocie wizyty: bez błędu, cała wizyta na fakturze, „Inny” nie powstaje', () => {
        const c = controls();
        const { unmount } = renderSection(other({ items: [item('Powłoka ceramiczna', '10000,00', '23')] }), 1_000_000, c);

        const gross = screen.getByLabelText('Faktura brutto');
        fireEvent.focus(gross);
        fireEvent.change(gross, { target: { value: '17000,00' } });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(c.setInvoiceAmount).toHaveBeenLastCalledWith(1_700_000);
        unmount();

        // Po przeliczeniu faktura = wizyta, reszty nie ma.
        renderSection(other(), 1_700_000, controls());
        expect(screen.getByText(/„Inny” nie powstanie/)).toBeInTheDocument();
    });

    it('netto równe netto wizyty też jest w porządku', () => {
        const c = controls();
        renderSection(other(), 1_700_000, c);

        const net = screen.getByLabelText('Faktura netto');
        fireEvent.focus(net);
        fireEvent.change(net, { target: { value: '14046,68' } });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(c.setInvoiceNet).toHaveBeenLastCalledWith(1_404_668);
    });

    it('kwota wyższa od wizyty: komunikat i bez przeliczania pozycji', () => {
        const c = controls();
        renderSection(other(), 1_700_000, c);

        const gross = screen.getByLabelText('Faktura brutto');
        fireEvent.focus(gross);
        fireEvent.change(gross, { target: { value: '18000' } });

        expect(screen.getByRole('alert').textContent).toContain('nie może być wyższa niż kwota wizyty');
        expect(c.setInvoiceAmount).not.toHaveBeenCalled();
    });

    it('faktura niższa od wizyty przy zwykłej fakturze proponuje „Inny” na resztę', () => {
        const c = controls({ itemsMatchServices: false });
        renderSection(state({ items: [item('Powłoka ceramiczna', '10000,00', '23')] }), 1_000_000, c);

        fireEvent.click(screen.getByRole('button', { name: 'Resztę rozlicz jako „Inny”' }));

        expect(c.setInvoiceOther).toHaveBeenCalledWith(true);
    });

    it('scalone stawki VAT: ostrzeżenie z różnicą podatku i scalenie bez zmiany podatku', () => {
        const c = controls({
            itemsMatchServices: false,
            vatMismatch: { serviceRates: ['23%', '8%'], invoiceRates: ['23%'], vatDifference: 5_646 },
        });
        renderSection(state({ items: [item('Powłoka i tapicerka', '17000,00', '23')] }), 1_700_000, c);

        const warning = screen.getByText('Stawki VAT na fakturze różnią się od usług wizyty.').closest('[role="status"]')!;
        expect(warning.textContent).toMatch(/VAT na fakturze będzie wyższy o 56,46/);
        fireEvent.click(within(warning as HTMLElement).getByRole('button', { name: 'Jedna pozycja na każdą stawkę' }));

        expect(c.applyItemsPerRate).toHaveBeenCalled();
    });
});
