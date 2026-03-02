// src/common/components/Form/Form.tsx
import styled from 'styled-components';

export const FormGrid = styled.div<{ $columns?: number }>`
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: ${props => `repeat(${props.$columns || 2}, 1fr)`};
    }
`;

export const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

export const Label = styled.label`
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.45px;
    line-height: 1;
`;

export const Input = styled.input<{ $hasError?: boolean }>`
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
        box-shadow: 0 0 0 3px ${props => (props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)')};
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

export const Select = styled.select`
    padding: 9px 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: #F8FAFC;
    color: ${props => props.theme.colors.text};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        background: #FFFFFF;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

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
        box-shadow: 0 0 0 3px ${props => (props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)')};
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

export const ErrorMessage = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    margin-top: ${props => props.theme.spacing.xs};
`;
