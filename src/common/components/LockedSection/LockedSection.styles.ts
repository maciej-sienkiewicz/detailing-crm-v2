import styled from 'styled-components';

export const Wrap = styled.div`
    position: relative;
    border-radius: 8px;
    overflow: hidden;
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
    padding: 10px 16px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
`;

export const LockBadge = styled.div`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #f1f5f9;
    border: 1.5px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    flex-shrink: 0;
`;

export const Message = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    text-align: center;
    line-height: 1.4;
`;
