import { Controller, useFormContext } from 'react-hook-form';
import { PhoneInput } from './PhoneInput';
import styled from 'styled-components';

const ErrorMessage = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;

    svg {
        width: 14px;
        height: 14px;
    }
`;

const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

interface PhoneInputFieldProps {
    name: string;
    placeholder?: string;
    id?: string;
}

export const PhoneInputField = ({ name, placeholder, id }: PhoneInputFieldProps) => {
    const { control, formState: { errors } } = useFormContext();

    // Get error for this field
    const error = name.split('.').reduce((obj, key) => obj?.[key], errors as any);

    return (
        <div>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <PhoneInput
                        ref={field.ref}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        hasError={!!error}
                        placeholder={placeholder}
                        id={id}
                        name={name}
                    />
                )}
            />
            {error && (
                <ErrorMessage>
                    <ErrorIcon />
                    {error.message as string}
                </ErrorMessage>
            )}
        </div>
    );
};
