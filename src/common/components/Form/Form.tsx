// src/common/components/Form/Form.tsx
import styled from 'styled-components';

export const FormGrid = styled.div<{ $columns?: number }>`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: ${props => `repeat(${props.$columns || 2}, 1fr)`};
    }
`;

export const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

export const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

export const Input = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

export const Select = styled.select`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

export const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
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
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
    margin-top: ${props => props.theme.spacing.xs};
`;