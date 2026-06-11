// src/modules/statistics/components/BreakdownTable.tsx
import { useState, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { t } from '@/common/i18n';
import { st } from './StatisticsTheme';

export interface BreakdownRow {
    id: string;
    name: string;
    orderCount: number;
    totalRevenueGross: number;
    isActive?: boolean;
    color?: string;
    /** ID of the category this service belongs to — used for the unpin action */
    categoryId?: string;
    /** When true – shows ⚠ icon next to name */
    isUnassigned?: boolean;
    /** When true – makes this specific row draggable via HTML5 DnD */
    isDraggable?: boolean;
}

const Wrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow-x: auto;
    box-shadow: ${st.shadowSm};
`;

const Table = styled.table`
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const Th = styled.th<{ $align?: 'left' | 'right' }>`
    padding: 10px 16px;
    text-align: ${props => props.$align || 'left'};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    white-space: nowrap;
`;

const Tr = styled.tr<{
    $selected?: boolean;
    $dimmed?: boolean;
    $clickable?: boolean;
    $draggable?: boolean;
    $dragOver?: boolean;
}>`
    transition: background ${st.transition}, opacity 0.2s ease;
    cursor: ${props => (props.$clickable || props.$draggable) ? 'pointer' : 'default'};
    opacity: ${props => props.$dimmed ? 0.3 : 1};
    position: relative;

    ${props => props.$selected && css`
        background: ${st.accentBlueDim} !important;
        box-shadow: inset 3px 0 0 ${st.accentBlue};
    `}

    ${props => props.$dragOver && css`
        background: ${st.accentBlueDim} !important;
        outline: 2px dashed ${st.accentBlue};
        outline-offset: -2px;
    `}

    ${props => props.$draggable && css`
        cursor: grab;
        &:active { cursor: grabbing; }
    `}

    &:hover {
        background: ${st.bg};
    }

    &:not(:last-child) td {
        border-bottom: 1px solid ${st.border};
    }
`;

const TotalsRow = styled.tr`
    background: ${st.bg};

    td {
        border-top: 2px solid ${st.border};
    }
`;

const Td = styled.td<{ $align?: 'left' | 'right' }>`
    padding: 11px 16px;
    font-size: ${st.fontSm};
    color: ${st.text};
    text-align: ${props => props.$align || 'left'};
    font-variant-numeric: tabular-nums;
`;

const NameCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ColorDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    box-shadow: 0 0 0 2px ${props => props.$color}22;
`;

const NameText = styled.span`
    font-weight: 500;
    color: ${st.text};
`;

const InactiveBadge = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 400;
`;

const UnassignedIcon = styled.span`
    font-size: 12px;
    flex-shrink: 0;
    opacity: 0.7;
`;

const DragHandle = styled.span`
    flex-shrink: 0;
    color: ${st.textMuted};
    font-size: 14px;
    line-height: 1;
    user-select: none;
    margin-right: 2px;
`;

const BarCell = styled.td`
    padding: 11px 16px;
    width: 80px;
`;

const BarTrack = styled.div`
    width: 100%;
    height: 4px;
    background: ${st.border};
    border-radius: ${st.radiusFull};
    overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
    height: 100%;
    width: ${props => props.$pct}%;
    background-color: ${props => props.$color};
    border-radius: ${st.radiusFull};
    transition: width 0.4s ease;
`;

const ShareText = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 500;
`;

const RevenueText = styled.span`
    font-weight: 600;
    color: ${st.text};
`;

const ActionsCell = styled.td`
    padding: 8px 12px;
    white-space: nowrap;
    text-align: right;
`;

const EmptyRow = styled.tr``;

const EmptyCell = styled.td`
    padding: 40px 16px;
    text-align: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const LoadingCell = styled(EmptyCell)``;

const Spinner = styled.div`
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const DEFAULT_BAR_COLOR = st.accentBlue;

interface BreakdownTableProps {
    rows: BreakdownRow[];
    isLoading: boolean;
    showColorDot?: boolean;
    emptyText?: string;
    selectedId?: string | null;
    onRowClick?: (id: string) => void;
    droppable?: boolean;
    onDrop?: (draggedId: string, targetId: string) => void;
    rowActions?: (row: BreakdownRow) => ReactNode;
}

export const BreakdownTable = ({
    rows,
    isLoading,
    showColorDot = false,
    emptyText,
    selectedId,
    onRowClick,
    droppable = false,
    onDrop,
    rowActions,
}: BreakdownTableProps) => {
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

    const sorted = [...rows].sort((a, b) => b.totalRevenueGross - a.totalRevenueGross);
    const totalRevenue = rows.reduce((sum, r) => sum + r.totalRevenueGross, 0);
    const totalOrders = rows.reduce((sum, r) => sum + r.orderCount, 0);
    const maxRevenue = Math.max(...rows.map(r => r.totalRevenueGross), 1);

    const hasSelection = selectedId != null;
    const hasActions = !!rowActions;
    const colSpan = 5 + (hasActions ? 1 : 0);

    return (
        <Wrapper
            onDragLeave={(e) => {
                if (droppable && !e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverRowId(null);
                }
            }}
        >
            <Table>
                <Thead>
                    <tr>
                        <Th>{t.statistics.breakdown.name}</Th>
                        <Th>{t.statistics.breakdown.bar}</Th>
                        <Th $align="right">{t.statistics.breakdown.orders}</Th>
                        <Th $align="right">{t.statistics.breakdown.revenue}</Th>
                        <Th $align="right">{t.statistics.breakdown.share}</Th>
                        {hasActions && <Th />}
                    </tr>
                </Thead>
                <tbody>
                    {isLoading && (
                        <EmptyRow>
                            <LoadingCell colSpan={colSpan}>
                                <Spinner />
                            </LoadingCell>
                        </EmptyRow>
                    )}

                    {!isLoading && sorted.length === 0 && (
                        <EmptyRow>
                            <EmptyCell colSpan={colSpan}>
                                {emptyText || t.statistics.breakdown.empty}
                            </EmptyCell>
                        </EmptyRow>
                    )}

                    {!isLoading && sorted.map(row => {
                        const pct = maxRevenue > 0 ? (row.totalRevenueGross / maxRevenue) * 100 : 0;
                        const share = totalRevenue > 0
                            ? ((row.totalRevenueGross / totalRevenue) * 100).toFixed(1)
                            : '0.0';
                        const barColor = row.color || DEFAULT_BAR_COLOR;
                        const isSelected = selectedId === row.id;
                        const isDimmed = hasSelection && !isSelected;

                        return (
                            <Tr
                                key={row.id}
                                $selected={isSelected}
                                $dimmed={isDimmed}
                                $clickable={!!onRowClick}
                                $draggable={row.isDraggable}
                                $dragOver={dragOverRowId === row.id}
                                draggable={row.isDraggable ?? false}
                                onClick={() => onRowClick?.(row.id)}
                                onDragStart={row.isDraggable ? (e) => {
                                    e.dataTransfer.setData('text/plain', row.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                } : undefined}
                                onDragOver={droppable ? (e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setDragOverRowId(row.id);
                                } : undefined}
                                onDrop={droppable ? (e) => {
                                    e.preventDefault();
                                    setDragOverRowId(null);
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId && draggedId !== row.id) {
                                        onDrop?.(draggedId, row.id);
                                    }
                                } : undefined}
                            >
                                <Td>
                                    <NameCell>
                                        {row.isDraggable && <DragHandle>⠿</DragHandle>}
                                        {showColorDot && <ColorDot $color={barColor} />}
                                        {row.isUnassigned && (
                                            <UnassignedIcon title="Nieprzypisana do kategorii">⚠</UnassignedIcon>
                                        )}
                                        <NameText>{row.name}</NameText>
                                        {row.isActive === false && (
                                            <InactiveBadge>({t.statistics.categories.statusInactive})</InactiveBadge>
                                        )}
                                    </NameCell>
                                </Td>
                                <BarCell>
                                    <BarTrack>
                                        <BarFill $pct={pct} $color={barColor} />
                                    </BarTrack>
                                </BarCell>
                                <Td $align="right">{row.orderCount}</Td>
                                <Td $align="right">
                                    <RevenueText>{formatRevenue(row.totalRevenueGross)}</RevenueText>
                                </Td>
                                <Td $align="right">
                                    <ShareText>{share}%</ShareText>
                                </Td>
                                {hasActions && (
                                    <ActionsCell onClick={(e) => e.stopPropagation()}>
                                        {rowActions(row)}
                                    </ActionsCell>
                                )}
                            </Tr>
                        );
                    })}
                </tbody>
                {!isLoading && sorted.length > 1 && (
                    <tfoot>
                        <TotalsRow>
                            <Td style={{ fontWeight: 700, color: st.text }}>{t.statistics.breakdown.total}</Td>
                            <BarCell />
                            <Td $align="right" style={{ fontWeight: 700 }}>{totalOrders}</Td>
                            <Td $align="right">
                                <RevenueText>{formatRevenue(totalRevenue)}</RevenueText>
                            </Td>
                            <Td $align="right">
                                <ShareText>100%</ShareText>
                            </Td>
                            {hasActions && <Td />}
                        </TotalsRow>
                    </tfoot>
                )}
            </Table>
        </Wrapper>
    );
};
