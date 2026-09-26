import styled from 'styled-components';
import { Panel, touch, ui } from '@/common/components/ui';

export const Wrap = styled(Panel)`
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

export const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

// Strona ma overflow-x: clip - tabela szersza od kolumny przewija się tutaj.
export const TableScroll = styled.div`
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -4px;
    padding: 0 4px;
`;

export const Table = styled.table`
    width: 100%;
    min-width: 680px;
    border-collapse: collapse;
    font-size: 13px;

    th {
        padding: 8px 10px;
        text-align: left;
        font-size: 12.5px;
        font-weight: 600;
        color: ${ui.textMuted};
        border-bottom: 1px solid ${ui.line};
        white-space: nowrap;
    }

    td {
        padding: 10px;
        color: ${ui.textSecondary};
        border-bottom: 1px solid ${ui.lineFaint};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .amount { font-weight: 700; color: ${ui.ink}; }
    .zero { color: ${ui.textFaint}; }
    .date { color: ${ui.ink}; white-space: nowrap; }
`;

export const TransactionId = styled.code`
    font-size: 11.5px;
    background: ${ui.surfaceAlt};
    color: ${ui.textMuted};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: ${ui.mono};
`;

export const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

export const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    flex-wrap: wrap;
`;

export const PaginationInfo = styled.div`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

export const PaginationBtns = styled.nav`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
`;

/** Numer strony: bieżąca niesie odcień marki, nie wypełnienie (CLAUDE.md §2). */
export const PageBtn = styled.button<{ $active?: boolean }>`
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${p => p.$active ? ui.brandLine : 'transparent'};
    background: ${p => p.$active ? ui.brandTint : 'transparent'};
    color: ${p => p.$active ? ui.brandInk : ui.inkSoft};
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;

    &:hover { background: ${p => p.$active ? ui.brandTint : ui.surfaceAlt}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    ${touch} { min-width: 44px; height: 44px; }
`;

export const Gap = styled.span`
    padding: 0 4px;
    color: ${ui.textFaint};
`;
