import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
`;

export const Wrap = styled.div<{ $locked: boolean }>`
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    ${p => p.$locked && 'min-height: 76px;'}
`;

export const Blurred = styled.div`
    filter: blur(3px) brightness(0.97);
    pointer-events: none;
    user-select: none;
`;

export const Overlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(248, 250, 252, 0.82);
    backdrop-filter: blur(1px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
`;

export const LockBadge = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(145deg, #fef3c7, #fde68a);
    box-shadow:
        0 0 0 2px rgba(212, 160, 23, 0.45),
        0 2px 8px rgba(180, 130, 10, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #92400e;
    flex-shrink: 0;
`;

export const Message = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: #78350f;
    text-align: center;
    line-height: 1.45;
    letter-spacing: 0.01em;
`;

export const UpgradeHint = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: linear-gradient(
        90deg,
        #b45309 0%,
        #d97706 30%,
        #f59e0b 50%,
        #d97706 70%,
        #b45309 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${shimmer} 3s linear infinite;
    cursor: default;
`;
