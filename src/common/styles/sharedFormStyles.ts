/**
 * Shared form primitives: Stitch-inspired design system
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
    color: var(--ui-text-secondary);
    letter-spacing: 0.01em;
    line-height: 1;
`;

// ─── Text inputs ──────────────────────────────────────────────────────────────

export const FormInput = styled.input<{ $hasError?: boolean; $accentColor?: string }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : 'var(--ui-line)'};
    border-radius: 10px;
    font-size: 15px;
    font-weight: 400;
    color: var(--ui-ink);
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    font-family: inherit;

    &::placeholder { color: var(--ui-text-faint); }

    &:hover:not(:focus):not(:disabled) {
        border-color: var(--ui-line-hover);
    }

    &:focus {
        border-color: ${p => p.$hasError ? '#ef4444' : (p.$accentColor ?? '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p =>
            p.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }

    &:disabled {
        background: var(--ui-surface-soft);
        color: var(--ui-text-faint);
        cursor: not-allowed;
        border-color: var(--ui-surface-alt);
    }
`;

export const FormTextarea = styled.textarea<{ $hasError?: boolean; $accentColor?: string }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : 'var(--ui-line)'};
    border-radius: 10px;
    font-size: 14px;
    font-weight: 400;
    color: var(--ui-ink);
    outline: none;
    resize: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    font-family: inherit;
    line-height: 1.5;

    &::placeholder { color: var(--ui-text-faint); }

    &:hover:not(:focus) { border-color: var(--ui-line-hover); }

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
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : 'var(--ui-line)'};
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:hover:not(:disabled) { border-color: var(--ui-line-hover); }

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
        color: ${p => p.$hasValue ? 'var(--ui-ink)' : 'var(--ui-text-faint)'};
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
    border-radius: 10px;
    font-size: 14px;
    color: #dc2626;
    font-weight: 500;
`;

// ─── Native select ────────────────────────────────────────────────────────────

export const FormSelect = styled.select<{ $hasError?: boolean }>`
    width: 100%;
    padding: 11px 16px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : 'var(--ui-line)'};
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    font-weight: 400;
    color: var(--ui-ink);
    outline: none;
    cursor: pointer;
    transition: border-color 180ms ease, box-shadow 180ms ease;

    &:focus {
        border-color: ${p => p.$hasError ? '#ef4444' : '#0ea5e9'};
        box-shadow: 0 0 0 3px ${p =>
            p.$hasError ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }

    &:disabled {
        background: var(--ui-surface-soft);
        color: var(--ui-text-faint);
        cursor: not-allowed;
        border-color: var(--ui-surface-alt);
    }
`;

// ─── Checkbox card ────────────────────────────────────────────────────────────

export const FormCheckboxCard = styled.div`
    padding: 14px 16px;
    background: var(--ui-surface-soft);
    border: 1.5px solid var(--ui-line);
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
    color: var(--ui-ink);
    line-height: 1.4;
`;

export const FormCheckboxDescription = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--ui-text-muted);
    line-height: 1.4;
`;

// ─── Info box (read-only display) ─────────────────────────────────────────────

export const FormInfoBox = styled.div`
    padding: 14px 16px;
    background: var(--ui-surface-soft);
    border: 1px solid var(--ui-line);
    border-radius: 10px;
`;

export const FormInfoLabel = styled.p`
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ui-text-faint);
`;

export const FormInfoValue = styled.p`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ui-ink);
    letter-spacing: -0.2px;
`;
