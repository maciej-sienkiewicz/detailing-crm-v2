// src/common/components/Toggle/Toggle.tsx
import styled from 'styled-components';

const ToggleContainer = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.md};
    }
`;

const ToggleSwitch = styled.label<{ $size?: 'sm' | 'md' | 'lg' }>`
    position: relative;
    display: inline-block;
    cursor: pointer;
    /* Size variables for consistent geometry */
    ${props => {
        const map = {
            sm: { w: 40, h: 22, pad: 2 },
            md: { w: 48, h: 26, pad: 3 },
            lg: { w: 64, h: 34, pad: 4 },
        } as const;
        const s = map[props.$size || 'md'];
        return `
            --toggle-w: ${s.w}px;
            --toggle-h: ${s.h}px;
            --toggle-pad: ${s.pad}px;
            --thumb: calc(var(--toggle-h) - var(--toggle-pad) * 2);
            width: var(--toggle-w);
            height: var(--toggle-h);
        `;
    }}
`;

const ToggleInput = styled.input`
    appearance: none;
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;

    &:checked + span {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }

    &:checked + span:before {
        transform: translateX(calc(var(--toggle-w) - var(--thumb) - var(--toggle-pad) * 2));
    }

    &:focus-visible + span {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    &:disabled + span {
        opacity: 0.6;
        cursor: not-allowed;
        filter: grayscale(0.15);
    }
`;

const ToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
    border: 1px solid #e5e7eb;
    transition: background 0.2s ease, box-shadow 0.2s ease;
    border-radius: 9999px;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.06);

    &:before {
        position: absolute;
        content: "";
        height: var(--thumb);
        width: var(--thumb);
        left: var(--toggle-pad);
        bottom: var(--toggle-pad);
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    }

    /* Hover effects for better affordance */
    &:hover {
        background: linear-gradient(180deg, #eaf2ff 0%, #e2ecff 100%);
    }
`;

const ToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    user-select: none;
    line-height: 1;

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