import styled from 'styled-components';

export const GateWrap = styled.div`
    position: relative;
    min-height: 320px;
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

export const DemoContent = styled.div`
    filter: blur(3px) brightness(0.95);
    pointer-events: none;
    user-select: none;
    min-height: 320px;
`;

export const Overlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(1px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: ${p => p.theme.radii.lg};
`;

export const OverlayCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    max-width: 320px;
    padding: 32px 24px;
`;

export const LockIcon = styled.div`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
`;

export const OverlayTitle = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    line-height: 1.3;
`;

export const OverlaySubtitle = styled.div`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    line-height: 1.55;
`;

export const PriceHint = styled.div`
    font-size: 13.5px;
    font-weight: 700;
    color: #0284c7;
`;

export const UnlockBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 9px;
    border: none;
    background: #0ea5e9;
    color: white;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms;
    width: 100%;
    justify-content: center;

    &:hover { background: #0284c7; }
`;

export const WaitlistBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 22px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    background: white;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;
    width: 100%;
    justify-content: center;

    &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }
`;

export const UpgradeHint = styled.div`
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;

    a {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
        &:hover { text-decoration: underline; }
    }
`;

export const SoonBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 4px 10px;
    border-radius: 9999px;
    background: #fef3c7;
    color: #92400e;
`;
