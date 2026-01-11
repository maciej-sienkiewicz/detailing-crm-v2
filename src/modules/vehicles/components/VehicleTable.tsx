import { useState } from 'react';
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
`;

const TableHead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const TableHeaderCell = styled.th`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.sm};
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
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    vertical-align: middle;
`;

const LicensePlate = styled.span`
    font-weight: 700;
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
`;

const VehicleInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const VehicleName = styled.span`
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const VehicleYear = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OwnerName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const OwnerSecondary = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const MoreOwners = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
`;

const RevenueInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const RevenueValue = styled.span`
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const RevenueSubtext = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const VisitBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    border-radius: ${props => props.theme.radii.md};
`;

const ActionsCell = styled.td`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.sm};
    text-align: right;
`;

const DeleteButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.error};
        color: white;
        border-color: ${props => props.theme.colors.error};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface VehicleTableProps {
    vehicles: VehicleListItem[];
    onRowClick?: (vehicleId: string) => void;
    onDelete?: (vehicleId: string) => void;
}

export const VehicleTable = ({ vehicles, onRowClick, onDelete }: VehicleTableProps) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = (e: React.MouseEvent, vehicleId: string, licensePlate: string) => {
        e.stopPropagation();

        if (window.confirm(`Czy na pewno chcesz usunąć pojazd ${licensePlate}? Ta operacja jest nieodwracalna.`)) {
            setDeletingId(vehicleId);
            onDelete?.(vehicleId);
        }
    };

    return (
        <TableWrapper>
            <Table>
                <TableHead>
                    <tr>
                        <TableHeaderCell>{t.vehicles.table.licensePlate}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.vehicle}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.owners}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.lastVisit}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.visits}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.totalRevenue}</TableHeaderCell>
                        <TableHeaderCell>{t.vehicles.table.actions}</TableHeaderCell>
                    </tr>
                </TableHead>
                <TableBody>
                    {vehicles.map(vehicle => (
                        <TableRow
                            key={vehicle.id}
                            onClick={() => onRowClick?.(vehicle.id)}
                        >
                            <TableCell>
                                <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                            </TableCell>

                            <TableCell>
                                <VehicleInfo>
                                    <VehicleName>
                                        {vehicle.brand} {vehicle.model}
                                    </VehicleName>
                                    <VehicleYear>{vehicle.yearOfProduction}</VehicleYear>
                                </VehicleInfo>
                            </TableCell>

                            <TableCell>
                                <OwnersList>
                                    {vehicle.owners.length > 0 && (
                                        <>
                                            <OwnerName>{vehicle.owners[0].customerName}</OwnerName>
                                            {vehicle.owners.length > 1 && (
                                                <OwnerSecondary>{vehicle.owners[1].customerName}</OwnerSecondary>
                                            )}
                                            {vehicle.owners.length > 2 && (
                                                <MoreOwners>+{vehicle.owners.length - 2} więcej</MoreOwners>
                                            )}
                                        </>
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
                                <VisitBadge>{vehicle.stats.totalVisits}</VisitBadge>
                            </TableCell>

                            <TableCell>
                                <RevenueInfo>
                                    <RevenueValue>
                                        {formatCurrency(
                                            vehicle.stats.totalSpent.grossAmount,
                                            vehicle.stats.totalSpent.currency
                                        )}
                                    </RevenueValue>
                                    <RevenueSubtext>
                                        {formatCurrency(
                                            vehicle.stats.totalSpent.netAmount,
                                            vehicle.stats.totalSpent.currency
                                        )} netto
                                    </RevenueSubtext>
                                </RevenueInfo>
                            </TableCell>

                            <ActionsCell>
                                <DeleteButton
                                    onClick={(e) => handleDelete(e, vehicle.id, vehicle.licensePlate)}
                                    disabled={deletingId === vehicle.id}
                                    title="Usuń pojazd"
                                >
                                    {deletingId === vehicle.id ? '...' : 'Usuń'}
                                </DeleteButton>
                            </ActionsCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableWrapper>
    );
};