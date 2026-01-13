// src/common/components/Button/Button.tsx
import styled from 'styled-components';

export const Button = styled.button<{
    $variant?: 'primary' | 'secondary' | 'danger';
    $fullWidth?: boolean;
    $size?: 'sm' | 'md' | 'lg';
}>`
    padding: ${props => {
    switch (props.$size) {
        case 'sm': return `${props.theme.spacing.sm} ${props.theme.spacing.md}`;
        case 'lg': return `${props.theme.spacing.lg} ${props.theme.spacing.xl}`;
        default: return `${props.theme.spacing.md} ${props.theme.spacing.lg}`;
    }
}};
    
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => {
    switch (props.$size) {
        case 'sm': return props.theme.fontSizes.sm;
        case 'lg': return props.theme.fontSizes.lg;
        default: return props.theme.fontSizes.md;
    }
}};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    width: ${props => props.$fullWidth ? '100%' : 'auto'};

    ${props => {
    switch (props.$variant) {
        case 'primary':
            return `
                    background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
                    color: white;
                    box-shadow: ${props.theme.shadows.md};

                    &:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: ${props.theme.shadows.lg};
                    }

                    &:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                `;
        case 'danger':
            return `
                    background-color: ${props.theme.colors.error};
                    color: white;
                    box-shadow: ${props.theme.shadows.md};

                    &:hover:not(:disabled) {
                        background-color: #b91c1c;
                        transform: translateY(-2px);
                        box-shadow: ${props.theme.shadows.lg};
                    }

                    &:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                `;
        default: // secondary
            return `
                    background-color: ${props.theme.colors.surface};
                    color: ${props.theme.colors.text};
                    border: 1px solid ${props.theme.colors.border};

                    &:hover:not(:disabled) {
                        background-color: ${props.theme.colors.surfaceHover};
                        transform: translateY(-1px);
                    }

                    &:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                `;
    }
}}

    &:active:not(:disabled) {
        transform: translateY(0);
    }
`;

export const ButtonGroup = styled.div<{ $orientation?: 'horizontal' | 'vertical'; $justify?: 'start' | 'end' | 'center' | 'between' }>`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    flex-direction: ${props => props.$orientation === 'vertical' ? 'column' : 'row'};
    justify-content: ${props => {
        switch (props.$justify) {
            case 'start': return 'flex-start';
            case 'end': return 'flex-end';
            case 'center': return 'center';
            case 'between': return 'space-between';
            default: return 'flex-end';
        }
    }};
    align-items: ${props => props.$orientation === 'vertical' ? 'stretch' : 'center'};
    flex-wrap: wrap;
    margin-top: ${props => props.theme.spacing.lg};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;

        & > button {
            width: 100%;
        }
    }
`;