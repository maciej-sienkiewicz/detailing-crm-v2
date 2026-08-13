import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Banknote, CreditCard, ArrowLeftRight, FileText, Receipt, File, Smartphone, MonitorSmartphone, Pencil } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import type { PaymentMethod, InvoiceType, PaymentDetails } from '../../hooks/useStateTransition';
import type { CompleteInvoicePayload } from '../../types/stateTransitions';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ModalSectionTitle } from '@/common/components/ModalKit';
import { InvoiceAdjustmentModal, type InvoiceServiceSeed } from './InvoiceAdjustmentModal';

// ─── Summary card ─────────────────────────────────────────────────────────────

const SummaryCard = styled.div`
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
`;

const SummaryHeader = styled.div`
    padding: 8px 14px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const SummaryHeaderLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const SummaryRow = styled.div<{ $total?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${p => p.$total ? '11px 14px' : '8px 14px'};
    background: ${p => p.$total ? st.bgCard : 'transparent'};
    border-top: ${p => p.$total ? `1px solid ${st.border}` : 'none'};
`;

const SummaryRowLabel = styled.span<{ $total?: boolean }>`
    font-size: ${p => p.$total ? st.fontSm : st.fontXs};
    font-weight: ${p => p.$total ? '700' : '500'};
    color: ${p => p.$total ? st.text : st.textSecondary};
`;

const SummaryRowValue = styled.span<{ $total?: boolean }>`
    font-size: ${p => p.$total ? '18px' : st.fontSm};
    font-weight: ${p => p.$total ? '700' : '500'};
    color: ${p => p.$total ? st.text : st.textSecondary};
    letter-spacing: ${p => p.$total ? '-0.3px' : '0'};
    font-variant-numeric: tabular-nums;
`;

// ─── Option group ─────────────────────────────────────────────────────────────

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;


const PillRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const Pill = styled.button<{ $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 15px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;
    white-space: nowrap;

    ${p => p.$selected ? `
        background: ${st.accentBlue};
        color: white;
        border: 1px solid ${st.accentBlue};
        box-shadow: ${st.shadowXs};
    ` : `
        background: ${st.bgCard};
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
        &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
    `}

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

// ─── Invoice config card ──────────────────────────────────────────────────────

const InvoiceCard = styled.div<{ $split: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => p.$split ? '#fde68a' : st.border};
    background: ${p => p.$split ? '#fffbeb' : st.bg};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
`;

const InvoiceCardRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    strong { color: ${st.text}; font-variant-numeric: tabular-nums; }
`;

const EditBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
    background: ${st.bgCard};
    border: 1px solid ${st.accentBlue}55;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    transition: all 140ms ease;
    &:hover { background: ${st.accentBlueDim}; }
    svg { width: 12px; height: 12px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface PaymentStepProps {
    netAmount: number;
    grossAmount: number;
    currency: string;
    services: InvoiceServiceSeed[];
    buyerDefaults: { companyName?: string; fullName: string; email?: string };
    onComplete: (payment: PaymentDetails, invoice: CompleteInvoicePayload | null) => void;
}

const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
    { value: 'CASH',          label: 'Gotówka',       icon: <Banknote size={13} /> },
    { value: 'CARD',          label: 'Karta',         icon: <CreditCard size={13} /> },
    { value: 'TRANSFER',      label: 'Przelew',       icon: <ArrowLeftRight size={13} /> },
    { value: 'BLIK_NA_NUMER', label: 'BLIK na numer', icon: <Smartphone size={13} /> },
    { value: 'BLIK_TERMINAL', label: 'BLIK terminal', icon: <MonitorSmartphone size={13} /> },
];

const invoiceTypes: Array<{ value: InvoiceType; label: string; icon: React.ReactNode }> = [
    { value: 'INVOICE', label: 'Faktura VAT', icon: <FileText size={13} /> },
    { value: 'RECEIPT', label: 'Paragon',     icon: <Receipt size={13} /> },
    { value: 'other',   label: 'Inny',        icon: <File size={13} /> },
];

const DUE_DATE_DAYS = 14;

const defaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + DUE_DATE_DAYS);
    return date.toISOString().slice(0, 10);
};

/**
 * Domyślna konfiguracja faktury: wszystkie usługi wizyty w cenach BRUTTO —
 * suma domyślna równa się kwocie wizyty co do grosza (ceny brutto usług są
 * źródłem prawdy, tak jak przy ręcznej edycji).
 */
const defaultInvoice = (
    services: InvoiceServiceSeed[],
    grossAmount: number,
    buyerDefaults: PaymentStepProps['buyerDefaults'],
): CompleteInvoicePayload => ({
    items: services.length > 0
        ? services.map(s => ({ name: s.name, quantity: 1, unitPriceGross: s.grossPrice, vatRate: '23' }))
        : [{ name: 'Usługi detailingowe', quantity: 1, unitPriceGross: grossAmount, vatRate: '23' }],
    buyerName: buyerDefaults.companyName ?? buyerDefaults.fullName,
    buyerEmail: buyerDefaults.email,
});

/** Brutto pozycji w groszach — brutto wpisane jest dokładne; z netto liczone od netto. */
const itemGross = (item: CompleteInvoicePayload['items'][number]): number => {
    const qty = item.quantity ?? 1;
    if (item.unitPriceGross != null) return Math.round(item.unitPriceGross * qty);
    const rate = item.vatRate ?? '23';
    const percent = rate === '23' ? 23 : rate === '8' ? 8 : rate === '5' ? 5 : 0;
    const net = Math.round((item.unitPriceNet ?? 0) * qty);
    return net + Math.round(net * percent / 100);
};

export const PaymentStep = ({ netAmount, grossAmount, currency, services, buyerDefaults, onComplete }: PaymentStepProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
    const [invoiceType, setInvoiceType]     = useState<InvoiceType>('INVOICE');
    const [invoice, setInvoice]             = useState<CompleteInvoicePayload>(() =>
        defaultInvoice(services, grossAmount, buyerDefaults));
    const [isAdjustOpen, setAdjustOpen]     = useState(false);

    const vatAmount = grossAmount - netAmount;
    const fmt = (v: number) => formatCurrency(v / 100, currency);

    const invoiceGross = invoice.items.reduce((sum, item) => sum + itemGross(item), 0);
    const remainder = grossAmount - invoiceGross;

    useEffect(() => {
        onComplete(
            {
                method: paymentMethod,
                invoiceType,
                amount: grossAmount,
                dueDate: paymentMethod === 'TRANSFER' ? defaultDueDate() : undefined,
            },
            invoiceType === 'INVOICE' ? invoice : null,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, invoiceType, grossAmount, invoice]);

    return (
        <Container>
            <SummaryCard>
                <SummaryHeader>
                    <SummaryHeaderLabel>Podsumowanie płatności</SummaryHeaderLabel>
                </SummaryHeader>
                <SummaryRow>
                    <SummaryRowLabel>Wartość netto</SummaryRowLabel>
                    <SummaryRowValue>{fmt(netAmount)}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow>
                    <SummaryRowLabel>VAT</SummaryRowLabel>
                    <SummaryRowValue>{fmt(vatAmount)}</SummaryRowValue>
                </SummaryRow>
                <SummaryRow $total>
                    <SummaryRowLabel $total>Do zapłaty (brutto)</SummaryRowLabel>
                    <SummaryRowValue $total>{fmt(grossAmount)}</SummaryRowValue>
                </SummaryRow>
            </SummaryCard>

            <Group>
                <ModalSectionTitle>Metoda płatności</ModalSectionTitle>
                <PillRow>
                    {paymentMethods.map(m => (
                        <Pill key={m.value} $selected={paymentMethod === m.value} onClick={() => setPaymentMethod(m.value)}>
                            {m.icon}{m.label}
                        </Pill>
                    ))}
                </PillRow>
            </Group>

            <Group>
                <ModalSectionTitle>Dokument księgowy</ModalSectionTitle>
                <PillRow>
                    {invoiceTypes.map(t => (
                        <Pill key={t.value} $selected={invoiceType === t.value} onClick={() => setInvoiceType(t.value)}>
                            {t.icon}{t.label}
                        </Pill>
                    ))}
                </PillRow>

                {invoiceType === 'INVOICE' && (
                    <InvoiceCard $split={remainder > 0}>
                        <InvoiceCardRow>
                            <span>
                                Faktura KSeF: <strong>{fmt(invoiceGross)}</strong>
                                {' · '}nabywca: <strong>{invoice.buyerNip ? `NIP ${invoice.buyerNip}` : (invoice.buyerName ?? 'konsument')}</strong>
                            </span>
                            <EditBtn onClick={() => setAdjustOpen(true)}>
                                <Pencil /> Wprowadź zmiany
                            </EditBtn>
                        </InvoiceCardRow>
                        {remainder > 0 && (
                            <InvoiceCardRow>
                                <span>
                                    Reszta <strong>{fmt(remainder)}</strong> zostanie udokumentowana paragonem
                                    ({remainderLabel(invoice.remainderPaymentMethod)})
                                </span>
                            </InvoiceCardRow>
                        )}
                        <span>Faktura zostanie automatycznie wysłana do KSeF po zakończeniu wizyty.</span>
                    </InvoiceCard>
                )}
            </Group>

            <InvoiceAdjustmentModal
                isOpen={isAdjustOpen}
                onClose={() => setAdjustOpen(false)}
                services={services}
                visitGross={grossAmount}
                currency={currency}
                initial={invoice}
                buyerDefaults={buyerDefaults}
                onSave={setInvoice}
            />
        </Container>
    );
};

const remainderLabel = (method?: PaymentMethod): string => {
    switch (method) {
        case 'CASH':          return 'gotówka';
        case 'CARD':          return 'karta';
        case 'TRANSFER':      return 'przelew';
        case 'BLIK_NA_NUMER': return 'BLIK na numer';
        case 'BLIK_TERMINAL': return 'BLIK terminal';
        default:              return 'gotówka';
    }
};
