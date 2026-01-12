// src/modules/auth/components/PasswordStrengthIndicator.tsx
import styled from 'styled-components';
import { calculatePasswordStrength, getPasswordStrengthLabel } from '../utils/passwordStrength';

const Container = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
`;

const Bars = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const Bar = styled.div<{ $active: boolean; $color: string }>`
    flex: 1;
    height: 4px;
    border-radius: ${props => props.theme.radii.sm};
    background-color: ${props => props.$active ? props.$color : props.theme.colors.border};
    transition: background-color ${props => props.theme.transitions.normal};
`;

const Label = styled.div<{ $color: string }>`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.$color};
`;

interface PasswordStrengthIndicatorProps {
    password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
    if (!password) return null;

    const strength = calculatePasswordStrength(password);
    const label = getPasswordStrengthLabel(strength.label);

    return (
        <Container>
            <Bars>
                <Bar $active={strength.score >= 1} $color={strength.color} />
                <Bar $active={strength.score >= 2} $color={strength.color} />
                <Bar $active={strength.score >= 3} $color={strength.color} />
            </Bars>
            <Label $color={strength.color}>{label}</Label>
        </Container>
    );
};