// src/modules/employees/components/leave/leaveForm.styles.ts
//
// Pola formularzy wniosku urlopowego (kreator, podpis decyzji, odwołanie). Błąd
// walidacji stoi PRZY polu, którego dotyczy (400 z `field`), a nie w dymku.
// Na telefonie pola mają 16 px - mniejsza czcionka powiększa stronę w iOS.

import styled, { css } from 'styled-components';
import { ui } from '@/common/components/ui';

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const FieldRowPair = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

export const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

export const LabelRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
`;

const control = css<{ $invalid?: boolean }>`
    width: 100%;
    box-sizing: border-box;
    border: 1px solid ${p => p.$invalid ? ui.dangerLine : ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    font-family: inherit;
    font-size: 16px;
    color: ${ui.ink};
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;

    &:focus { border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14); }
    &:disabled { background: ${ui.surfaceSoft}; color: ${ui.textMuted}; }
    @media (min-width: 768px) { font-size: 14px; }
`;

export const Input = styled.input<{ $invalid?: boolean }>`
    ${control}
    height: 44px;
    padding: 0 12px;
`;

export const Select = styled.select<{ $invalid?: boolean }>`
    ${control}
    height: 44px;
    padding: 0 10px;
`;

export const Textarea = styled.textarea<{ $invalid?: boolean }>`
    ${control}
    min-height: 84px;
    padding: 10px 12px;
    line-height: 1.45;
    resize: vertical;
`;

export const FieldError = styled.p`
    margin: 0;
    font-size: 12.5px;
    font-weight: 500;
    color: ${ui.dangerInk};
`;

export const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

/** Licznik znaków: bursztyn przy limicie - pole na PDF ma stałą długość. */
export const CharCounter = styled.span<{ $near: boolean }>`
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$near ? ui.warnInk : ui.textFaint};
`;

export const Check = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    line-height: 1.4;
    color: ${ui.ink};
    cursor: pointer;

    input { width: 18px; height: 18px; margin: 1px 0 0; flex-shrink: 0; accent-color: ${ui.brandStrong}; }
`;
