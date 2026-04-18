import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import { formatPhoneNumber, formatCurrency } from '../utils/customerMappers';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Table shell ──────────────────────────────────────────────────────────────

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
    background: ${st.bgCard};
`;

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

const ThAva = styled(Th)`
    width: 44px;
    padding-right: 0;
`;

const ThActions = styled(Th)`
    width: 40px;
    padding-left: 0;
`;

const Tr = styled.tr`
    border-bottom: 1px solid #f1f5f9;
    transition: background ${st.transition};
    cursor: pointer;
    animation: ${fadeIn} 200ms ease both;

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bg}; }
`;

const Td = styled.td`
    padding: 14px 20px;
    font-size: 13px;
    color: ${st.text};
    vertical-align: middle;
`;

const TdAva = styled(Td)`
    padding-right: 0;
    width: 44px;
`;

const TdActions = styled(Td)`
    padding-left: 0;
    width: 40px;
`;

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADIENTS = [
    'linear-gradient(135deg,#0ea5e9,#6366f1)',
    'linear-gradient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#0ea5e9,#10b981)',
    'linear-gradient(135deg,#3b82f6,#10b981)',
    'linear-gradient(135deg,#8b5cf6,#0ea5e9)',
];

const pickGradient = (id: string) => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff;
    return GRADIENTS[h % GRADIENTS.length];
};

const getInitials = (first: string | null, last: string | null) =>
    ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';

const Avatar = styled.div<{ $bg: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$bg};
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
`;

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const CellStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const CellMain = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CellSub = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CellMono = styled.div`
    font-size: 12px;
    color: ${st.textSecondary};
    letter-spacing: -0.3px;
    font-variant-numeric: tabular-nums;
`;

const CellItalic = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Wizyty · Przychód ────────────────────────────────────────────────────────

const Revenue = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const VisitCount = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

// ─── Actions icon button ──────────────────────────────────────────────────────

const IconBtn = styled.button`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all ${st.transition};

    svg { width: 14px; height: 14px; }

    tr:hover & {
        background: #f1f5f9;
        color: #475569;
    }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (c: Customer) =>
    `${c.firstName?.trim() ?? ''} ${c.lastName?.trim() ?? ''}`.trim();

const vehicleLabel = (n: number) => {
    if (n === 1) return '1 pojazd';
    if (n >= 2 && n <= 4) return `${n} pojazdy`;
    return `${n} pojazdów`;
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
                <thead>
                    <tr>
                        <ThAva />
                        <Th>{t.customers.table.customer}</Th>
                        <Th>{t.customers.table.contact}</Th>
                        <Th>{t.customers.table.vehicles}</Th>
                        <Th>Wizyty · Przychód</Th>
                        <ThActions />
                    </tr>
                </thead>
                <tbody>
                    {customers.map(customer => {
                        const name = fullName(customer);
                        return (
                            <Tr key={customer.id} onClick={() => navigate(`/customers/${customer.id}`)}>
                                <TdAva>
                                    <Avatar $bg={pickGradient(customer.id)}>
                                        {getInitials(customer.firstName, customer.lastName)}
                                    </Avatar>
                                </TdAva>

                                <Td>
                                    <CellStack>
                                        {name
                                            ? <CellMain>{name}</CellMain>
                                            : <CellItalic>Nie wprowadzono danych</CellItalic>
                                        }
                                        {customer.contact.email && (
                                            <CellSub>{customer.contact.email}</CellSub>
                                        )}
                                    </CellStack>
                                </Td>

                                <Td>
                                    <CellStack>
                                        <CellMono>
                                            {formatPhoneNumber(customer.contact.phone) || '—'}
                                        </CellMono>
                                        {customer.company && (
                                            <CellSub>{customer.company.name}</CellSub>
                                        )}
                                    </CellStack>
                                </Td>

                                <Td>
                                    <CellMain>{vehicleLabel(customer.vehicleCount)}</CellMain>
                                    {customer.lastVisitDate && (
                                        <CellSub>ost. wizyta {customer.lastVisitDate.slice(0, 10)}</CellSub>
                                    )}
                                </Td>

                                <Td>
                                    <Revenue>
                                        {formatCurrency(
                                            customer.totalRevenue.grossAmount,
                                            customer.totalRevenue.currency
                                        )}
                                    </Revenue>
                                    <VisitCount>{customer.totalVisits} wizyt</VisitCount>
                                </Td>

                                <TdActions onClick={e => e.stopPropagation()}>
                                    <IconBtn
                                        title="Więcej"
                                        aria-label="Więcej opcji"
                                        onClick={() => navigate(`/customers/${customer.id}`)}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="5"  r="1.5" />
                                            <circle cx="12" cy="12" r="1.5" />
                                            <circle cx="12" cy="19" r="1.5" />
                                        </svg>
                                    </IconBtn>
                                </TdActions>
                            </Tr>
                        );
                    })}
                </tbody>
            </Table>
        </TableWrapper>
    );
};
