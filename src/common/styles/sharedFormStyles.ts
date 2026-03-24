/**
 * Shared form primitives — Stitch-inspired design system
 *
 * Used across all quick-entry modals in the calendar module
 * and available for reuse throughout the app.
 */
import styled from 'styled-components';

// ─── Layout ───────────────────────────────────────────────────────────────────

export const FormFieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const FormGrid2Col = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @media (min-width: 560px) {
        grid-template-columns: 1fr 1fr;
    }
`;

// ─── Label ────────────────────────────────────────────────────────────────────

export const FormLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    letter-spacing: 0.01em;
    line-height: 1;
`;

// ─── Text inputs ──────────────────────────────────────────────────────────────

export const FormInput = styled.input<{ $hasError?: boolean; $accentColor?: string }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 12px;
    font-size: 15px;
    font-weight: 400;
    color: #0f172a;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    font-family: inherit;

    &::placeholder { color: #94a3b8; }

    &:hover:not(:focus):not(:disabled) {
        border-color: #cbd5e1;
    }

    &:focus {
        border-color: ${p => p.$hasError ? '#ef4444' : (p.$accentColor ?? '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p =>
            p.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }

    &:disabled {
        background: #f8fafc;
        color: #94a3b8;
        cursor: not-allowed;
        border-color: #f1f5f9;
    }
`;

export const FormTextarea = styled.textarea<{ $hasError?: boolean; $accentColor?: string }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 12px;
    font-size: 14px;
    font-weight: 400;
    color: #0f172a;
    outline: none;
    resize: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    font-family: inherit;
    line-height: 1.5;

    &::placeholder { color: #94a3b8; }

    &:hover:not(:focus) { border-color: #cbd5e1; }

    &:focus {
        border-color: ${p => p.$hasError ? '#ef4444' : (p.$accentColor ?? '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p =>
            p.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }
`;

// ─── Select / trigger button ──────────────────────────────────────────────────

export const FormSelectButton = styled.button<{
    $hasError?: boolean;
    $hasValue?: boolean;
    $accentColor?: string;
}>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: 12px;
    text-align: left;
    cursor: pointer;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:hover:not(:disabled) { border-color: #cbd5e1; }

    &:focus {
        outline: none;
        border-color: ${p => p.$hasError ? '#ef4444' : (p.$accentColor ?? '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p =>
            p.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }

    span {
        flex: 1;
        font-size: 15px;
        color: ${p => p.$hasValue ? '#0f172a' : '#94a3b8'};
        font-weight: ${p => p.$hasValue ? 500 : 400};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

// ─── Validation messages ──────────────────────────────────────────────────────

export const FormErrorMessage = styled.p`
    margin: 0;
    font-size: 13px;
    color: #ef4444;
    font-weight: 500;
`;

export const FormSubmitError = styled.div`
    padding: 13px 16px;
    background: #fef2f2;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 12px;
    font-size: 14px;
    color: #dc2626;
    font-weight: 500;
`;

// ─── Checkbox card ────────────────────────────────────────────────────────────

export const FormCheckboxCard = styled.div`
    padding: 14px 16px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    transition: border-color 180ms ease, background 180ms ease;

    &:has(input:checked) {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }
`;

export const FormCheckboxLabel = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
`;

export const FormCheckbox = styled.input.attrs({ type: 'checkbox' })`
    flex-shrink: 0;
    margin-top: 2px;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    cursor: pointer;
    accent-color: #0ea5e9;
`;

export const FormCheckboxBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const FormCheckboxTitle = styled.span`
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
    line-height: 1.4;
`;

export const FormCheckboxDescription = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
`;

// ─── Info box (read-only display) ─────────────────────────────────────────────

export const FormInfoBox = styled.div`
    padding: 14px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

export const FormInfoLabel = styled.p`
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
`;

export const FormInfoValue = styled.p`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.2px;
`;
