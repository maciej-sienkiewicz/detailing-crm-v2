// src/modules/auth/components/Checkbox.tsx
import styled from 'styled-components';

const CheckboxContainer = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    cursor: pointer;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;

    &:focus + div {
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const StyledCheckbox = styled.div<{ $checked: boolean; $hasError?: boolean }>`
    width: 20px;
    height: 20px;
    min-width: 20px;
    border: 2px solid ${props => props.$hasError ? props.theme.colors.error : props.$checked ? props.theme.colors.primary : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    background-color: ${props => props.$checked ? props.theme.colors.primary : props.theme.colors.surface};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all ${props => props.theme.transitions.fast};
    margin-top: 2px;

    svg {
        width: 14px;
        height: 14px;
        stroke: white;
        opacity: ${props => props.$checked ? '1' : '0'};
        transition: opacity ${props => props.theme.transitions.fast};
    }
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    user-select: none;
    line-height: 1.5;
`;

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: React.ReactNode;
    hasError?: boolean;
    id?: string;
}

export const Checkbox = ({ checked, onChange, label, hasError, id }: CheckboxProps) => {
    return (
        <CheckboxContainer onClick={() => onChange(!checked)}>
            <HiddenCheckbox
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                id={id}
            />
            <StyledCheckbox $checked={checked} $hasError={hasError}>
                <CheckIcon />
            </StyledCheckbox>
            <Label htmlFor={id}>{label}</Label>
        </CheckboxContainer>
    );
};