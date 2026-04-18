import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import { formatDate, formatPhoneNumber, formatCurrency } from '../utils/customerMappers';
import { formatNip } from '../utils/polishValidators';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
    width: 100%;
    min-width: 900px;
    border-collapse: collapse;
    background: ${st.bgCard};
`;

const TableHead = styled.thead``;

const Th = styled.th`
    padding: 12px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const TableBody = styled.tbody``;

const Tr = styled.tr`
    border-bottom: 1px solid #f1f5f9;
    transition: background ${st.transition};
    cursor: pointer;
    animation: ${fadeIn} 200ms ease both;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${st.bg};
    }
`;

const Td = styled.td`
    padding: 14px 20px;
    font-size: 13px;
    color: ${st.text};
    vertical-align: middle;
`;

// ─── Customer cell ────────────────────────────────────────────────────────────

const CustomerCell = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #0ea5e9, #6366f1)',
    'linear-gradient(135deg, #10b981, #0ea5e9)',
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #0ea5e9, #10b981)',
    'linear-gradient(135deg, #3b82f6, #10b981)',
    'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
];

const pickGradient = (id: string): string => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff;
    return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};

const getInitials = (first: string | null, last: string | null): string => {
    const f = first?.trim()[0] ?? '';
    const l = last?.trim()[0] ?? '';
    return (f + l).toUpperCase() || '?';
};

const Avatar = styled.div<{ $gradient: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$gradient};
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    user-select: none;
`;

const NameBlock = styled.div`
    min-width: 0;
`;

const NamePrimary = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
    margin-bottom: 2px;
`;

const NamePlaceholder = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Generic cell stack ───────────────────────────────────────────────────────

const CellStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const CellPrimary = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CellSecondary = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
`;

const PhoneText = styled.div`
    font-size: 12px;
    color: ${st.textSecondary};
    letter-spacing: -0.3px;
    font-variant-numeric: tabular-nums;
`;

// ─── Date cell ────────────────────────────────────────────────────────────────

const DateMain = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

// ─── Count badge ──────────────────────────────────────────────────────────────

const CountBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 24px;
    padding: 0 8px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    border-radius: 9999px;
    font-variant-numeric: tabular-nums;
`;

// ─── Revenue cell ─────────────────────────────────────────────────────────────

const GrossAmt = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const NetAmt = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    white-space: nowrap;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRawFullName = (customer: Customer): string => {
    const first = customer.firstName?.trim() || '';
    const last = customer.lastName?.trim() || '';
    return `${first} ${last}`.trim();
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerTableProps {
    customers: Customer[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CustomerTable = ({ customers }: CustomerTableProps) => {
    const navigate = useNavigate();

    return (
        <TableWrapper>
            <Table>
                <TableHead>
                    <tr>
                        <Th>{t.customers.table.customer}</Th>
                        <Th>{t.customers.table.contact}</Th>
                        <Th>{t.customers.table.company}</Th>
                        <Th>{t.customers.table.lastVisit}</Th>
                        <Th>{t.customers.table.visits}</Th>
                        <Th>{t.customers.table.vehicles}</Th>
                        <Th>{t.customers.table.revenue}</Th>
                    </tr>
                </TableHead>
                <TableBody>
                    {customers.map(customer => {
                        const fullName = getRawFullName(customer);

                        return (
                            <Tr key={customer.id} onClick={() => navigate(`/customers/${customer.id}`)}>
                                <Td>
                                    <CustomerCell>
                                        <Avatar $gradient={pickGradient(customer.id)}>
                                            {getInitials(customer.firstName, customer.lastName)}
                                        </Avatar>
                                        <NameBlock>
                                            {fullName ? (
                                                <NamePrimary>{fullName}</NamePrimary>
                                            ) : (
                                                <NamePlaceholder>Nie wprowadzono danych</NamePlaceholder>
                                            )}
                                        </NameBlock>
                                    </CustomerCell>
                                </Td>
                                <Td>
                                    <CellStack>
                                        <CellPrimary>{customer.contact.email}</CellPrimary>
                                        <PhoneText>{formatPhoneNumber(customer.contact.phone)}</PhoneText>
                                    </CellStack>
                                </Td>
                                <Td>
                                    {customer.company ? (
                                        <CellStack>
                                            <CellPrimary>{customer.company.name}</CellPrimary>
                                            <CellSecondary>NIP: {formatNip(customer.company.nip)}</CellSecondary>
                                        </CellStack>
                                    ) : (
                                        <CellSecondary>—</CellSecondary>
                                    )}
                                </Td>
                                <Td>
                                    <DateMain>{formatDate(customer.lastVisitDate)}</DateMain>
                                </Td>
                                <Td>
                                    <CountBadge>{customer.totalVisits}</CountBadge>
                                </Td>
                                <Td>
                                    <CountBadge>{customer.vehicleCount}</CountBadge>
                                </Td>
                                <Td>
                                    <GrossAmt>
                                        {formatCurrency(customer.totalRevenue.grossAmount, customer.totalRevenue.currency)}
                                    </GrossAmt>
                                    <NetAmt>
                                        netto {formatCurrency(customer.totalRevenue.netAmount, customer.totalRevenue.currency)}
                                    </NetAmt>
                                </Td>
                            </Tr>
                        );
                    })}
                </TableBody>
            </Table>
        </TableWrapper>
    );
};
