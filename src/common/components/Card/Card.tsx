// src/common/components/Card/Card.tsx
import styled from 'styled-components';

export const Card = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

export const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

export const CardTitle = styled.h2<{ $size?: 'sm' | 'md' | 'lg' }>`
    font-size: ${props => {
    switch (props.$size) {
        case 'sm': return props.theme.fontSizes.md;
        case 'lg': return props.theme.fontSizes.xxl;
        default: return props.theme.fontSizes.lg;
    }
}};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => {
    switch (props.$size) {
        case 'sm': return props.theme.fontSizes.lg;
        case 'lg': return props.theme.fontSizes.xxxl;
        default: return props.theme.fontSizes.xl;
    }
}};
    }
`;

export const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;