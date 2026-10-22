import styled from 'styled-components';
import React from 'react';

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Two-column responsive grid for form fields. */
export const FormGrid = styled.div<{ $columns?: number }>`
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: ${props => `repeat(${props.$columns || 2}, 1fr)`};
    }
`;

/**
 * Wrapper for a single field: stacks Label → InputShell → FormErrorMsg.
 * Use $fullWidth to span both grid columns on ≥md.
 */
export const FormField = styled.div<{ $fullWidth?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;

    ${props => props.$fullWidth && `
        @media (min-width: ${props.theme.breakpoints.md}) {
            grid-column: span 2;
        }
    `}
`;

/** @deprecated Use FormField */
export { FormField as FieldGroup };

// ─── Label ────────────────────────────────────────────────────────────────────

/**
 * Standard field label: 13px semi-bold, slate-700 (#374151).
 * Always pair with htmlFor pointing to the input id.
 */
export const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    letter-spacing: -0.01em;
    line-height: 1;
`;

/** @deprecated Use FieldLabel */
export const Label = styled.label`
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.45px;
    line-height: 1;
`;

// ─── Input Shell (wrapper pattern) ────────────────────────────────────────────

/**
 * Visual shell for inputs: white background, 1.5px border, 10px radius.
 * Place a bare <input> or <textarea> inside; the shell owns the border and focus ring.
 * The inner element must have: border: none; background: transparent; outline: none.
 */
/**
 * $compact shrinks padding/radius for dense, single-screen layouts (e.g. the
 * vehicle handover sheet) where the default size reads as oversized next to
 * surrounding 13px-scale controls. Default sizing is unchanged everywhere else.
 */
export const InputShell = styled.div<{ $hasError?: boolean; $compact?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 1.5px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
    border-radius: ${props => props.$compact ? '8px' : '10px'};
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        border-color: ${props => props.$hasError ? '#ef4444' : '#cbd5e1'};
    }

    &:focus-within {
        border-color: ${props => props.$hasError ? '#ef4444' : 'var(--brand-ink)'};
        box-shadow: 0 0 0 3px ${props =>
            props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(3, 105, 161, 0.1)'};
    }
`;

export const InputShellTextArea = styled(InputShell)`
    align-items: flex-start;
`;

// ─── Bare input / textarea (used inside InputShell) ───────────────────────────

/** Bare input: no border, transparent bg; place inside InputShell. */
export const BareInput = styled.input<{ $compact?: boolean }>`
    width: 100%;
    padding: ${props => props.$compact ? '8px 10px' : '12px 14px'};
    border: none;
    border-radius: ${props => props.$compact ? '8px' : '10px'};
    font-size: ${props => props.$compact ? '13px' : '14px'};
    background: transparent;
    color: #0f172a;
    line-height: 1.5;

    &:focus { outline: none; }
    &::placeholder { color: #94a3b8; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

/** Bare textarea: no border, transparent bg; place inside InputShellTextArea. */
export const BareTextArea = styled.textarea`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    background: transparent;
    color: #0f172a;
    min-height: 100px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;

    &:focus { outline: none; }
    &::placeholder { color: #94a3b8; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ─── Legacy standalone Input / Select / TextArea ──────────────────────────────
// These remain for modules that haven't migrated yet.

/** @deprecated Use InputShell + BareInput */
export const Input = styled.input<{ $hasError?: boolean }>`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 9px 12px;
    border: 1px solid ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.border)};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: #F8FAFC;
    color: ${props => props.theme.colors.text};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        background: #FFFFFF;
        border-color: ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.primary)};
        box-shadow: 0 0 0 3px ${props => (props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(3, 105, 161, 0.1)')};
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

/** @deprecated Use InputShell + native <select> */
export const Select = styled.select<{ $compact?: boolean; $hasError?: boolean }>`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: ${props => props.$compact ? '8px 10px' : '9px 12px'};
    border: 1px solid ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.border)};
    border-radius: ${props => props.$compact ? '8px' : props.theme.radii.md};
    font-size: ${props => props.$compact ? '13px' : props.theme.fontSizes.sm};
    background: #F8FAFC;
    color: ${props => props.theme.colors.text};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        background: #FFFFFF;
        border-color: ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.primary)};
        box-shadow: 0 0 0 3px ${props => (props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(3, 105, 161, 0.1)')};
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

/** @deprecated Use InputShellTextArea + BareTextArea */
export const TextArea = styled.textarea<{ $hasError?: boolean }>`
    padding: 9px 12px;
    border: 1px solid ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.border)};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    background: #F8FAFC;
    color: ${props => props.theme.colors.text};
    resize: vertical;
    min-height: 100px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        background: #FFFFFF;
        border-color: ${props => (props.$hasError ? props.theme.colors.error : props.theme.colors.primary)};
        box-shadow: 0 0 0 3px ${props => (props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(3, 105, 161, 0.1)')};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

// ─── Error message ─────────────────────────────────────────────────────────────

const ErrorIconSvg = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="14"
        height="14"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const ErrorMessageWrapper = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
`;

/** @deprecated Use FormErrorMsg */
export const ErrorMessage = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    margin-top: ${props => props.theme.spacing.xs};
`;

/** Standard error message: icon + text, shown below a field. */
export const FormErrorMsg = ({ children }: { children: React.ReactNode }) => (
    <ErrorMessageWrapper role="alert">
        <ErrorIconSvg />
        {children}
    </ErrorMessageWrapper>
);

// ─── Alert Banner (API-level errors) ──────────────────────────────────────────

/**
 * Full-width error banner for form-level API errors.
 * Place at the top of ModalContent, before the form.
 */
export const FormAlertBanner = styled.div`
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    font-size: 14px;
    color: #b91c1c;
    line-height: 1.5;
`;

// ─── Section Header ────────────────────────────────────────────────────────────

// ─── Toggle Card ──────────────────────────────────────────────────────────────

// ─── Expandable Section ───────────────────────────────────────────────────────

// ─── Tab navigation ───────────────────────────────────────────────────────────

export const FormTabBar = styled.div`
    display: flex;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 24px;
    gap: 0;
`;

export const FormTabBtn = styled.button<{ $active?: boolean }>`
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid ${p => p.$active ? 'var(--brand-ink)' : 'transparent'};
    margin-bottom: -1px;
    background: none;
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 500};
    color: ${p => p.$active ? 'var(--brand-ink)' : '#64748b'};
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;

    &:hover {
        color: ${p => p.$active ? 'var(--brand-ink)' : '#374151'};
    }
`;

/** CSS-based tab panel, always in the DOM so react-hook-form retains field values. */
export const FormTabPanel = styled.div<{ $active?: boolean }>`
    display: ${p => p.$active ? 'block' : 'none'};
`;
