// src/common/components/Badge/Badge.tsx
import styled from 'styled-components';

export const Badge = styled.span<{ $variant?: 'success' | 'error' | 'warning' | 'info' | 'primary' }>`
    display: inline-flex;
    align-items: center;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;

    ${props => {
    switch (props.$variant) {
        case 'success':
            return `
                    background-color: ${props.theme.colors.successLight};
                    color: ${props.theme.colors.success};
                `;
        case 'error':
            return `
                    background-color: ${props.theme.colors.errorLight};
                    color: ${props.theme.colors.error};
                `;
        case 'warning':
            return `
                    background-color: ${props.theme.colors.warningLight};
                    color: ${props.theme.colors.warning};
                `;
        case 'primary':
            return `
                    background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
                    color: white;
                `;
        default: // info
            return `
                    background-color: ${props.theme.colors.surfaceAlt};
                    color: ${props.theme.colors.textSecondary};
                `;
    }
}}
`;