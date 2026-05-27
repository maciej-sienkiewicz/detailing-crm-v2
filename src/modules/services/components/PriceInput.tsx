import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { calculateGrossFromNet, calculateNetFromGross, formatMoneyAmount, parseMoneyInput } from '../utils/priceCalculator';
import type { VatRate } from '../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PriceRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    letter-spacing: 0.01em;
`;

const InputWrapper = styled.div<{ $hasError?: boolean; $focused?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1.5px solid ${p =>
        p.$hasError ? '#ef4444' :
        p.$focused ? '#0ea5e9' :
        '#e2e8f0'};
    border-radius: 12px;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    box-shadow: ${p =>
        p.$hasError ? '0 0 0 3px rgba(239,68,68,0.12)' :
        p.$focused ? '0 0 0 3px rgba(14,165,233,0.14)' :
        'none'};

    &:hover:not(:focus-within) {
        border-color: ${p => p.$hasError ? '#ef4444' : '#cbd5e1'};
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 11px 48px 11px 14px;
    border: none;
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 400;
    background: transparent;
    color: #0f172a;
    text-align: right;
    font-variant-numeric: tabular-nums;

    &:focus { outline: none; }
    &::placeholder { color: #94a3b8; }
`;

const Currency = styled.span`
    position: absolute;
    right: 14px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #94a3b8;
    pointer-events: none;
    user-select: none;
`;

const VatInfo = styled.div`
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
`;

const VatLabel = styled.span`
    color: #94a3b8;
    font-weight: 400;
`;

const VatAmount = styled.span`
    font-weight: 600;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
`;

// Only allow digits, one separator (. or ,), max 2 decimal places
const MAX_2_DECIMALS = /^\d*[.,]?\d{0,2}$/;

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
    const [netFocused, setNetFocused] = useState(false);
    const [grossFocused, setGrossFocused] = useState(false);

    useEffect(() => {
        if (!netFocused && !grossFocused) {
            const calc = calculateGrossFromNet(netAmount, vatRate);
            setNetValue(formatMoneyAmount(calc.priceNet));
            setGrossValue(formatMoneyAmount(calc.priceGross));
        }
    }, [netAmount, vatRate, netFocused, grossFocused]);

    const handleNetChange = (value: string) => {
        if (!MAX_2_DECIMALS.test(value)) return;
        setNetValue(value);
        const parsed = parseMoneyInput(value.replace(',', '.'));
        const calc = calculateGrossFromNet(parsed, vatRate);
        setGrossValue((calc.priceGross / 100).toFixed(2));
        onChange(parsed);
    };

    const handleGrossChange = (value: string) => {
        if (!MAX_2_DECIMALS.test(value)) return;
        setGrossValue(value);
        const parsedGross = parseMoneyInput(value.replace(',', '.'));
        const calc = calculateNetFromGross(parsedGross, vatRate);
        setNetValue((calc.priceNet / 100).toFixed(2));
        onChange(calc.priceNet);
    };

    const handleBlur = () => {
        setNetFocused(false);
        setGrossFocused(false);
        const currentNet = parseMoneyInput(netValue.replace(',', '.'));
        const calc = calculateGrossFromNet(isNaN(currentNet) ? 0 : currentNet, vatRate);
        setNetValue(formatMoneyAmount(calc.priceNet));
        setGrossValue(formatMoneyAmount(calc.priceGross));
    };

    const calc = calculateGrossFromNet(netAmount, vatRate);
    const vatRateLabel = vatRate === -1 ? 'zw.' : `${vatRate}%`;

    return (
        <Container>
            <PriceRow>
                <FieldGroup>
                    <Label>{netLabel}</Label>
                    <InputWrapper $hasError={hasError} $focused={netFocused}>
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={netValue}
                            onChange={(e) => handleNetChange(e.target.value)}
                            onFocus={() => { setNetFocused(true); if (parseFloat(netValue.replace(',', '.')) === 0) setNetValue(''); }}
                            onBlur={handleBlur}
                            placeholder="0.00"
                        />
                        <Currency>PLN</Currency>
                    </InputWrapper>
                </FieldGroup>

                <FieldGroup>
                    <Label>{grossLabel}</Label>
                    <InputWrapper $focused={grossFocused}>
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={grossValue}
                            onChange={(e) => handleGrossChange(e.target.value)}
                            onFocus={() => { setGrossFocused(true); if (parseFloat(grossValue.replace(',', '.')) === 0) setGrossValue(''); }}
                            onBlur={handleBlur}
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
