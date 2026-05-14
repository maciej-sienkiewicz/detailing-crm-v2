import styled from 'styled-components';

export const Card = styled.div<{ $active: boolean; $unavailable: boolean }>`
    background: white;
    border: 1.5px solid ${p =>
        p.$active ? '#0ea5e9' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    opacity: ${p => p.$unavailable ? 0.7 : 1};
    transition: box-shadow 180ms;
    box-shadow: ${p => p.$active ? '0 0 0 3px rgba(14,165,233,0.15)' : 'none'};

    &:hover {
        box-shadow: ${p => !p.$unavailable
            ? '0 4px 12px rgba(14,165,233,0.1)'
            : 'none'};
    }
`;

export const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

export const CardTitle = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

export const CardDesc = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    line-height: 1.55;
    flex: 1;
`;

export const PriceTag = styled.div`
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: ${p => p.theme.colors.text};
    white-space: nowrap;

    span {
        font-size: 12px;
        font-weight: 500;
        color: ${p => p.theme.colors.textMuted};
        margin-left: 2px;
    }
`;

export const SoonBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 9999px;
    background: #f1f5f9;
    color: #64748b;
    white-space: nowrap;
`;

export const ActiveBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 9999px;
    background: rgba(14, 165, 233, 0.1);
    color: #0284c7;
    white-space: nowrap;
`;

export const CardFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
`;

export const ActionBtn = styled.button<{ $variant: 'activate' | 'deactivate' | 'disabled' }>`
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: ${p => p.$variant === 'disabled' ? 'not-allowed' : 'pointer'};
    transition: all 150ms;
    white-space: nowrap;

    ${p => p.$variant === 'activate' && `
        border: 1.5px solid #0ea5e9;
        background: #f0f9ff;
        color: #0284c7;
        &:hover:not(:disabled) {
            background: #0ea5e9;
            color: white;
        }
    `}

    ${p => p.$variant === 'deactivate' && `
        border: 1.5px solid #fca5a5;
        background: #fef2f2;
        color: #dc2626;
        &:hover:not(:disabled) {
            background: #fee2e2;
        }
    `}

    ${p => p.$variant === 'disabled' && `
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        color: #94a3b8;
        opacity: 0.7;
    `}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
