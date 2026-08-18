// src/common/components/BaseControls/BaseSelect.tsx
import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styled from 'styled-components';
import {
    FieldWrapper,
    FieldLabel,
    RequiredMark,
    FieldError,
    FieldHint,
    controlChrome,
    field,
} from './baseField.styles';

export interface BaseSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface BaseSelectProps
    extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'children' | 'multiple'> {
    /** Visible field label; required so no control ships unlabeled. */
    label: string;
    /** Options are data, not JSX: keeps every select's markup identical. */
    options: ReadonlyArray<BaseSelectOption>;
    /** Placeholder rendered as a disabled empty first option. */
    placeholder?: string;
    /** Validation message; its presence switches the control into the error state. */
    error?: string;
    /** Muted helper line under the control; hidden while an error is shown. */
    hint?: string;
    /** Convenience callback with the selected value (native onChange still fires). */
    onValueChange?: (value: string) => void;
}

/**
 * The one select. Same anatomy and states as `BaseInput`; the chevron is an
 * inline SVG background so the native arrow can't diverge between browsers.
 * Ref is forwarded for react-hook-form's `register`.
 */
export const BaseSelect = forwardRef<HTMLSelectElement, BaseSelectProps>(
    function BaseSelect(
        { label, options, placeholder, error, hint, onValueChange, required, id, onChange, defaultValue, value, ...selectProps },
        ref
    ) {
        const autoId = useId();
        const selectId = id ?? autoId;
        const messageId = `${selectId}-message`;
        const invalid = Boolean(error);

        // Uncontrolled + placeholder: preselect the empty option so the
        // placeholder actually shows instead of the first real option.
        const resolvedDefault =
            value === undefined && defaultValue === undefined && placeholder !== undefined
                ? ''
                : defaultValue;

        return (
            <FieldWrapper>
                <FieldLabel htmlFor={selectId}>
                    {label}
                    {required && <RequiredMark>*</RequiredMark>}
                </FieldLabel>
                <StyledSelect
                    {...selectProps}
                    ref={ref}
                    id={selectId}
                    required={required}
                    value={value}
                    defaultValue={resolvedDefault}
                    $invalid={invalid}
                    $placeholderShown={placeholder !== undefined && (value === '' || value === undefined)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={error || hint ? messageId : undefined}
                    onChange={e => {
                        onChange?.(e);
                        onValueChange?.(e.target.value);
                    }}
                >
                    {placeholder !== undefined && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map(option => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </option>
                    ))}
                </StyledSelect>
                {error
                    ? <FieldError id={messageId}>{error}</FieldError>
                    : hint && <FieldHint id={messageId}>{hint}</FieldHint>}
            </FieldWrapper>
        );
    }
);

const CHEVRON =
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

const StyledSelect = styled.select<{ $invalid: boolean; $placeholderShown: boolean }>`
    ${controlChrome};
    appearance: none;
    padding-right: 34px;
    background-image: ${CHEVRON};
    background-repeat: no-repeat;
    background-position: right 12px center;
    cursor: pointer;

    /* Mirror ::placeholder; selects have no native equivalent. */
    color: ${p => (p.$placeholderShown ? field.placeholderColor : field.controlColor)};

    &:invalid {
        color: ${field.placeholderColor};
    }
`;
