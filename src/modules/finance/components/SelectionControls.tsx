import React from 'react';
import styled from 'styled-components';
import { pluralPl } from '@/common/utils/plural';
import type { BulkPaymentStatusTarget } from '../types';

/* ─── Pole wyboru wiersza ─────────────────────────────────────────────────────
   Natywny input pod spodem (semantyka, klawiatura, czytniki ekranu), własny
   kwadrat na wierzchu (ten sam wygląd w ciemnym nagłówku tabeli i w jasnym
   wierszu). Cały label jest celem dotyku - 16 px kwadrat sam w sobie byłby na
   telefonie celem nie do trafienia. */

const Box = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1.5px solid ${(p) => p.theme.colors.border};
    background: ${(p) => p.theme.colors.surface};
    color: transparent;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
`;

const CheckboxLabel = styled.label<{ $onDark?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    margin: -6px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    ${(p) =>
        p.$onDark &&
        `
        ${Box} {
            border-color: rgba(255, 255, 255, 0.35);
            background: rgba(255, 255, 255, 0.08);
        }
    `}

    &:hover ${Box} {
        border-color: #60a5fa;
    }

    input:focus-visible + ${Box} {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }

    input:checked + ${Box},
    input:indeterminate + ${Box} {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #ffffff;
    }
`;

interface RowCheckboxProps {
    checked: boolean;
    /** Część wierszy zaznaczona - kwadrat z kreską zamiast ptaszka. */
    indeterminate?: boolean;
    onChange: () => void;
    label: string;
    /** Nagłówek tabeli jest ciemny, więc pusty kwadrat musi być tam jaśniejszy. */
    onDark?: boolean;
}

export const RowCheckbox: React.FC<RowCheckboxProps> = ({
    checked,
    indeterminate = false,
    onChange,
    label,
    onDark,
}) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate && !checked;
    }, [indeterminate, checked]);

    return (
        <CheckboxLabel
            $onDark={onDark}
            title={label}
            onClick={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                aria-label={label}
            />
            <Box aria-hidden="true">
                {indeterminate && !checked ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M2.5 6.2l2.4 2.4L9.6 3.9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </Box>
        </CheckboxLabel>
    );
};

/* ─── Pasek operacji grupowej ─────────────────────────────────────────────────
   Pojawia się dopiero, gdy coś jest zaznaczone, i znika razem z zaznaczeniem.
   Żaden z przycisków nie jest wypełniony kolorem: krokiem następnym na tym
   widoku pozostaje „Wystaw fakturę" w nagłówku strony, a dwa wypełnienia w
   jednym oknie znaczą tyle samo co żadne (CLAUDE.md §2). Odcień niesie tu
   znaczenie - zieleń „zapłacone", bursztyn „czeka" - tak jak w plakietkach
   w samej tabeli. */

const Bar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 16px;
    background: #eff6ff;
    border-bottom: 1px solid #bfdbfe;

    @media (max-width: 639px) {
        padding: 10px 12px;
        gap: 8px;
    }
`;

const Count = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #1e3a8a;
    margin-right: auto;

    @media (max-width: 639px) {
        width: 100%;
        margin-right: 0;
    }
`;

const Action = styled.button<{ $tone: 'paid' | 'pending' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;

    background: ${(p) => (p.$tone === 'paid' ? '#f0fdf4' : '#fffbeb')};
    border: 1px solid ${(p) => (p.$tone === 'paid' ? '#86efac' : '#fde68a')};
    color: ${(p) => (p.$tone === 'paid' ? '#15803d' : '#92400e')};

    &:hover:not(:disabled) {
        background: ${(p) => (p.$tone === 'paid' ? '#dcfce7' : '#fef3c7')};
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    @media (max-width: 639px) {
        flex: 1 1 auto;
        justify-content: center;
    }
`;

const ClearBtn = styled.button`
    padding: 7px 10px;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    color: #1d4ed8;
    cursor: pointer;
    border-radius: 8px;

    &:hover:not(:disabled) { background: #dbeafe; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

interface BulkPaymentStatusBarProps {
    count: number;
    busy: boolean;
    onApply: (target: BulkPaymentStatusTarget) => void;
    onClear: () => void;
    /** Trzy formy rzeczownika: 1 dokument, 2 dokumenty, 5 dokumentów. */
    nounForms?: [string, string, string];
}

export const BulkPaymentStatusBar: React.FC<BulkPaymentStatusBarProps> = ({
    count,
    busy,
    onApply,
    onClear,
    nounForms = ['dokument', 'dokumenty', 'dokumentów'],
}) => {
    if (count === 0) return null;

    return (
        <Bar role="region" aria-label="Operacje na zaznaczonych dokumentach">
            <Count>Zaznaczono {count} {pluralPl(count, ...nounForms)}</Count>
            <Action type="button" $tone="paid" disabled={busy} onClick={() => onApply('PAID')}>
                Oznacz jako opłacone
            </Action>
            <Action type="button" $tone="pending" disabled={busy} onClick={() => onApply('PENDING')}>
                Oznacz jako oczekujące
            </Action>
            <ClearBtn type="button" disabled={busy} onClick={onClear}>
                Wyczyść
            </ClearBtn>
        </Bar>
    );
};
