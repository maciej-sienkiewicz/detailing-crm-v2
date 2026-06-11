import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Banknote, CreditCard, ArrowLeftRight, FileText, Receipt, File, Smartphone, MonitorSmartphone } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import type { PaymentMethod, InvoiceType, PaymentDetails } from '../../hooks/useStateTransition';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ModalSectionTitle } from '@/common/components/ModalKit';

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

// ─── Component ────────────────────────────────────────────────────────────────

interface PaymentStepProps {
    netAmount: number;
    grossAmount: number;
    currency: string;
    onComplete: (payment: PaymentDetails) => void;
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

export const PaymentStep = ({ netAmount, grossAmount, currency, onComplete }: PaymentStepProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
    const [invoiceType, setInvoiceType]     = useState<InvoiceType>('INVOICE');

    const vatAmount = grossAmount - netAmount;
    const fmt = (v: number) => formatCurrency(v / 100, currency);

    useEffect(() => {
        onComplete({ method: paymentMethod, invoiceType, amount: grossAmount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, invoiceType, grossAmount]);

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
            </Group>
        </Container>
    );
};
