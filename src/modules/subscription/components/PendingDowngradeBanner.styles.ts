import styled from 'styled-components';

export const Banner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: ${p => p.theme.radii.lg};
`;

export const BannerIcon = styled.div`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #fef3c7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d97706;
`;

export const BannerBody = styled.div`
    flex: 1;
    min-width: 0;
`;

export const BannerTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #92400e;
    margin-bottom: 2px;
`;

export const BannerText = styled.div`
    font-size: 13px;
    color: #b45309;
    line-height: 1.55;
`;

export const BannerActions = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
`;

export const CancelBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1.5px solid #fcd34d;
    background: white;
    color: #92400e;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms;

    &:hover:not(:disabled) {
        background: #fef3c7;
        border-color: #f59e0b;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
