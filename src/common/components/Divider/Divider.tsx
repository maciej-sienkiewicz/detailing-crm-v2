// src/common/components/Divider/Divider.tsx
import styled from 'styled-components';

export const Divider = styled.div<{ $spacing?: 'sm' | 'md' | 'lg' }>`
    height: 1px;
    background-color: ${props => props.theme.colors.border};
    margin: ${props => {
    switch (props.$spacing) {
        case 'sm': return `${props.theme.spacing.sm} 0`;
        case 'lg': return `${props.theme.spacing.xl} 0`;
        default: return `${props.theme.spacing.lg} 0`;
    }
}};
`;