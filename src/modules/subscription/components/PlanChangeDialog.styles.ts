import styled, { keyframes } from 'styled-components';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
`;

export const Dialog = styled.div`
    background: white;
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 480px;
    overflow: hidden;
`;

export const DialogHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px 0;
`;

export const DialogTitle = styled.h2`
    font-size: 17px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0;
    letter-spacing: -0.3px;
    line-height: 1.3;
`;

export const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 150ms;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }
`;

export const DialogBody = styled.div`
    padding: 20px 24px;
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

    &:last-child {
        border-bottom: none;
    }
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

export const DialogFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: #f8fafc;
`;

export const CancelBtn = styled.button`
    padding: 9px 18px;
    border-radius: 8px;
    border: 1.5px solid ${p => p.theme.colors.border};
    background: white;
    color: ${p => p.theme.colors.textSecondary};
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover {
        background: #f1f5f9;
        color: ${p => p.theme.colors.text};
    }
`;

export const ConfirmBtn = styled.button<{ $variant: 'primary' | 'warning' }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 20px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    ${p => p.$variant === 'primary' && `
        background: #0ea5e9;
        color: white;
        &:hover:not(:disabled) { background: #0284c7; }
    `}

    ${p => p.$variant === 'warning' && `
        background: #f59e0b;
        color: white;
        &:hover:not(:disabled) { background: #d97706; }
    `}

    &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
    }
`;

export const BtnSpinner = styled.div`
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;
