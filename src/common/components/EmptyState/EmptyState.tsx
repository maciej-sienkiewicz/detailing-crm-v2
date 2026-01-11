// src/common/components/EmptyState/EmptyState.tsx
import styled from 'styled-components';

const Container = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    border: 2px dashed ${props => props.theme.colors.border};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const Icon = styled.div`
    font-size: ${props => props.theme.fontSizes.xxxl};
    margin-bottom: ${props => props.theme.spacing.md};
    opacity: 0.5;
`;

const Title = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
`;

const Description = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, children }: EmptyStateProps) => {
    return (
        <Container>
            {icon && <Icon>{icon}</Icon>}
            <Title>{title}</Title>
            {description && <Description>{description}</Description>}
            {children}
        </Container>
    );
};