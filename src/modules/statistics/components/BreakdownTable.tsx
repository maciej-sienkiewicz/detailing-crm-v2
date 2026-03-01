// src/modules/statistics/components/BreakdownTable.tsx
import { useState, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { t } from '@/common/i18n';

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
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
`;

const Th = styled.th<{ $align?: 'left' | 'right' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    text-align: ${props => props.$align || 'left'};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    white-space: nowrap;
`;

const Tr = styled.tr<{
    $selected?: boolean;
    $dimmed?: boolean;
    $clickable?: boolean;
    $draggable?: boolean;
    $dragOver?: boolean;
}>`
    transition: background ${props => props.theme.transitions.fast}, opacity 0.2s ease;
    cursor: ${props => (props.$clickable || props.$draggable) ? 'pointer' : 'default'};
    opacity: ${props => props.$dimmed ? 0.35 : 1};
    position: relative;

    ${props => props.$selected && css`
        background: ${props.theme.colors.surfaceHover} !important;
        box-shadow: inset 3px 0 0 var(--brand-primary, #3B82F6);
    `}

    ${props => props.$dragOver && css`
        background: rgba(59, 130, 246, 0.08) !important;
        outline: 2px dashed var(--brand-primary, #3B82F6);
        outline-offset: -2px;
    `}

    ${props => props.$draggable && css`
        cursor: grab;
        &:active { cursor: grabbing; }
    `}

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }

    &:not(:last-child) td {
        border-bottom: 1px solid ${props => props.theme.colors.border};
    }
`;

const TotalsRow = styled.tr`
    background: ${props => props.theme.colors.surfaceAlt};

    td {
        border-top: 2px solid ${props => props.theme.colors.border};
    }
`;

const Td = styled.td<{ $align?: 'left' | 'right' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    text-align: ${props => props.$align || 'left'};
    font-variant-numeric: tabular-nums;
`;

const NameCell = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
`;

const ColorDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.$color};
`;

const NameText = styled.span`
    font-weight: 500;
`;

const InactiveBadge = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-weight: 400;
`;

const UnassignedIcon = styled.span`
    font-size: 12px;
    flex-shrink: 0;
    opacity: 0.7;
    title: 'Nieprzypisana do kategorii';
`;

const DragHandle = styled.span`
    flex-shrink: 0;
    color: ${props => props.theme.colors.textMuted};
    font-size: 14px;
    line-height: 1;
    user-select: none;
    margin-right: 2px;
`;

const BarCell = styled.td`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    width: 80px;
`;

const BarTrack = styled.div`
    width: 100%;
    height: 5px;
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.full};
    overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
    height: 100%;
    width: ${props => props.$pct}%;
    background-color: ${props => props.$color};
    border-radius: ${props => props.theme.radii.full};
    transition: width 0.4s ease;
`;

const ShareText = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const ActionsCell = styled.td`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    white-space: nowrap;
    text-align: right;
`;

const EmptyRow = styled.tr``;

const EmptyCell = styled.td`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const LoadingCell = styled(EmptyCell)``;

const Spinner = styled.div`
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 2px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const DEFAULT_BAR_COLOR = 'var(--brand-primary, #3B82F6)';

interface BreakdownTableProps {
    rows: BreakdownRow[];
    isLoading: boolean;
    showColorDot?: boolean;
    emptyText?: string;
    /** ID of the currently selected row – highlights it and dims others */
    selectedId?: string | null;
    /** Called when a row is clicked */
    onRowClick?: (id: string) => void;
    /** Makes this table's rows accept drops */
    droppable?: boolean;
    /** Called when a draggable row is dropped onto a row in this table */
    onDrop?: (draggedId: string, targetId: string) => void;
    /** Optional per-row action buttons rendered as an extra column */
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
                                <Td $align="right">{formatRevenue(row.totalRevenueGross)}</Td>
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
                            <Td style={{ fontWeight: 600 }}>{t.statistics.breakdown.total}</Td>
                            <BarCell />
                            <Td $align="right" style={{ fontWeight: 600 }}>{totalOrders}</Td>
                            <Td $align="right" style={{ fontWeight: 600 }}>{formatRevenue(totalRevenue)}</Td>
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
