// src/modules/vehicles/components/VehicleTable.tsx

import styled from 'styled-components';
import type { VehicleListItem } from '../types';
import { formatCurrency, formatDate } from '@/common/utils';
import { t } from '@/common/i18n';

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
    width: 100%;
    min-width: 1000px;
    border-collapse: collapse;
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const TableHead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
`;

const TableHeaderCell = styled.th`
    padding: ${props => props.theme.spacing.md};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background-color 0.15s ease;
    cursor: pointer;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const TableCell = styled.td`
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    vertical-align: middle;
`;

const VehicleBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%);
    color: white;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    border-radius: ${props => props.theme.radii.md};
    letter-spacing: 0.5px;
`;

const VehicleInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PrimaryText = styled.span`
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const SecondaryText = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OwnerBadge = styled.span<{ $role: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;

    ${props => {
    if (props.$role === 'PRIMARY') return 'background: #dcfce7; color: #166534;';
    if (props.$role === 'COMPANY') return 'background: #dbeafe; color: #1e40af;';
    return 'background: #f3f4f6; color: #6b7280;';
}}
`;

const StatBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 10px;
    background: var(--brand-primary);
    color: white;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    border-radius: ${props => props.theme.radii.full};
`;

interface VehicleTableProps {
    vehicles: VehicleListItem[];
    onRowClick?: (vehicleId: string) => void;
}

export const VehicleTable = ({ vehicles, onRowClick }: VehicleTableProps) => (
    <TableWrapper>
        <Table>
            <TableHead>
                <tr>
                    <TableHeaderCell>{t.vehicles.table.vehicle}</TableHeaderCell>
                    <TableHeaderCell>{t.vehicles.table.owners}</TableHeaderCell>
                    <TableHeaderCell>{t.vehicles.table.lastVisit}</TableHeaderCell>
                    <TableHeaderCell>{t.vehicles.table.visits}</TableHeaderCell>
                    <TableHeaderCell>{t.vehicles.table.totalSpent}</TableHeaderCell>
                </tr>
            </TableHead>
            <TableBody>
                {vehicles.map(vehicle => (
                    <TableRow
                        key={vehicle.id}
                        onClick={() => onRowClick?.(vehicle.id)}
                    >
                        <TableCell>
                            <VehicleInfo>
                                <VehicleBadge>{vehicle.licensePlate}</VehicleBadge>
                                <SecondaryText>
                                    {vehicle.brand} {vehicle.model} ({vehicle.yearOfProduction})
                                </SecondaryText>
                            </VehicleInfo>
                        </TableCell>
                        <TableCell>
                            <OwnersList>
                                {vehicle.owners.slice(0, 2).map(owner => (
                                    <OwnerBadge key={owner.customerId} $role={owner.role}>
                                        {owner.customerName}
                                    </OwnerBadge>
                                ))}
                                {vehicle.owners.length > 2 && (
                                    <SecondaryText>+{vehicle.owners.length - 2} więcej</SecondaryText>
                                )}
                            </OwnersList>
                        </TableCell>
                        <TableCell>
                            {vehicle.stats.lastVisitDate
                                ? formatDate(vehicle.stats.lastVisitDate)
                                : '—'
                            }
                        </TableCell>
                        <TableCell>
                            <StatBadge>{vehicle.stats.totalVisits}</StatBadge>
                        </TableCell>
                        <TableCell>
                            <VehicleInfo>
                                <PrimaryText>
                                    {formatCurrency(
                                        vehicle.stats.totalSpent.grossAmount,
                                        vehicle.stats.totalSpent.currency
                                    )}
                                </PrimaryText>
                                <SecondaryText>
                                    {formatCurrency(
                                        vehicle.stats.totalSpent.netAmount,
                                        vehicle.stats.totalSpent.currency
                                    )} netto
                                </SecondaryText>
                            </VehicleInfo>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableWrapper>
);