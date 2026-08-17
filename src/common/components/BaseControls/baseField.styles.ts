// src/common/components/BaseControls/baseField.styles.ts
import styled, { css } from 'styled-components';

/**
 * Single source of truth for form-control anatomy: label, control, hint and
 * error typography, spacing and states. Values are intentionally hardcoded —
 * these controls exist to end the per-view drift in label sizes, placeholder
 * colors and margins, so no prop and no theme override can change them.
 */
export const field = {
    labelFontSize: '12px',
    labelColor: '#334155',
    labelGap: '6px',

    controlHeight: '40px',
    controlFontSize: '13px',
    controlColor: '#0f172a',
    controlRadius: '8px',
    controlPaddingX: '12px',

    placeholderColor: '#94a3b8',

    border: '#e2e8f0',
    borderHover: '#cbd5e1',
    focus: '#0ea5e9',
    focusRing: 'rgba(14, 165, 233, 0.12)',

    error: '#ef4444',
    errorRing: 'rgba(239, 68, 68, 0.12)',

    disabledBg: '#f8fafc',
    disabledColor: '#94a3b8',

    messageFontSize: '12px',
    messageGap: '5px',
} as const;

export const FieldWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
`;

export const FieldLabel = styled.label`
    font-size: ${field.labelFontSize};
    font-weight: 600;
    color: ${field.labelColor};
    margin-bottom: ${field.labelGap};
    display: inline-flex;
    align-items: center;
    gap: 3px;
`;

export const RequiredMark = styled.span.attrs({ 'aria-hidden': true })`
    color: ${field.error};
    font-weight: 700;
`;

/** Shared chrome for every control: border, radius, focus ring, error state. */
export const controlChrome = css<{ $invalid: boolean }>`
    width: 100%;
    height: ${field.controlHeight};
    padding: 0 ${field.controlPaddingX};
    font-family: inherit;
    font-size: ${field.controlFontSize};
    color: ${field.controlColor};
    background: #ffffff;
    border: 1px solid ${p => (p.$invalid ? field.error : field.border)};
    border-radius: ${field.controlRadius};
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &::placeholder {
        color: ${field.placeholderColor};
    }

    &:hover:not(:disabled):not(:focus) {
        border-color: ${p => (p.$invalid ? field.error : field.borderHover)};
    }

    &:focus {
        border-color: ${p => (p.$invalid ? field.error : field.focus)};
        box-shadow: 0 0 0 3px ${p => (p.$invalid ? field.errorRing : field.focusRing)};
    }

    &:disabled {
        background: ${field.disabledBg};
        color: ${field.disabledColor};
        cursor: not-allowed;
    }
`;

export const FieldError = styled.span.attrs({ role: 'alert' })`
    font-size: ${field.messageFontSize};
    font-weight: 500;
    color: ${field.error};
    margin-top: ${field.messageGap};
`;

export const FieldHint = styled.span`
    font-size: ${field.messageFontSize};
    color: ${field.placeholderColor};
    margin-top: ${field.messageGap};
`;
