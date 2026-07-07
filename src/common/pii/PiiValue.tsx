import React, { useMemo } from 'react';
import styled from 'styled-components';
import { isPiiMasked } from './piiAccess';
import { generatePiiFake, type PiiKind } from './piiFake';

// Presentational blur for personal data the backend already masked ("***").
// Instead of rendering the bare mask, we render a blurred random fake so the
// UI looks like real data sits underneath. Un-blurring via devtools reveals
// random noise, nothing more — the real value never left the backend.

const Masked = styled.span.attrs({ 'aria-label': 'Dane osobowe ukryte' })`
    filter: blur(4px);
    user-select: none;
    opacity: 0.8;
    cursor: not-allowed;
`;

export interface PiiValueProps {
    /** Raw value from the API — either real data or the "***" mask. */
    value: string | null | undefined;
    /** Shape of the random fake rendered (blurred) when the value is masked. */
    kind?: PiiKind;
    /** Rendered when the value is null/undefined/empty. */
    emptyFallback?: React.ReactNode;
}

/**
 * Renders an API string that may contain masked personal data.
 * Real value → rendered as-is. Masked value → blurred random fake with an
 * explanatory tooltip. Missing value → `emptyFallback`.
 */
export const PiiValue: React.FC<PiiValueProps> = ({ value, kind = 'text', emptyFallback = null }) => {
    // Stable per mount so the fake doesn't reshuffle on every re-render.
    const fake = useMemo(() => generatePiiFake(kind), [kind]);

    if (value == null || value === '') return <>{emptyFallback}</>;
    if (isPiiMasked(value)) {
        return (
            <span title="Wymaga uprawnienia „Podgląd danych osobowych klienta”">
                <Masked aria-hidden="true">{fake}</Masked>
            </span>
        );
    }
    return <>{value}</>;
};
