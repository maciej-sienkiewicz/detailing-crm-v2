import { forwardRef, useRef, useEffect, ChangeEvent } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    gap: 8px;
`;

const CountryCodeSelect = styled.select<{ $hasError?: boolean }>`
    padding: 16px;
    border: 1px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    font-size: 16px;
    background: white;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    min-width: 90px;

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
    padding: 16px;
    border: 1px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 10px;
    font-size: 16px;
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
        code: '+49',
        flag: '🇩🇪',
        format: (digits: string) => {
            // Format: XXX XXXX XXXX
            const d = digits.replace(/\D/g, '').slice(0, 11);
            if (d.length <= 3) return d;
            if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
        },
        maxDigits: 11,
    },
    {
        code: '+420',
        flag: '🇨🇿',
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
        code: '+421',
        flag: '🇸🇰',
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
        code: '+380',
        flag: '🇺🇦',
        format: (digits: string) => {
            // Format: XX XXX XX XX
            const d = digits.replace(/\D/g, '').slice(0, 9);
            if (d.length <= 2) return d;
            if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
            if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
            return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
        },
        maxDigits: 9,
    },
    {
        code: '+375',
        flag: '🇧🇾',
        format: (digits: string) => {
            // Format: XX XXX XX XX
            const d = digits.replace(/\D/g, '').slice(0, 9);
            if (d.length <= 2) return d;
            if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
            if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
            return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
        },
        maxDigits: 9,
    },
    {
        code: '+370',
        flag: '🇱🇹',
        format: (digits: string) => {
            // Format: XXX XXXXX
            const d = digits.replace(/\D/g, '').slice(0, 8);
            if (d.length <= 3) return d;
            return `${d.slice(0, 3)} ${d.slice(3)}`;
        },
        maxDigits: 8,
    },
    {
        code: '+7',
        flag: '🇷🇺',
        format: (digits: string) => {
            // Format: XXX XXX XX XX
            const d = digits.replace(/\D/g, '').slice(0, 10);
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
            if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
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
        const inputRef = useRef<HTMLInputElement | null>(null);
        const selectRef = useRef<HTMLSelectElement | null>(null);
        const isInternalChange = useRef(false);

        // Parse value to extract country code and number (robust against missing spaces)
        const parseValue = (val: string) => {
            if (!val) return { code: '+48', digits: '' };

            const raw = String(val).trim();
            const compact = raw.replace(/[\s-]/g, '');

            // Try to match by known country codes (longest first)
            if (compact.startsWith('+')) {
                const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
                for (const c of sorted) {
                    if (compact.startsWith(c.code)) {
                        return { code: c.code, digits: compact.slice(c.code.length) };
                    }
                }
                // If unknown code but starts with '+48', fallback to PL
                if (compact.startsWith('+48')) {
                    return { code: '+48', digits: compact.slice(3) };
                }
                // Unknown code, keep digits only and default to +48
                return { code: '+48', digits: compact.replace(/^\+\d+/, '') };
            }

            // No country code provided, assume +48
            return { code: '+48', digits: compact };
        };

        const { code: initialCode, digits: initialDigits } = parseValue(value);

        // Only update from external changes (not our own onChange calls)
        useEffect(() => {
            if (!isInternalChange.current) {
                const { code, digits } = parseValue(value);
                if (inputRef.current && selectRef.current) {
                    // Ensure select has a valid option value
                    const country = COUNTRY_CODES.find(c => c.code === code) || COUNTRY_CODES[0];
                    selectRef.current.value = country.code;
                    inputRef.current.value = country.format(digits);
                }
            }
            isInternalChange.current = false;
        }, [value]);

        const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
            const newCode = e.target.value;
            const currentInput = inputRef.current?.value || '';
            const newCountry = COUNTRY_CODES.find(c => c.code === newCode) || COUNTRY_CODES[0];

            // Clamp digits to the new country's max length
            const digits = currentInput.replace(/\D/g, '').slice(0, newCountry.maxDigits);
            const formatted = newCountry.format(digits);

            if (inputRef.current) {
                inputRef.current.value = formatted;
                // Move caret to end to avoid unexpected jumps when formats differ
                setTimeout(() => {
                    inputRef.current?.setSelectionRange(formatted.length, formatted.length);
                }, 0);
            }

            // Return full value with new country code
            isInternalChange.current = true;
            const fullValue = digits ? `${newCode} ${formatted}` : '';
            onChange?.(fullValue);
        };

        const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
            const input = e.target.value;
            const cursorPosition = e.target.selectionStart || 0;

            // Get current country settings
            const select = e.target.parentElement?.querySelector('select') as HTMLSelectElement;
            const code = select?.value || '+48';
            const currentCountry = COUNTRY_CODES.find(c => c.code === code) || COUNTRY_CODES[0];

            // Extract only digits and clamp to max length for the country
            const rawDigits = input.replace(/\D/g, '');
            const digits = rawDigits.slice(0, currentCountry.maxDigits);

            // Apply formatting based on clamped digits
            const formatted = currentCountry.format(digits);

            // Update input value
            e.target.value = formatted;

            // Restore cursor position (accounting for added spaces)
            const digitsBeforeCursor = Math.min(
                input.slice(0, cursorPosition).replace(/\D/g, '').length,
                digits.length
            );

            // Default cursor position to end; compute more precise position if possible
            let newCursorPos = formatted.length;
            if (digitsBeforeCursor > 0) {
                let digitCount = 0;
                for (let i = 0; i < formatted.length; i++) {
                    if (formatted[i] !== ' ') {
                        digitCount++;
                    }
                    if (digitCount >= digitsBeforeCursor) {
                        newCursorPos = i + 1;
                        break;
                    }
                }
            }

            // If user attempted to input beyond max, keep caret at the end
            if (rawDigits.length > currentCountry.maxDigits) {
                newCursorPos = formatted.length;
            }

            // Set cursor position after a brief delay to ensure it takes effect
            setTimeout(() => {
                e.target.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);

            // Return full value with country code
            isInternalChange.current = true;
            const fullValue = digits ? `${code} ${formatted}` : '';
            onChange?.(fullValue);
        };

        const handleBlur = () => {
            onBlur?.();
        };

        // Get initial display value
        const currentCountry = COUNTRY_CODES.find(c => c.code === initialCode) || COUNTRY_CODES[0];
        const initialDisplayValue = currentCountry.format(initialDigits);

        return (
            <Container>
                <CountryCodeSelect
                    ref={selectRef}
                    defaultValue={initialCode}
                    onChange={handleCountryChange}
                    onBlur={handleBlur}
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
                    ref={(el) => {
                        inputRef.current = el;
                        if (typeof ref === 'function') {
                            ref(el);
                        } else if (ref) {
                            ref.current = el;
                        }
                    }}
                    type="tel"
                    defaultValue={initialDisplayValue}
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
