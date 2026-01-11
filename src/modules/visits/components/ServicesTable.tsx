import styled from 'styled-components';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { formatCurrency } from '@/common/utils';
import type { ServiceLineItem } from '../types';

const TableContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const TableHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const TableTitle = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const TableSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
`;

const Th = styled.th`
    padding: ${props => props.theme.spacing.md};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
    transition: background-color 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
    }

    &:not(:last-child) {
        border-bottom: 1px solid ${props => props.theme.colors.border};
    }
`;

const Td = styled.td`
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const ServiceName = styled.div`
    font-weight: 500;
    margin-bottom: 4px;
`;

const ServiceNote = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
`;

const PriceStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PriceValue = styled.div<{ $strikethrough?: boolean }>`
    font-weight: 500;
    ${props => props.$strikethrough && `
        text-decoration: line-through;
        opacity: 0.6;
        font-size: ${props.theme.fontSizes.xs};
    `}
`;

const PriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-left: 4px;
`;

const DiscountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: #fef3c7;
    color: #92400e;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    margin-top: 4px;
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-top: 2px solid ${props => props.theme.colors.border};
`;

const TotalLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const TotalValue = styled.span`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: var(--brand-primary);
`;

const TotalBreakdown = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
`;

const BreakdownItem = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

interface ServicesTableProps {
    services: ServiceLineItem[];
}

export const ServicesTable = ({ services }: ServicesTableProps) => {
    const { calculateServicePrice, calculateTotal } = useServicePricing();
    const totals = calculateTotal(services);

    return (
        <TableContainer>
            <TableHeader>
                <TableTitle>Wykaz usług</TableTitle>
                <TableSubtitle>{services.length} pozycji</TableSubtitle>
            </TableHeader>

            <Table>
                <Thead>
                    <Tr>
                        <Th>Usługa</Th>
                        <Th>Cena netto</Th>
                        <Th>VAT</Th>
                        <Th>Cena brutto</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {services.map(service => {
                        const pricing = calculateServicePrice(service);

                        return (
                            <Tr key={service.id}>
                                <Td>
                                    <ServiceName>{service.serviceName}</ServiceName>
                                    {service.note && <ServiceNote>{service.note}</ServiceNote>}
                                    {pricing.hasDiscount && (
                                        <DiscountBadge>{pricing.discountLabel}</DiscountBadge>
                                    )}
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {pricing.hasDiscount && (
                                            <PriceValue $strikethrough>
                                                {formatCurrency(pricing.originalPriceNet / 100)}
                                            </PriceValue>
                                        )}
                                        <PriceValue>
                                            {formatCurrency(pricing.finalPriceNet / 100)}
                                        </PriceValue>
                                    </PriceStack>
                                </Td>
                                <Td>
                                    <PriceValue>{service.vatRate}%</PriceValue>
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {pricing.hasDiscount && (
                                            <PriceValue $strikethrough>
                                                {formatCurrency(pricing.originalPriceGross / 100)}
                                            </PriceValue>
                                        )}
                                        <PriceValue>
                                            {formatCurrency(pricing.finalPriceGross / 100)}
                                        </PriceValue>
                                    </PriceStack>
                                </Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>

            <TotalRow>
                <div>
                    <TotalLabel>Razem do zapłaty</TotalLabel>
                    {totals.hasTotalDiscount && (
                        <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                            ✨ Uwzględniono rabaty
                        </div>
                    )}
                </div>
                <TotalBreakdown>
                    <BreakdownItem>
                        Netto: {formatCurrency(totals.totalFinalNet / 100)}
                    </BreakdownItem>
                    <BreakdownItem>
                        VAT: {formatCurrency(totals.totalVat / 100)}
                    </BreakdownItem>
                    <TotalValue>
                        {formatCurrency(totals.totalFinalGross / 100)}
                    </TotalValue>
                </TotalBreakdown>
            </TotalRow>
        </TableContainer>
    );
};