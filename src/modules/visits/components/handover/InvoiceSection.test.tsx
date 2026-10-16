// @vitest-environment jsdom
//
// Sekcja faktury przy wydaniu: pozycje jak na dokumencie, dwie kwoty pod nimi i podgląd
// faktury. Biznes zgłaszał, że ekran „nie sprawia wrażenia bezpiecznego” - pracownik ma
// widzieć dokładnie to, co pójdzie do KSeF, bez równań i akapitów.
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

describe('InvoiceSection', () => {
    const other = (overrides: Partial<HandoverState> = {}) =>
        state({ splitRemainder: true, remainderWithoutReceipt: true, ...overrides });

    it('Faktura VAT: pozycje jak na dokumencie i kwota na fakturze, bez kwoty innego dokumentu', () => {
        renderSection(state(), 1_700_000, controls());

        const lines = screen.getByRole('list', { name: 'Pozycje faktury' });
        expect(within(lines).getByText('Powłoka ceramiczna')).toBeInTheDocument();
        expect(within(lines).getByText('Tapicerka')).toBeInTheDocument();
        expect(screen.getByText('Kwota na fakturze').parentElement?.textContent).toMatch(/17\s000,00/);
        expect(screen.queryByText('Kwota do zapłaty na innym dokumencie')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Faktura brutto')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Podział kwoty wizyty')).not.toBeInTheDocument();
    });

    it('Faktura + Inny: kwota na fakturze i kwota do zapłaty na innym dokumencie, bez dopisków', () => {
        renderSection(other({ items: [item('Powłoka ceramiczna', '10000,00', '23')] }), 1_000_000, controls());

        expect(screen.getByText('Kwota na fakturze').parentElement?.textContent).toMatch(/10\s000,00/);
        expect(screen.getByText('Kwota do zapłaty na innym dokumencie').parentElement?.textContent).toMatch(/7000,00/);
        expect(screen.queryByText(/gotówka/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Jak klient zapłacił/)).not.toBeInTheDocument();
    });

    it('wybór „Faktura + Inny” od razu otwiera edycję pozycji - tam ustawia się kwotę faktury', () => {
        const props = (s: HandoverState) => ({
            state: s, patch: vi.fn(), currency: 'PLN', visitGross: 1_700_000, invoiceGross: 1_700_000,
            remainder: 0, sellerComplete: true, company: undefined, problemsIn: () => [], ksef,
            sendToKsef: false, canChooseSendToKsef: false, onSendToKsefChange: vi.fn(), controls: controls(),
        });
        const { rerender } = render(<ThemeProvider theme={theme}><InvoiceSection {...props(state())} /></ThemeProvider>);
        expect(screen.queryByLabelText('Brutto pozycji 1')).not.toBeInTheDocument();

        rerender(<ThemeProvider theme={theme}><InvoiceSection {...props(other())} /></ThemeProvider>);

        expect(screen.getByLabelText('Brutto pozycji 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Netto pozycji 1')).toBeInTheDocument();
    });

    it('„Podgląd faktury” pokazuje sprzedawcę, nabywcę, pozycje i kwotę do zapłaty', () => {
        const company = {
            name: 'Detail Studio', taxId: '5261040828', street: 'ul. Zabłocie 23', postalCode: '30-701', city: 'Kraków',
        } as unknown as Parameters<typeof InvoiceSection>[0]['company'];
        render(
            <ThemeProvider theme={theme}>
                <InvoiceSection
                    state={state({ paymentMethod: 'CARD' })}
                    patch={vi.fn()}
                    currency="PLN"
                    visitGross={1_700_000}
                    invoiceGross={1_700_000}
                    remainder={0}
                    sellerComplete
                    company={company}
                    problemsIn={() => []}
                    ksef={ksef}
                    sendToKsef={false}
                    canChooseSendToKsef={false}
                    onSendToKsefChange={vi.fn()}
                    controls={controls()}
                />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Podgląd faktury' }));

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('Detail Studio')).toBeInTheDocument();
        expect(within(dialog).getByText('Auto Serwis sp. z o.o.')).toBeInTheDocument();
        expect(within(dialog).getByText('NIP 521-301-72-28')).toBeInTheDocument();
        expect(within(dialog).getByText('Tapicerka')).toBeInTheDocument();
        expect(within(dialog).getByText('Karta')).toBeInTheDocument();
        expect(within(dialog).getByText('Do zapłaty').parentElement?.textContent).toMatch(/17\s000,00/);
    });

    it('faktura niższa od wizyty przy zwykłej fakturze: krótki komunikat i reszta na inny dokument', () => {
        const c = controls({ itemsMatchServices: false });
        renderSection(state({ items: [item('Powłoka ceramiczna', '10000,00', '23')] }), 1_000_000, c);

        expect(screen.getByRole('alert').textContent).toMatch(/niższa niż kwota wizyty o 7000,00/);
        fireEvent.click(screen.getByRole('button', { name: 'Resztę na inny dokument' }));

        expect(c.setInvoiceOther).toHaveBeenCalledWith(true);
    });

    it('scalone stawki VAT: ostrzeżenie z różnicą podatku i scalenie bez zmiany podatku', () => {
        const c = controls({
            itemsMatchServices: false,
            vatMismatch: { serviceRates: ['23%', '8%'], invoiceRates: ['23%'], vatDifference: 5_646 },
        });
        renderSection(state({ items: [item('Powłoka i tapicerka', '17000,00', '23')] }), 1_700_000, c);

        const warning = screen.getByText('Stawki VAT różnią się od usług wizyty.').closest('[role="status"]')!;
        expect(warning.textContent).toMatch(/VAT wyższy o 56,46/);
        fireEvent.click(within(warning as HTMLElement).getByRole('button', { name: 'Jedna pozycja na każdą stawkę' }));

        expect(c.applyItemsPerRate).toHaveBeenCalled();
    });
});
