import React from 'react';
import styled from 'styled-components';
import { isPiiMasked } from './piiAccess';

// Presentational blur for personal data the backend already masked ("***").
// The blurred text is a fixed placeholder — the real value is not in the DOM,
// not in JS memory, not in the network payload. Un-blurring via devtools
// reveals the placeholder, nothing more.

const Masked = styled.span.attrs({ 'aria-label': 'Dane osobowe ukryte' })`
    filter: blur(3.5px);
    user-select: none;
    opacity: 0.75;
    cursor: not-allowed;
`;

export interface PiiValueProps {
    /** Raw value from the API — either real data or the "***" mask. */
    value: string | null | undefined;
    /** Placeholder rendered (blurred) when the value is masked. */
    placeholder?: string;
    /** Rendered when the value is null/undefined/empty. */
    emptyFallback?: React.ReactNode;
}

/**
 * Renders an API string that may contain masked personal data.
 * Real value → rendered as-is. Masked value → blurred placeholder with an
 * explanatory tooltip. Missing value → `emptyFallback`.
 */
export const PiiValue: React.FC<PiiValueProps> = ({ value, placeholder = 'Ukryte dane', emptyFallback = null }) => {
    if (value == null || value === '') return <>{emptyFallback}</>;
    if (isPiiMasked(value)) {
        return (
            <span title="Wymaga uprawnienia „Podgląd danych osobowych klienta”">
                <Masked>{placeholder}</Masked>
            </span>
        );
    }
    return <>{value}</>;
};
