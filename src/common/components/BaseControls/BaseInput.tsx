// src/common/components/BaseControls/BaseInput.tsx
import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import styled from 'styled-components';
import {
    FieldWrapper,
    FieldLabel,
    RequiredMark,
    FieldError,
    FieldHint,
    controlChrome,
} from './baseField.styles';

export interface BaseInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    /** Visible field label — required so no control ships unlabeled. */
    label: string;
    /** Validation message; its presence switches the control into the error state. */
    error?: string;
    /** Muted helper line under the control; hidden while an error is shown. */
    hint?: string;
    /** Convenience callback with the raw string value (native onChange still fires). */
    onValueChange?: (value: string) => void;
}

/**
 * The one text input. Label, placeholder, margins and font sizes are fixed in
 * `baseField.styles.ts` and not overridable via props. Plays with both
 * controlled usage (`value`/`onChange` or `onValueChange`) and react-hook-form
 * (`{...register('name')}` — the ref is forwarded).
 */
export const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(
    function BaseInput({ label, error, hint, onValueChange, required, id, onChange, ...inputProps }, ref) {
        const autoId = useId();
        const inputId = id ?? autoId;
        const messageId = `${inputId}-message`;
        const invalid = Boolean(error);

        return (
            <FieldWrapper>
                <FieldLabel htmlFor={inputId}>
                    {label}
                    {required && <RequiredMark>*</RequiredMark>}
                </FieldLabel>
                <StyledInput
                    {...inputProps}
                    ref={ref}
                    id={inputId}
                    required={required}
                    $invalid={invalid}
                    aria-invalid={invalid || undefined}
                    aria-describedby={error || hint ? messageId : undefined}
                    onChange={e => {
                        onChange?.(e);
                        onValueChange?.(e.target.value);
                    }}
                />
                {error
                    ? <FieldError id={messageId}>{error}</FieldError>
                    : hint && <FieldHint id={messageId}>{hint}</FieldHint>}
            </FieldWrapper>
        );
    }
);

const StyledInput = styled.input<{ $invalid: boolean }>`
    ${controlChrome};
`;
