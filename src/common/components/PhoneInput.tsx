import { forwardRef, useState, useEffect, ChangeEvent } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    gap: 8px;
`;

const CountryCodeSelect = styled.select<{ $hasError?: boolean }>`
    padding: 12px 8px 12px 14px;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    font-size: 14px;
    background: white;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    min-width: 80px;

    &:hover {
        border-color: ${props => props.$hasError ? '#ef4444' : '#cbd5e1'};
    }

    &:focus {
        outline: none;
        border-color: ${props => props.$hasError ? '#ef4444' : 'var(--brand-primary)'};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }
`;

const PhoneNumberInput = styled.input<{ $hasError?: boolean }>`
    flex: 1;
    padding: 12px 14px;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    font-size: 14px;
    background: white;
    color: #0f172a;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${props => props.$hasError ? '#ef4444' : '#cbd5e1'};
    }

    &:focus {
        outline: none;
        border-color: ${props => props.$hasError ? '#ef4444' : 'var(--brand-primary)'};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }

    &::placeholder {
        color: #94a3b8;
    }
`;

interface CountryCode {
    code: string;
    flag: string;
    format: (digits: string) => string;
    maxDigits: number;
}

const COUNTRY_CODES: CountryCode[] = [
    {
        code: '+48',
        flag: '🇵🇱',
        format: (digits: string) => {
            // Format: XXX XXX XXX
            const d = digits.replace(/\D/g, '').slice(0, 9);
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
        },
        maxDigits: 9,
    },
    {
        code: '+1',
        flag: '🇺🇸',
        format: (digits: string) => {
            // Format: XXX XXX XXXX
            const d = digits.replace(/\D/g, '').slice(0, 10);
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
        },
        maxDigits: 10,
    },
    {
        code: '+44',
        flag: '🇬🇧',
        format: (digits: string) => {
            // Format: XXXX XXX XXXX
            const d = digits.replace(/\D/g, '').slice(0, 10);
            if (d.length <= 4) return d;
            if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
            return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
        },
        maxDigits: 10,
    },
    {
        code: '+49',
        flag: '🇩🇪',
        format: (digits: string) => {
            // Format: XXX XXX XXXX
            const d = digits.replace(/\D/g, '').slice(0, 10);
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
        },
        maxDigits: 10,
    },
];

interface PhoneInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    hasError?: boolean;
    placeholder?: string;
    id?: string;
    name?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ value = '', onChange, onBlur, hasError, placeholder, id, name }, ref) => {
        // Parse initial value
        const parseValue = (val: string) => {
            const match = val.match(/^(\+\d+)[\s-]?(.*)$/);
            if (match) {
                const code = match[1];
                const number = match[2].replace(/[\s-]/g, '');
                return { code, number };
            }
            return { code: '+48', number: val.replace(/[\s-]/g, '').replace(/^\+48/, '') };
        };

        const { code: initialCode, number: initialNumber } = parseValue(value);
        const [countryCode, setCountryCode] = useState(initialCode);
        const [phoneNumber, setPhoneNumber] = useState(initialNumber);

        // Update local state when value prop changes
        useEffect(() => {
            const { code, number } = parseValue(value);
            setCountryCode(code);
            setPhoneNumber(number);
        }, [value]);

        const currentCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

        const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
            const newCode = e.target.value;
            setCountryCode(newCode);
            // Keep the same number, reformat for new country
            const digits = phoneNumber.replace(/\D/g, '');
            const newCountry = COUNTRY_CODES.find(c => c.code === newCode) || COUNTRY_CODES[0];
            const formatted = newCountry.format(digits);
            setPhoneNumber(formatted);

            // Return full value with new country code
            const fullValue = digits ? `${newCode} ${formatted}` : '';
            onChange?.(fullValue);
        };

        const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
            const input = e.target.value;
            // Allow only digits and spaces (spaces will be auto-formatted)
            const digits = input.replace(/\D/g, '');

            // Apply formatting
            const formatted = currentCountry.format(digits);
            setPhoneNumber(formatted);

            // Return full value with country code
            const fullValue = digits ? `${countryCode} ${formatted}` : '';
            onChange?.(fullValue);
        };

        const handleBlur = () => {
            onBlur?.();
        };

        // Display formatted value
        const displayValue = phoneNumber;

        return (
            <Container>
                <CountryCodeSelect
                    value={countryCode}
                    onChange={handleCountryChange}
                    $hasError={hasError}
                    aria-label="Country code"
                >
                    {COUNTRY_CODES.map(country => (
                        <option key={country.code} value={country.code}>
                            {country.flag} {country.code}
                        </option>
                    ))}
                </CountryCodeSelect>
                <PhoneNumberInput
                    ref={ref}
                    type="tel"
                    value={displayValue}
                    onChange={handleNumberChange}
                    onBlur={handleBlur}
                    $hasError={hasError}
                    placeholder={placeholder || currentCountry.format('123456789')}
                    id={id}
                    name={name}
                    inputMode="numeric"
                />
            </Container>
        );
    }
);

PhoneInput.displayName = 'PhoneInput';
