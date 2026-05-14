import styled from 'styled-components';

export const Card = styled.div<{ $active: boolean; $highlighted: boolean }>`
    position: relative;
    background: ${p =>
        p.$highlighted
            ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
            : 'white'};
    border: 2px solid ${p =>
        p.$active
            ? (p.$highlighted ? '#0284c7' : '#0ea5e9')
            : (p.$highlighted ? 'transparent' : p.theme.colors.border)};
    border-radius: ${p => p.theme.radii.lg};
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    cursor: ${p => p.$active ? 'default' : 'pointer'};
    transition: box-shadow 180ms, border-color 180ms;
    box-shadow: ${p => p.$active ? '0 0 0 3px rgba(14,165,233,0.2)' : 'none'};

    &:hover {
        box-shadow: ${p => p.$active
            ? '0 0 0 3px rgba(14,165,233,0.2)'
            : '0 4px 16px rgba(14,165,233,0.14)'};
    }
`;

export const ActiveBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 18px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #10b981;
    color: white;
    padding: 3px 10px;
    border-radius: 0 0 8px 8px;
`;

export const PopularBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 18px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #f59e0b;
    color: white;
    padding: 3px 10px;
    border-radius: 0 0 8px 8px;
`;

export const PlanName = styled.div<{ $light: boolean }>`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.$light ? 'white' : p.theme.colors.text};
`;

export const PriceBlock = styled.div<{ $light: boolean }>`
    color: ${p => p.$light ? 'white' : p.theme.colors.text};
    display: flex;
    align-items: baseline;
    gap: 4px;
`;

export const PriceAmount = styled.span`
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -1.2px;
    line-height: 1;
`;

export const PricePeriod = styled.span<{ $light: boolean }>`
    font-size: 13px;
    opacity: 0.7;
    color: ${p => p.$light ? 'white' : p.theme.colors.textSecondary};
`;

export const FeatureList = styled.ul<{ $light: boolean }>`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

export const FeatureItem = styled.li<{ $light: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.9)' : p.theme.colors.textSecondary};

    svg { flex-shrink: 0; }
`;

export const SelectBtn = styled.button<{ $light: boolean; $active: boolean }>`
    margin-top: auto;
    padding: 10px 18px;
    border-radius: 9px;
    border: 1.5px solid ${p =>
        p.$active
            ? (p.$light ? 'rgba(255,255,255,0.5)' : '#0ea5e9')
            : (p.$light ? 'rgba(255,255,255,0.35)' : '#e2e8f0')};
    background: ${p =>
        p.$active
            ? (p.$light ? 'rgba(255,255,255,0.25)' : 'rgba(14,165,233,0.1)')
            : (p.$light ? 'rgba(255,255,255,0.15)' : '#f8fafc')};
    color: ${p => p.$light ? 'white' : (p.$active ? '#0284c7' : '#334155')};
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: ${p => p.$active ? 'default' : 'pointer'};
    transition: all 150ms;

    &:hover:not(:disabled) {
        background: ${p => p.$light ? 'rgba(255,255,255,0.28)' : '#0ea5e9'};
        color: ${p => p.$light ? 'white' : 'white'};
        border-color: ${p => p.$light ? 'rgba(255,255,255,0.6)' : '#0ea5e9'};
    }

    &:disabled {
        cursor: not-allowed;
    }
`;
