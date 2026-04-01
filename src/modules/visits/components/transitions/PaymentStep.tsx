import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { PaymentMethod, InvoiceType, PaymentDetails } from '../../hooks/useStateTransition';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// ─── Amount row ───────────────────────────────────────────────────────────────

const AmountRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const AmountLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const AmountValue = styled.span`
    font-size: 20px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
`;

// ─── Option group ─────────────────────────────────────────────────────────────

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const GroupLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
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
    padding: 7px 14px;
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

    svg { width: 13px; height: 13px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const CashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M6 12h.01M18 12h.01"/>
    </svg>
);

const CardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
);

const TransferIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
);

const InvoiceIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
);

const ReceiptIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="14" y2="14"/>
    </svg>
);

const OtherDocIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface PaymentStepProps {
    totalAmount: number;
    currency: string;
    onComplete: (payment: PaymentDetails) => void;
}

const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
    { value: 'cash',     label: 'Gotówka', icon: <CashIcon /> },
    { value: 'card',     label: 'Karta',   icon: <CardIcon /> },
    { value: 'transfer', label: 'Przelew', icon: <TransferIcon /> },
];

const invoiceTypes: Array<{ value: InvoiceType; label: string; icon: React.ReactNode }> = [
    { value: 'INVOICE', label: 'Faktura VAT', icon: <InvoiceIcon /> },
    { value: 'RECEIPT', label: 'Paragon',     icon: <ReceiptIcon /> },
    { value: 'other',   label: 'Inny',        icon: <OtherDocIcon /> },
];

export const PaymentStep = ({ totalAmount, currency, onComplete }: PaymentStepProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('INVOICE');

    useEffect(() => {
        onComplete({ method: paymentMethod, invoiceType, amount: totalAmount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, invoiceType, totalAmount]);

    return (
        <Container>
            <AmountRow>
                <AmountLabel>Do zapłaty</AmountLabel>
                <AmountValue>{formatCurrency(totalAmount / 100, currency)}</AmountValue>
            </AmountRow>

            <Group>
                <GroupLabel>Metoda płatności</GroupLabel>
                <PillRow>
                    {paymentMethods.map(m => (
                        <Pill
                            key={m.value}
                            $selected={paymentMethod === m.value}
                            onClick={() => setPaymentMethod(m.value)}
                        >
                            {m.icon}
                            {m.label}
                        </Pill>
                    ))}
                </PillRow>
            </Group>

            <Group>
                <GroupLabel>Dokument księgowy</GroupLabel>
                <PillRow>
                    {invoiceTypes.map(t => (
                        <Pill
                            key={t.value}
                            $selected={invoiceType === t.value}
                            onClick={() => setInvoiceType(t.value)}
                        >
                            {t.icon}
                            {t.label}
                        </Pill>
                    ))}
                </PillRow>
            </Group>
        </Container>
    );
};
