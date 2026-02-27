// src/modules/statistics/components/BreakdownTable.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';

export interface BreakdownRow {
    id: string;
    name: string;
    orderCount: number;
    totalRevenueGross: number;
    isActive?: boolean;
    color?: string;
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
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    text-align: ${props => props.$align || 'left'};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    white-space: nowrap;
`;

const Tr = styled.tr`
    transition: background ${props => props.theme.transitions.fast};

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
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    text-align: ${props => props.$align || 'left'};
    font-variant-numeric: tabular-nums;
`;

const NameCell = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const ColorDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: inline-block;
    width: 10px;
    height: 10px;
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

const BarCell = styled.td`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    width: 120px;
`;

const BarTrack = styled.div`
    width: 100%;
    height: 6px;
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
}

export const BreakdownTable = ({
    rows,
    isLoading,
    showColorDot = false,
    emptyText,
}: BreakdownTableProps) => {
    const sorted = [...rows].sort((a, b) => b.totalRevenueGross - a.totalRevenueGross);
    const totalRevenue = rows.reduce((sum, r) => sum + r.totalRevenueGross, 0);
    const totalOrders = rows.reduce((sum, r) => sum + r.orderCount, 0);
    const maxRevenue = Math.max(...rows.map(r => r.totalRevenueGross), 1);

    const colSpan = showColorDot ? 5 : 5;

    return (
        <Wrapper>
            <Table>
                <Thead>
                    <tr>
                        <Th>{t.statistics.breakdown.name}</Th>
                        <Th>{t.statistics.breakdown.bar}</Th>
                        <Th $align="right">{t.statistics.breakdown.orders}</Th>
                        <Th $align="right">{t.statistics.breakdown.revenue}</Th>
                        <Th $align="right">{t.statistics.breakdown.share}</Th>
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

                        return (
                            <Tr key={row.id}>
                                <Td>
                                    <NameCell>
                                        {showColorDot && (
                                            <ColorDot $color={barColor} />
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
                        </TotalsRow>
                    </tfoot>
                )}
            </Table>
        </Wrapper>
    );
};
