import React, { useMemo } from 'react';
import styled from 'styled-components';
import { isPiiMasked, PII_MASK } from './piiAccess';
import { generatePiiFake, type PiiKind } from './piiFake';

// Presentational blur for personal data the backend already masked ("***").
// Instead of rendering the bare mask, we render a blurred random fake so the
// UI looks like real data sits underneath. Un-blurring via devtools reveals
// random noise, nothing more — the real value never left the backend.

const Masked = styled.span.attrs({ 'aria-label': 'Dane osobowe ukryte' })`
    display: inline-block;
    filter: blur(4px);
    /* Horizontal breathing room: the blur halo extends ~the blur radius beyond
       the glyphs, and ancestors with overflow: hidden (ellipsis table cells,
       nowrap containers) would clip it flat at the edges. Insetting the fake
       text keeps the whole halo inside the box, so the blur never looks cut. */
    padding: 0 0.4em;
    max-width: 100%;
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
    /** Formatter applied ONLY to real (unmasked) values, e.g. phone formatting. */
    format?: (value: string) => string;
}

/**
 * Renders an API string that may contain masked personal data.
 * Real value → rendered as-is. Masked value → blurred random fake with an
 * explanatory tooltip. Missing value → `emptyFallback`.
 */
export const PiiValue: React.FC<PiiValueProps> = ({ value, kind = 'text', emptyFallback = null, format }) => {
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
    return <>{format ? format(value) : value}</>;
};

export interface PiiTextProps {
    /** Composite string that may EMBED the mask, e.g. "WZ-123 | ***". */
    value: string | null | undefined;
    /** Shape of the random fake rendered (blurred) for each embedded mask. */
    kind?: PiiKind;
}

/**
 * Renders a composite string (title, label) in which masked personal data may
 * be embedded among regular text. Every embedded mask is replaced by a blurred
 * fake, the rest of the string renders as-is — so mixed strings never show
 * bare "***".
 */
export const PiiText: React.FC<PiiTextProps> = ({ value, kind = 'name' }) => {
    const fake = useMemo(() => generatePiiFake(kind), [kind]);

    if (value == null || value === '') return null;
    if (!value.includes(PII_MASK)) return <>{value}</>;

    const parts = value.split(PII_MASK);
    return (
        <span title="Wymaga uprawnienia „Podgląd danych osobowych klienta”">
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && <Masked aria-hidden="true">{fake}</Masked>}
                </React.Fragment>
            ))}
        </span>
    );
};
