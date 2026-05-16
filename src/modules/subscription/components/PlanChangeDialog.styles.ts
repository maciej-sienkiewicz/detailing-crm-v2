import styled, { keyframes } from 'styled-components';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const DialogBody = styled.div`
    padding: 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const LoadingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    gap: 12px;
    color: #64748b;
    font-size: 13px;
`;

export const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
    flex-shrink: 0;
`;

export const InfoGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

export const InfoRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 16px;
    background: white;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }
`;

export const InfoLabel = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
`;

export const InfoValue = styled.div<{ $highlight?: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.$highlight ? '#0284c7' : p.theme.colors.text};
    text-align: right;
`;

export const Explanation = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    line-height: 1.6;
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: ${p => p.theme.radii.md};
    border: 1px solid ${p => p.theme.colors.border};
`;

export const DowngradeBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: ${p => p.theme.radii.md};
    font-size: 12.5px;
    color: #92400e;
    line-height: 1.5;
`;

export const BtnSpinner = styled.div`
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;
