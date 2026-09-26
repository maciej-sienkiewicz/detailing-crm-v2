import styled from 'styled-components';
import { ui } from '@/common/components/ui';

export const Panel = styled.section<{ $unavailable: boolean }>`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 18px;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    opacity: ${p => p.$unavailable ? 0.75 : 1};

    @media (max-width: 640px) { padding: 14px 16px; }
`;

export const Head = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

export const Name = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
`;

export const Desc = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textSecondary};
    line-height: 1.55;
    flex: 1;
`;

export const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
    margin-top: auto;
`;

export const Price = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 6px;

    strong {
        font-size: 16px;
        font-weight: 700;
        color: ${ui.ink};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    span {
        font-size: 12px;
        color: ${ui.textMuted};
    }
`;
