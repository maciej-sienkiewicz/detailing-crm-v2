// src/modules/auth/components/PasswordInput.tsx
import { useState } from 'react';
import styled from 'styled-components';

const InputWrapper = styled.div`
    position: relative;
    width: 100%;
`;

const StyledInput = styled.input<{ $hasError?: boolean }>`
    width: 100%;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl} ${props => props.theme.spacing.md} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};
    background-color: ${props => props.theme.colors.surface};

    &:focus {
        outline: none;
        border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ToggleButton = styled.button`
    position: absolute;
    right: ${props => props.theme.spacing.md};
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.lg};
    padding: ${props => props.theme.spacing.xs};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.text};
    }

    &:focus {
        outline: none;
        color: ${props => props.theme.colors.primary};
    }
`;

const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    hasError?: boolean;
    autoComplete?: string;
    id?: string;
    name?: string;
}

export const PasswordInput = ({
                                  value,
                                  onChange,
                                  placeholder,
                                  hasError,
                                  autoComplete = 'current-password',
                                  id,
                                  name,
                              }: PasswordInputProps) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <InputWrapper>
            <StyledInput
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                $hasError={hasError}
                autoComplete={autoComplete}
                id={id}
                name={name}
            />
            <ToggleButton
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                aria-label={isVisible ? 'Ukryj hasło' : 'Pokaż hasło'}
            >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </ToggleButton>
        </InputWrapper>
    );
};