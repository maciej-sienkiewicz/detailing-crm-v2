import styled from 'styled-components';
import { ui } from '@/common/components/ui';

/** Płaski panel (CLAUDE.md §2): jedyną wyniesioną kartą sekcji jest „Twój plan". */
export const Panel = styled.section<{ $current: boolean }>`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    background: ${p => p.$current ? ui.brandTint : ui.surface};
    border: 1px solid ${p => p.$current ? ui.brandLineSoft : ui.line};
    border-radius: ${ui.radiusPanel};

    @media (max-width: 640px) { padding: 16px; }
`;

export const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

export const Name = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

export const PriceBlock = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 6px;
`;

export const PriceAmount = styled.span`
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

export const PriceSuffix = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

export const FeatureList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

export const FeatureItem = styled.li`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${ui.textSecondary};

    svg { width: 14px; height: 14px; flex-shrink: 0; color: ${ui.okInk}; }
`;
