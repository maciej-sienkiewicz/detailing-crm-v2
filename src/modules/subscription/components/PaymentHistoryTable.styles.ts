import styled from 'styled-components';

export const Wrap = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

export const TableHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

export const TableTitle = styled.div`
    font-size: 13.5px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
`;

export const THead = styled.thead`
    background: #f8fafc;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

export const Th = styled.th`
    padding: 10px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    white-space: nowrap;
`;

export const TBody = styled.tbody``;

export const Tr = styled.tr`
    border-bottom: 1px solid #f1f5f9;
    transition: background 120ms;

    &:last-child { border-bottom: none; }
    &:hover { background: #f8fafc; }
`;

export const Td = styled.td`
    padding: 12px 14px;
    color: ${p => p.theme.colors.textSecondary};
    vertical-align: middle;
`;

export const EventBadge = styled.div<{ $type: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: ${p => {
        switch (p.$type) {
            case 'PLAN_UPGRADE':
            case 'SUBSCRIPTION_PURCHASE': return '#0284c7';
            case 'PLAN_DOWNGRADE': return '#d97706';
            case 'ADD_ON_ACTIVATION': return '#16a34a';
            case 'ADD_ON_DEACTIVATION': return '#dc2626';
            default: return '#64748b';
        }
    }};
`;

export const AmountCell = styled.td<{ $zero: boolean }>`
    padding: 12px 14px;
    font-size: 13px;
    font-weight: ${p => p.$zero ? 400 : 700};
    color: ${p => p.$zero ? '#94a3b8' : p.theme.colors.text};
    white-space: nowrap;
`;

export const TransactionId = styled.code`
    font-size: 11px;
    background: #f1f5f9;
    color: #64748b;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
`;

export const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 10px;
    color: #94a3b8;
`;

export const EmptyIcon = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const EmptyText = styled.div`
    font-size: 13px;
    color: #94a3b8;
`;

export const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 20px;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: #f8fafc;
`;

export const PaginationInfo = styled.div`
    font-size: 12.5px;
    color: #64748b;
`;

export const PaginationBtns = styled.div`
    display: flex;
    gap: 6px;
`;

export const PageBtn = styled.button<{ $active?: boolean }>`
    padding: 6px 12px;
    border-radius: 6px;
    border: 1.5px solid ${p => p.$active ? '#0ea5e9' : p.theme.colors.border};
    background: ${p => p.$active ? '#0ea5e9' : 'white'};
    color: ${p => p.$active ? 'white' : '#334155'};
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover:not(:disabled) {
        background: ${p => p.$active ? '#0284c7' : '#f1f5f9'};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;
