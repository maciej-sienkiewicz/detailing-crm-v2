// src/modules/services/components/ServiceTable.tsx
import { useState } from 'react';
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

const ServiceNameCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ServiceNameRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const PackageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    background: rgba(37, 99, 235, 0.08);
    color: #2563eb;
    border: 1px solid rgba(37, 99, 235, 0.18);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
`;

const PackageItemsToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.primary};
    font-weight: 500;
    transition: opacity 150ms ease;

    &:hover { opacity: 0.75; }

    svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
    }
`;

const PackageItemsList = styled.div`
    margin-top: 8px;
    background: rgba(37, 99, 235, 0.03);
    border: 1px solid rgba(37, 99, 235, 0.10);
    border-radius: 8px;
    overflow: hidden;
`;

const PackageItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-bottom: 1px solid rgba(37, 99, 235, 0.06);
    font-size: 12px;
    font-weight: 500;
    color: #475569;

    &:last-child { border-bottom: none; }

    &::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        flex-shrink: 0;
    }
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

const VatRateLabel = styled.div`
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

const ActionButtons = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.sm};
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

const ArchiveButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: transparent;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${props => props.theme.colors.error};
        color: white;
        border-color: ${props => props.theme.colors.error};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const ChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const ChevronUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

interface ServiceTableProps {
    services: Service[];
    onEdit: (service: Service) => void;
    onArchive: (service: Service) => void;
    isArchiving?: boolean;
}

export const ServiceTable = ({ services, onEdit, onArchive, isArchiving }: ServiceTableProps) => {
    const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());

    const togglePackage = (id: string) => {
        setExpandedPackages(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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
                        // Stored gross wins over re-derived (1-grosz rounding gaps for gross-entered prices)
                        const derived = calculateGrossFromNet(service.basePriceNet, service.vatRate);
                        const priceGross = service.basePriceGross ?? derived.priceGross;
                        const calc = { priceNet: derived.priceNet, priceGross, vatAmount: priceGross - derived.priceNet };
                        const vatRateLabel = service.vatRate === -1 ? 'zw.' : `${service.vatRate}%`;
                        const isExpanded = expandedPackages.has(service.id);
                        const items = service.packageItems;

                        return (
                            <TableRow key={service.id}>
                                <TableCell $align="left">
                                    <ServiceNameCell>
                                        <ServiceNameRow>
                                            <ServiceName>{service.name}</ServiceName>
                                            {service.isPackage && <PackageBadge>Pakiet</PackageBadge>}
                                        </ServiceNameRow>
                                        {service.isPackage && items && items.length > 0 && (
                                            <>
                                                <PackageItemsToggle
                                                    type="button"
                                                    onClick={() => togglePackage(service.id)}
                                                >
                                                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                                    {isExpanded
                                                        ? 'Ukryj skład'
                                                        : `Pokaż skład (${items.length})`}
                                                </PackageItemsToggle>
                                                {isExpanded && (
                                                    <PackageItemsList>
                                                        {items.map(item => (
                                                            <PackageItem key={item.serviceId}>
                                                                {item.serviceName}
                                                            </PackageItem>
                                                        ))}
                                                    </PackageItemsList>
                                                )}
                                            </>
                                        )}
                                    </ServiceNameCell>
                                </TableCell>
                                <TableCell $align="right">
                                    <MoneyValue>{formatMoneyAmount(calc.priceNet)} PLN</MoneyValue>
                                </TableCell>
                                <TableCell $align="right">
                                    <VatInfo>
                                        <VatRateLabel>{vatRateLabel}</VatRateLabel>
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
                                        <ActionButtons>
                                            <EditButton onClick={() => onEdit(service)}>
                                                {t.common.edit}
                                            </EditButton>
                                            <ArchiveButton
                                                onClick={() => onArchive(service)}
                                                disabled={isArchiving}
                                            >
                                                Archiwizuj
                                            </ArchiveButton>
                                        </ActionButtons>
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
