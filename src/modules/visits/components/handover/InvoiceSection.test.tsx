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
    setSplit: vi.fn(),
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

describe('InvoiceSection - część na fakturze, reszta osobno', () => {
    it('„Część na fakturze” włącza podział', () => {
        const c = controls();
        renderSection(state(), 1_700_000, c);

        expect(screen.queryByLabelText('Kwota na fakturze (brutto)')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Część na fakturze' }));

        expect(c.setSplit).toHaveBeenCalledWith(true);
    });

    it('„Bez paragonu” ustawia resztę bez paragonu, a równanie i opis mówią, czym jest reszta', () => {
        const patch = vi.fn();
        const split = state({ splitRemainder: true, items: [item('Powłoka ceramiczna', '10000,00', '23')] });
        const { rerender } = renderSection(split, 1_000_000, controls({ itemsMatchServices: false }), 1_700_000, patch);

        const equation = screen.getByLabelText('Podział kwoty wizyty');
        expect(within(equation).getByText('Paragon')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Bez paragonu' }));
        expect(patch).toHaveBeenCalledWith({ remainderWithoutReceipt: true });

        rerender(
            <ThemeProvider theme={theme}>
                <InvoiceSection
                    state={{ ...split, remainderWithoutReceipt: true }}
                    patch={patch}
                    currency="PLN"
                    visitGross={1_700_000}
                    invoiceGross={1_000_000}
                    remainder={700_000}
                    sellerComplete
                    company={undefined}
                    problemsIn={() => []}
                    ksef={ksef}
                    sendToKsef={false}
                    canChooseSendToKsef={false}
                    onSendToKsefChange={vi.fn()}
                    controls={controls({ itemsMatchServices: false })}
                />
            </ThemeProvider>,
        );

        const after = screen.getByLabelText('Podział kwoty wizyty');
        expect(within(after).getByText('Bez paragonu').textContent).toMatch(/7000,00/);
        expect(screen.getByText(/bez paragonu i bez VAT/)).toBeInTheDocument();
        expect(screen.getByText(/Jak klient zapłacił resztę/)).toBeInTheDocument();
    });

    it('wpisana kwota faktury trafia do przeliczenia pozycji w groszach', () => {
        const c = controls();
        renderSection(state({ splitRemainder: true }), 1_700_000, c);

        fireEvent.change(screen.getByLabelText('Kwota na fakturze (brutto)'), { target: { value: '10 000,00' } });

        expect(c.setInvoiceAmount).toHaveBeenLastCalledWith(1_000_000);
    });

    it('równanie pokazuje, że faktura i paragon dają razem kwotę wizyty, i pyta o formę zapłaty paragonu', () => {
        renderSection(
            state({ splitRemainder: true, items: [item('Powłoka ceramiczna', '8823,53', '23'), item('Tapicerka', '1176,47', '8')] }),
            1_000_000,
            controls({ itemsMatchServices: false }),
        );

        const equation = screen.getByLabelText('Podział kwoty wizyty');
        expect(within(equation).getByText('Wizyta').textContent).toMatch(/17\s000,00/);
        expect(within(equation).getByText('Faktura').textContent).toMatch(/10\s000,00/);
        expect(within(equation).getByText('Paragon').textContent).toMatch(/7000,00/);
        expect(screen.getByText(/Jak klient zapłacił resztę/)).toBeInTheDocument();
        expect(screen.getByText(/Paragon obejmie resztę każdej usługi/)).toBeInTheDocument();
        // Pozycje po przeliczeniu nie są już „zgodne z usługami” - etykieta tego nie twierdzi.
        expect(screen.queryByText(/zgodnie z usługami wizyty/)).not.toBeInTheDocument();
    });

    it('kwota równa albo wyższa od wizyty: komunikat i bez przeliczania pozycji', () => {
        const c = controls();
        renderSection(state({ splitRemainder: true }), 1_700_000, c);

        fireEvent.change(screen.getByLabelText('Kwota na fakturze (brutto)'), { target: { value: '18000' } });

        expect(screen.getByRole('alert').textContent).toContain('musi być niższa niż kwota wizyty');
        expect(c.setInvoiceAmount).not.toHaveBeenCalled();
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
