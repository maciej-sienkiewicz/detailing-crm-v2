import styled from 'styled-components';

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

export const LockBadge = styled.button`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f1f5f9;
    border: 1.5px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    flex-shrink: 0;
    cursor: pointer;
    padding: 0;
    position: relative;
    transition: background 180ms, border-color 180ms, color 180ms, box-shadow 180ms;

    &:hover {
        background: #e2e8f0;
        border-color: #cbd5e1;
        color: #334155;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.11);
    }
`;

export const IconClosed = styled.span`
    position: absolute;
    inset: 0;
    margin: auto;
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 200ms ease, transform 200ms ease;
    opacity: 1;
    transform: translateY(0px);

    ${LockBadge}:hover & {
        opacity: 0;
        transform: translateY(-4px);
    }
`;

export const IconOpen = styled.span`
    position: absolute;
    inset: 0;
    margin: auto;
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 200ms ease, transform 200ms ease;
    opacity: 0;
    transform: translateY(4px);

    ${LockBadge}:hover & {
        opacity: 1;
        transform: translateY(0px);
    }
`;

export const Message = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    text-align: center;
    line-height: 1.45;
`;

export const UpgradeHint = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    text-align: center;
    letter-spacing: 0.01em;
`;
