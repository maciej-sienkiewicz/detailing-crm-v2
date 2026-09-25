// src/modules/comms/components/signature/designerStyles.ts
// Wspólne elementy formularzy kreatora stopki.
//
// Zaznaczenie (wybrany motyw, czcionka, styl ikon, krok) to ODCIEŃ marki jako tło
// i obwódka, nigdy wypełnienie: jedynym wypełnionym elementem okna jest „Zapisz
// stopkę" (CLAUDE.md, „jedno wypełnienie na okno").
import styled, { css } from 'styled-components';

export const brandTint = (percent: number) => `color-mix(in srgb, var(--brand-primary) ${percent}%, #ffffff)`;

export const StepHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

export const StepIcon = styled.span`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${p => p.theme.radii.md};
    background: ${brandTint(12)};
    color: var(--brand-primary);

    svg { width: 18px; height: 18px; }
`;

export const StepTitle = styled.h3`
    margin: 0;
    font-size: 17px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.2px;
`;

export const StepHint = styled.p`
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
`;

export const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const GroupTitle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

export const FieldGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 14px;

    @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

export const Field = styled.label<{ $wide?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    ${p => p.$wide && css`grid-column: 1 / -1;`}
`;

export const FieldLabel = styled.span`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};

    em { font-style: normal; color: ${p => p.theme.colors.error}; }
`;

const inputBase = css<{ $invalid?: boolean }>`
    width: 100%;
    min-width: 0;
    border: 1px solid ${p => (p.$invalid ? p.theme.colors.error : p.theme.colors.border)};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    padding: 9px 12px;
    font-size: 14px;
    font-family: inherit;
    color: ${p => p.theme.colors.text};
    outline: none;
    transition: border-color ${p => p.theme.transitions.fast}, box-shadow ${p => p.theme.transitions.fast};

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    &:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px ${brandTint(18)};
    }
`;

export const Input = styled.input<{ $invalid?: boolean }>`
    ${inputBase}
`;

export const TextArea = styled.textarea<{ $invalid?: boolean }>`
    ${inputBase}
    min-height: 84px;
    resize: vertical;
    line-height: 1.5;
`;

export const Help = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

export const Note = styled.div`
    padding: 14px 16px;
    border-radius: ${p => p.theme.radii.md};
    border: 1px dashed ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    font-size: 13px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};
`;

export const Segmented = styled.div`
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
`;

/** Opcja do wyboru: zaznaczona dostaje odcień i obwódkę marki, bez wypełnienia. */
export const Choice = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: ${p => p.theme.radii.md};
    border: 1px solid ${p => (p.$active ? 'var(--brand-primary)' : p.theme.colors.border)};
    background: ${p => (p.$active ? brandTint(10) : p.theme.colors.surface)};
    color: ${p => (p.$active ? p.theme.colors.text : p.theme.colors.textSecondary)};
    font-size: 13px;
    font-weight: ${p => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: var(--brand-primary); }

    img { width: 16px; height: 16px; display: block; }
`;
