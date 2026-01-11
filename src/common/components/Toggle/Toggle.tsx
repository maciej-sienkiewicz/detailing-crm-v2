// src/common/components/Toggle/Toggle.tsx
import styled from 'styled-components';

const ToggleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.md};
    }
`;

const ToggleSwitch = styled.label<{ $size?: 'sm' | 'md' | 'lg' }>`
    position: relative;
    display: inline-block;
    width: ${props => {
    switch (props.$size) {
        case 'sm': return '40px';
        case 'lg': return '56px';
        default: return '44px';
    }
}};
    height: ${props => {
    switch (props.$size) {
        case 'sm': return '20px';
        case 'lg': return '32px';
        default: return '24px';
    }
}};
    cursor: pointer;
`;

const ToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + span {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }

    &:checked + span:before {
        transform: translateX(${props => props.theme.spacing.lg});
    }

    &:focus + span {
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    }

    &:disabled + span {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border};
    transition: all ${props => props.theme.transitions.normal};
    border-radius: ${props => props.theme.radii.full};
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);

    &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        transition: all ${props => props.theme.transitions.normal};
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
`;

const ToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    user-select: none;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

export const Toggle = ({ checked, onChange, label, size = 'md', disabled = false }: ToggleProps) => {
    return (
        <ToggleContainer>
            <ToggleSwitch $size={size}>
                <ToggleInput
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <ToggleSlider />
            </ToggleSwitch>
            {label && <ToggleLabel>{label}</ToggleLabel>}
        </ToggleContainer>
    );
};