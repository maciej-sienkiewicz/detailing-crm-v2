import styled, { css, keyframes } from 'styled-components';

/**
 * Ekran „Witaj w DetailBoost" to dalszy ciąg rejestracji, więc mówi jej językiem
 * (auth/components/AuthUi.tsx): jasna kolumna, granat paska bocznego jako jedyne
 * wypełnienie, cienkie szare obwódki, krój i rozmiary formularzy aplikacji. Dawny
 * wygląd - błękitne gradienty, pomarańczowa plakietka, wersaliki 11 px - był osobnym
 * światem między stroną logowania a aplikacją.
 */

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#cfd6df';
const LINE_SOFT = '#dde3ea';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

/**
 * Ekran zakrywa wszystko pod sobą, tak jak wcześniej: bramka subskrypcji nie renderuje
 * aplikacji, dopóki studio nie wybierze startu, a ten ekran może stać w środku układu.
 */
export const Screen = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow-y: auto;
    background: ${p => p.theme.colors.background};
`;

/** Warunki okresu próbnego pod jego przyciskiem - jedynym wypełnionym na tym ekranie. */
export const TrialNote = styled.p`
    margin-top: 10px;
    font-size: 14px;
    line-height: 1.5;
    color: ${MUTED};
`;

/** $first: bez okresu próbnego nad sobą sekcja stoi tuż pod nagłówkiem - kreska nic by nie oddzielała. */
export const Section = styled.section<{ $first?: boolean }>`
    margin-top: ${p => (p.$first ? 0 : 28)}px;
    padding-top: ${p => (p.$first ? 0 : 24)}px;
    border-top: ${p => (p.$first ? 'none' : `1px solid ${LINE_SOFT}`)};
    display: flex;
    flex-direction: column;
    gap: 10px;

    h2 {
        margin-bottom: 4px;
        font-size: 15px;
        font-weight: 600;
        color: ${INK};
    }
`;

const option = css`
    width: 100%;
    border: 1px solid ${LINE};
    border-radius: 8px;
    background: #ffffff;
    font-family: inherit;
    text-align: left;
    color: ${INK};
    cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:hover:not(:disabled) {
        border-color: #94a3b8;
    }

    &:focus-visible {
        outline: 2px solid ${INK};
        outline-offset: 2px;
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

/** Pakiet: nazwa i zakres po lewej, cena po prawej - jedna decyzja w jednym wierszu. */
export const PlanOption = styled.button`
    ${option}
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 16px;
    align-items: baseline;
    padding: 14px 16px;

    .name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
    }

    .price {
        font-size: 15px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .price small {
        font-size: 13px;
        font-weight: 400;
        color: ${MUTED};
    }

    .features {
        grid-column: 1 / -1;
        font-size: 13px;
        line-height: 1.5;
        color: ${MUTED};
    }
`;

/** „Polecany" - podpowiedź, nie wezwanie: obwódka bez wypełnienia (CLAUDE.md §2). */
export const Recommended = styled.span`
    padding: 1px 8px;
    border: 1px solid ${LINE};
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    color: ${MUTED};
`;

export const CustomToggle = styled.button`
    ${option}
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 16px;
    font-size: 15px;
    font-weight: 500;

    svg {
        color: ${MUTED};
        transition: transform 200ms ease;
    }

    &[aria-expanded='true'] svg {
        transform: rotate(180deg);
    }
`;

export const CustomPanel = styled.div`
    border: 1px solid ${LINE};
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
`;

export const ModuleRow = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${LINE_SOFT};
    cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
    opacity: ${p => (p.$disabled ? 0.55 : 1)};
    user-select: none;

    input {
        width: 16px;
        height: 16px;
        margin: 2px 0 0;
        flex-shrink: 0;
        accent-color: ${INK};
        cursor: inherit;
    }

    .meta {
        flex: 1;
        min-width: 0;
    }

    .name {
        font-size: 14px;
        font-weight: 600;
        color: ${INK};
    }

    .soon {
        margin-left: 6px;
        font-size: 12px;
        font-weight: 400;
        color: ${MUTED};
    }

    .desc {
        display: block;
        margin-top: 2px;
        font-size: 13px;
        line-height: 1.45;
        color: ${MUTED};
    }

    .price {
        font-size: 14px;
        font-weight: 600;
        color: ${INK};
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
`;

export const CustomSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px 16px;

    .total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;
        color: ${MUTED};
    }

    .total strong {
        font-size: 18px;
        font-weight: 650;
        color: ${INK};
        font-variant-numeric: tabular-nums;
    }

    .hint {
        font-size: 13px;
        color: #b45309;
    }
`;

export const Pending = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
    font-size: 15px;
    color: ${MUTED};
`;

export const Spinner = styled.span`
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border: 2px solid ${LINE_SOFT};
    border-top-color: ${INK};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;

    @media (prefers-reduced-motion: reduce) {
        animation-duration: 2s;
    }
`;
