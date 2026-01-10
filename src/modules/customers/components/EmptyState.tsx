import styled from 'styled-components';

const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
    min-height: 300px;
`;

const EmptyIcon = styled.div`
    width: 64px;
    height: 64px;
    margin-bottom: ${props => props.theme.spacing.md};
    border-radius: 50%;
    background: ${props => props.theme.colors.surfaceAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: 24px;
`;

const EmptyTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs};
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
`;

const EmptyDescription = styled.p`
    margin: 0;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

interface EmptyStateProps {
    title: string;
    description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
    <EmptyContainer>
        <EmptyIcon>👤</EmptyIcon>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
    </EmptyContainer>
);