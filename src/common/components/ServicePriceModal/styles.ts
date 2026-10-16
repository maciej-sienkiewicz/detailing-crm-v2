// src/common/components/ServicePriceModal/styles.ts
//
// Jedno wypełnienie w oknie: „Zastosuj" (CLAUDE.md §2). Wynik niesie znaczenie
// odcieniem - zieleń = taniej, bursztyn = drożej, szarość = jak w cenniku - ale
// leży na tle z obwódką, nie jest wypełniony.

import styled, { css } from 'styled-components';
import { touch, ui } from '@/common/components/ui';
import type { PriceChangeKind } from './priceDraft';

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    background: rgba(15, 23, 42, 0.38);
    display: flex;
    align-items: center;
    justify-content: center;
    padding:
        max(16px, env(safe-area-inset-top, 0px))
        max(16px, env(safe-area-inset-right, 0px))
        max(16px, env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));
    z-index: 9999;
`;

export const Card = styled.div`
    width: min(440px, calc(100vw - 32px));
    /* Wysokość liczy nakładka (z safe-area i klawiaturą), karta bierze tyle, ile dostanie. */
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: ${ui.surface};
    border-radius: ${ui.radiusPanel};
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
`;

export const Header = styled.div`
    flex-shrink: 0;
    padding: 18px 20px 14px;
    border-bottom: 1px solid ${ui.lineFaint};
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

export const HeadText = styled.div`
    min-width: 0;
`;

export const Title = styled.h4`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};
`;

export const ServiceName = styled.p`
    margin: 3px 0 0;
    font-size: 13px;
    color: ${ui.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    color: ${ui.textFaint};
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: ${ui.ink}; background: ${ui.surfaceAlt}; }
    svg { width: 15px; height: 15px; }
    ${touch} { width: 44px; height: 44px; margin: -7px -7px 0 0; }
`;

export const Body = styled.div`
    padding: 16px 20px 18px;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const BaseRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
`;

export const BaseLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

export const BaseValue = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-variant-numeric: tabular-nums;
    text-align: right;
`;

export const BaseGross = styled.span`
    white-space: nowrap;
    font-size: 12.5px;
    color: ${ui.textMuted};

    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
`;

export const BaseNet = styled.span`
    font-size: 12px;
    color: ${ui.textFaint};
`;

export const PriceGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

export const InputWrap = styled.div<{ $grow?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    /* Bazowa szerokość 0: pole tekstowe ma własną (20 znaków) i wypychało
       przełącznik jednostek poza okno. */
    ${p => p.$grow && css`flex: 1 1 0; min-width: 96px;`}
`;

export const Input = styled.input`
    width: 100%;
    min-width: 0;
    height: 44px;
    padding: 0 34px 0 12px;
    font-family: inherit;
    font-size: 17px;
    font-weight: 700;
    text-align: right;
    color: ${ui.ink};
    background: ${ui.surface};
    border: 1.5px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    outline: none;
    font-variant-numeric: tabular-nums;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus { border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.16); }
    &[aria-invalid='true'] { border-color: ${ui.dangerLine}; }
    &::placeholder { color: ${ui.textFaint}; font-weight: 500; }
`;

export const Suffix = styled.span`
    position: absolute;
    right: 12px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textMuted};
    pointer-events: none;
`;

export const AmountBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const AmountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    ${Input} { padding-right: 12px; }

    @media (max-width: 400px) {
        flex-direction: column;
        align-items: stretch;
    }
`;

/** Przełącznik jednostek nie kurczy się; na telefonie pod polem, na całą szerokość. */
export const UnitSwitch = styled.div`
    flex: none;

    @media (max-width: 400px) {
        > div { display: flex; }
        > div > button { flex: 1 1 0; }
    }
`;

export const FieldError = styled.span`
    font-size: 12.5px;
    color: ${ui.dangerInk};
`;

const RESULT_TONES: Record<PriceChangeKind, { line: string; bg: string; ink: string; chipBg: string }> = {
    discount: { line: ui.okLine, bg: ui.okTint, ink: ui.okInk, chipBg: ui.okTintHover },
    surcharge: { line: ui.warnLine, bg: ui.warnTint, ink: ui.warnInk, chipBg: '#fef3c7' },
    none: { line: ui.line, bg: ui.surfaceSoft, ink: ui.textSecondary, chipBg: ui.surfaceAlt },
};

export const Result = styled.div<{ $kind: PriceChangeKind }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: ${ui.radiusStrip};
    border: 1px solid ${p => RESULT_TONES[p.$kind].line};
    background: ${p => RESULT_TONES[p.$kind].bg};
`;

export const ResultHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

export const ResultLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

export const ResultChip = styled.span<{ $kind: PriceChangeKind }>`
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: ${p => RESULT_TONES[p.$kind].ink};
    background: ${p => RESULT_TONES[p.$kind].chipBg};
    white-space: nowrap;
`;

export const ResultPrices = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-variant-numeric: tabular-nums;
`;

export const ResultGross = styled.span`
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

export const ResultNet = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
`;

export const Footer = styled.div`
    flex-shrink: 0;
    padding: 12px 20px;
    background: ${ui.surfaceSoft};
    border-top: 1px solid ${ui.lineFaint};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

export const FooterEnd = styled.div`
    margin-left: auto;
    display: flex;
    gap: 8px;
`;

/** Powrót do ceny wyjściowej: tekstowy, bo to wycofanie, a nie krok następny. */
export const ResetBtn = styled.button`
    padding: 8px 4px;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;

    &:hover { color: ${ui.ink}; }
    ${touch} { min-height: 44px; }
`;
