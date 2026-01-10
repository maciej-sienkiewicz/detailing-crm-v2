import styled from 'styled-components';
import type { Customer } from '../types';
import { formatDate, formatPhoneNumber, getFullName, formatCurrency } from '../utils/customerMappers';
import { formatNip } from '../utils/polishValidators';
import { t } from '@/common/i18n';

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 900px;
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

const CellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PrimaryText = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const SecondaryText = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
`;

const LabelText = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
  margin-right: 4px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: var(--brand-primary);
  color: white;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: 600;
  border-radius: ${props => props.theme.radii.full};
`;

interface CustomerTableProps {
    customers: Customer[];
}

export const CustomerTable = ({ customers }: CustomerTableProps) => (
    <TableWrapper>
        <Table>
            <TableHead>
                <tr>
                    <TableHeaderCell>{t.customers.table.customer}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.contact}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.company}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.lastVisit}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.visits}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.vehicles}</TableHeaderCell>
                    <TableHeaderCell>{t.customers.table.revenue}</TableHeaderCell>
                </tr>
            </TableHead>
            <TableBody>
                {customers.map(customer => (
                    <TableRow key={customer.id}>
                        <TableCell>
                            <CellStack>
                                <PrimaryText>{getFullName(customer)}</PrimaryText>
                            </CellStack>
                        </TableCell>
                        <TableCell>
                            <CellStack>
                                <PrimaryText>{customer.contact.email}</PrimaryText>
                                <SecondaryText>
                                    {formatPhoneNumber(customer.contact.phone)}
                                </SecondaryText>
                            </CellStack>
                        </TableCell>
                        <TableCell>
                            {customer.company ? (
                                <CellStack>
                                    <PrimaryText>{customer.company.name}</PrimaryText>
                                    <SecondaryText>
                                        NIP: {formatNip(customer.company.nip)}
                                    </SecondaryText>
                                </CellStack>
                            ) : (
                                <SecondaryText>—</SecondaryText>
                            )}
                        </TableCell>
                        <TableCell>{formatDate(customer.lastVisitDate)}</TableCell>
                        <TableCell>
                            <Badge>{customer.totalVisits}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge>{customer.vehicleCount}</Badge>
                        </TableCell>
                        <TableCell>
                            <CellStack>
                                <PrimaryText>
                                    <LabelText>{t.customers.table.revenueNet}:</LabelText>
                                    {formatCurrency(customer.totalRevenue.netAmount, customer.totalRevenue.currency)}
                                </PrimaryText>
                                <SecondaryText>
                                    <LabelText>{t.customers.table.revenueGross}:</LabelText>
                                    {formatCurrency(customer.totalRevenue.grossAmount, customer.totalRevenue.currency)}
                                </SecondaryText>
                            </CellStack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableWrapper>
);