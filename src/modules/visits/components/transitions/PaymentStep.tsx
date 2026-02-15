import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { PaymentMethod, InvoiceType, PaymentDetails } from '../../hooks/useStateTransition';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const Description = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const AmountCard = styled.div`
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    box-shadow: ${props => props.theme.shadows.xl};
`;

const AmountLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: ${props => props.theme.spacing.xs};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const AmountValue = styled.div`
    font-size: ${props => props.theme.fontSizes.xxxl};
    font-weight: 700;
    color: white;
    line-height: 1.2;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const OptionsSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: var(--brand-primary);
    }
`;

const OptionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: ${props => props.theme.spacing.md};
`;

const OptionButton = styled.button<{ $selected: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.lg};
    background: ${props => props.$selected
    ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
    : 'white'
};
    border: 2px solid ${props => props.$selected
    ? 'var(--brand-primary)'
    : props.theme.colors.border
};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const OptionIcon = styled.div`
    font-size: 32px;
`;

const OptionLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    text-align: center;
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid var(--brand-primary);
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const InfoIcon = styled.div`
    font-size: 20px;
    flex-shrink: 0;
`;

const InfoText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #0c4a6e;
    line-height: 1.5;
`;

interface PaymentStepProps {
    totalAmount: number;
    currency: string;
    onComplete: (payment: PaymentDetails) => void;
}

export const PaymentStep = ({ totalAmount, currency, onComplete }: PaymentStepProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('vat');

    // Update payment data whenever selection changes, but don't call onComplete yet
    // onComplete should only be called when user clicks "Finish" button
    useEffect(() => {
        onComplete({
            method: paymentMethod,
            invoiceType,
            amount: totalAmount,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, invoiceType, totalAmount]); // Removed onComplete from deps to prevent infinite loop

    const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: string }> = [
        { value: 'cash', label: 'Gotówka', icon: '💵' },
        { value: 'card', label: 'Karta', icon: '💳' },
        { value: 'transfer', label: 'Przelew', icon: '🏦' },
    ];

    const invoiceTypes: Array<{ value: InvoiceType; label: string; icon: string }> = [
        { value: 'vat', label: 'Faktura VAT', icon: '📄' },
        { value: 'receipt', label: 'Paragon', icon: '🧾' },
        { value: 'other', label: 'Inny', icon: '📋' },
    ];

    return (
        <Container>
            <Description>
                Sfinalizuj płatność i wydanie pojazdu. Wybierz metodę płatności oraz typ dokumentu
                księgowego do wystawienia.
            </Description>

            <AmountCard>
                <AmountLabel>Kwota do zapłaty</AmountLabel>
                <AmountValue>{formatCurrency(totalAmount / 100, currency)}</AmountValue>
            </AmountCard>

            <OptionsSection>
                <SectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                        <path d="M12 18V6"/>
                    </svg>
                    Metoda płatności
                </SectionTitle>

                <OptionGrid>
                    {paymentMethods.map(method => (
                        <OptionButton
                            key={method.value}
                            $selected={paymentMethod === method.value}
                            onClick={() => setPaymentMethod(method.value)}
                        >
                            <OptionIcon>{method.icon}</OptionIcon>
                            <OptionLabel>{method.label}</OptionLabel>
                        </OptionButton>
                    ))}
                </OptionGrid>
            </OptionsSection>

            <OptionsSection>
                <SectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Dokument księgowy
                </SectionTitle>

                <OptionGrid>
                    {invoiceTypes.map(type => (
                        <OptionButton
                            key={type.value}
                            $selected={invoiceType === type.value}
                            onClick={() => setInvoiceType(type.value)}
                        >
                            <OptionIcon>{type.icon}</OptionIcon>
                            <OptionLabel>{type.label}</OptionLabel>
                        </OptionButton>
                    ))}
                </OptionGrid>
            </OptionsSection>

            <InfoBox>
                <InfoIcon>💡</InfoIcon>
                <InfoText>
                    Po zatwierdzeniu wizyta zostanie oznaczona jako zakończona, a dokument księgowy
                    zostanie automatycznie wygenerowany. Płatność zostanie zarejestrowana w systemie.
                </InfoText>
            </InfoBox>
        </Container>
    );
};
