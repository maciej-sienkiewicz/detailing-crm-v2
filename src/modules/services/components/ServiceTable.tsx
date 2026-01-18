// src/modules/services/components/ServiceTable.tsx
import styled from 'styled-components';
import { Badge } from '@/common/components/Badge';
import { formatMoneyAmount, calculateGrossFromNet } from '../utils/priceCalculator';
import { t } from '@/common/i18n';
import type { Service } from '../types';

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    min-width: 800px;
    border-collapse: collapse;
    background: ${props => props.theme.colors.surface};
`;

const TableHead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const TableHeaderCell = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    text-align: ${props => props.$align || 'left'};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background-color ${props => props.theme.transitions.fast};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const TableCell = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    vertical-align: middle;
    text-align: ${props => props.$align || 'left'};
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const MoneyValue = styled.div`
    font-variant-numeric: tabular-nums;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const VatInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
`;

const VatRate = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const VatAmount = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    font-variant-numeric: tabular-nums;
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const GrossPrice = styled.div`
    font-variant-numeric: tabular-nums;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.md};
`;


const EditButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: transparent;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.primary};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.primary};
        color: white;
        border-color: ${props => props.theme.colors.primary};
    }
`;

interface ServiceTableProps {
    services: Service[];
    onEdit: (service: Service) => void;
}

export const ServiceTable = ({ services, onEdit }: ServiceTableProps) => {
    return (
        <TableWrapper>
            <Table>
                <TableHead>
                    <tr>
                        <TableHeaderCell $align="left">{t.services.table.name}</TableHeaderCell>
                        <TableHeaderCell $align="right">{t.services.table.priceNet}</TableHeaderCell>
                        <TableHeaderCell $align="right">{t.services.table.vat}</TableHeaderCell>
                        <TableHeaderCell $align="right">{t.services.table.priceGross}</TableHeaderCell>
                        <TableHeaderCell $align="center">{t.services.table.status}</TableHeaderCell>
                        <TableHeaderCell $align="right">{t.services.table.actions}</TableHeaderCell>
                    </tr>
                </TableHead>
                <TableBody>
                    {services.map((service) => {
                        const calc = calculateGrossFromNet(service.basePriceNet, service.vatRate);
                        const vatRateLabel = service.vatRate === -1 ? 'zw.' : `${service.vatRate}%`;

                        return (
                            <TableRow key={service.id}>
                                <TableCell $align="left">
                                    <ServiceName>{service.name}</ServiceName>
                                </TableCell>
                                <TableCell $align="right">
                                    <MoneyValue>{formatMoneyAmount(calc.priceNet)} PLN</MoneyValue>
                                </TableCell>
                                <TableCell $align="right">
                                    <VatInfo>
                                        <VatRate>{vatRateLabel}</VatRate>
                                        <VatAmount>{formatMoneyAmount(calc.vatAmount)} PLN</VatAmount>
                                    </VatInfo>
                                </TableCell>
                                <TableCell $align="right">
                                    <GrossPrice>{formatMoneyAmount(calc.priceGross)} PLN</GrossPrice>
                                </TableCell>
                                <TableCell $align="center">
                                    <Badge $variant={service.isActive ? 'success' : 'info'}>
                                        {service.isActive ? t.services.status.active : t.services.status.archived}
                                    </Badge>
                                </TableCell>
                                <TableCell $align="right">
                                    {service.isActive && (
                                        <EditButton onClick={() => onEdit(service)}>
                                            {t.common.edit}
                                        </EditButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableWrapper>
    );
};
