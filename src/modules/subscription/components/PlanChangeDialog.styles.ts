import styled, { keyframes } from 'styled-components';
import { ui } from '@/common/components/ui';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const LoadingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    gap: 12px;
    color: ${ui.textMuted};
    font-size: 13px;
`;

export const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid ${ui.line};
    border-top-color: ${ui.brand};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
    flex-shrink: 0;
`;

/** Kwota do zapłaty: odcień marki, gdy jest płatna - bez wypełnienia. */
export const Strong = styled.strong<{ $highlight?: boolean }>`
    font-weight: 700;
    color: ${p => p.$highlight ? ui.brandInk : ui.ink};
`;

export const Explanation = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textSecondary};
    line-height: 1.6;
`;
