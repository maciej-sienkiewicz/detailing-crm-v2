// src/modules/services/components/PriceInput.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { calculateGrossFromNet, calculateNetFromGross, formatMoneyAmount, parseMoneyInput } from '../utils/priceCalculator';
import type { VatRate } from '../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const PriceRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const InputWrapper = styled.div<{ $hasError?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus-within {
        border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }
`;

const Input = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background: transparent;
    color: ${props => props.theme.colors.text};
    text-align: right;
    font-variant-numeric: tabular-nums;

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const Currency = styled.span`
    padding-right: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const VatInfo = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${props => props.theme.fontSizes.sm};
`;

const VatLabel = styled.span`
    color: ${props => props.theme.colors.textMuted};
`;

const VatAmount = styled.span`
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

interface PriceInputProps {
    netAmount: number;
    vatRate: VatRate;
    onChange: (netAmount: number) => void;
    netLabel: string;
    grossLabel: string;
    vatLabel: string;
    hasError?: boolean;
}

export const PriceInput = ({
                               netAmount,
                               vatRate,
                               onChange,
                               netLabel,
                               grossLabel,
                               vatLabel,
                               hasError,
                           }: PriceInputProps) => {
    const [netValue, setNetValue] = useState('');
    const [grossValue, setGrossValue] = useState('');
    const [isNetFocused, setIsNetFocused] = useState(false);
    const [isGrossFocused, setIsGrossFocused] = useState(false);

    useEffect(() => {
        if (!isNetFocused && !isGrossFocused) {
            const calc = calculateGrossFromNet(netAmount, vatRate);
            setNetValue(formatMoneyAmount(calc.priceNet));
            setGrossValue(formatMoneyAmount(calc.priceGross));
        }
    }, [netAmount, vatRate, isNetFocused, isGrossFocused]);

    const handleNetChange = (value: string) => {
        setNetValue(value);
    };

    const handleNetBlur = () => {
        setIsNetFocused(false);
        const parsed = parseMoneyInput(netValue);
        if (parsed >= 0) {
            onChange(parsed);
        }
    };

    const handleGrossChange = (value: string) => {
        setGrossValue(value);
    };

    const handleGrossBlur = () => {
        setIsGrossFocused(false);
        const parsed = parseMoneyInput(grossValue);
        if (parsed >= 0) {
            const calc = calculateNetFromGross(parsed, vatRate);
            onChange(calc.priceNet);
        }
    };

    const calc = calculateGrossFromNet(netAmount, vatRate);
    const vatRateLabel = vatRate === -1 ? 'zw.' : `${vatRate}%`;

    return (
        <Container>
            <PriceRow>
                <FieldGroup>
                    <Label>{netLabel}</Label>
                    <InputWrapper $hasError={hasError}>
                        <Input
                            type="text"
                            value={netValue}
                            onChange={(e) => handleNetChange(e.target.value)}
                            onFocus={() => setIsNetFocused(true)}
                            onBlur={handleNetBlur}
                            placeholder="0.00"
                        />
                        <Currency>PLN</Currency>
                    </InputWrapper>
                </FieldGroup>

                <FieldGroup>
                    <Label>{grossLabel}</Label>
                    <InputWrapper>
                        <Input
                            type="text"
                            value={grossValue}
                            onChange={(e) => handleGrossChange(e.target.value)}
                            onFocus={() => setIsGrossFocused(true)}
                            onBlur={handleGrossBlur}
                            placeholder="0.00"
                        />
                        <Currency>PLN</Currency>
                    </InputWrapper>
                </FieldGroup>
            </PriceRow>

            <VatInfo>
                <VatLabel>{vatLabel} ({vatRateLabel})</VatLabel>
                <VatAmount>{formatMoneyAmount(calc.vatAmount)} PLN</VatAmount>
            </VatInfo>
        </Container>
    );
};