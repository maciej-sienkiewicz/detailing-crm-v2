import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
`;

export const Wrap = styled.div`
    position: relative;
    border-radius: 8px;
    overflow: hidden;
`;

export const Blurred = styled.div`
    filter: blur(3px) brightness(0.93) saturate(0.7);
    pointer-events: none;
    user-select: none;
`;

export const Overlay = styled.div`
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgba(255, 251, 235, 0.93) 0%,
        rgba(255, 248, 220, 0.96) 50%,
        rgba(255, 251, 235, 0.93) 100%
    );
    backdrop-filter: blur(2px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    border-radius: 8px;
    border: 1.5px solid rgba(212, 160, 23, 0.35);
    box-shadow:
        inset 0 1px 0 rgba(255, 220, 80, 0.4),
        0 2px 12px rgba(180, 130, 10, 0.08);
`;

export const LockBadge = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(145deg, #fef3c7, #fde68a);
    border: 2px solid transparent;
    background-clip: padding-box;
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
