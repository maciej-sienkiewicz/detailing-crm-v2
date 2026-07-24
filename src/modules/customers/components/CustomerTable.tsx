import { PiiValue, joinPiiName, isPiiMasked } from '@/common/pii';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Customer, CustomerSortField, SortDirection } from '../types';
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

const ThSortable = styled(Th)<{ $active: boolean }>`
    cursor: pointer;
    user-select: none;
    color: ${p => p.$active ? st.accentBlue : st.textMuted};

    &:hover {
        color: ${st.text};
    }

    & > span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
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
    'linear-gr 9adient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#0ea5e9,#10b981)',
    'linear-gradient(135deg,#3b82f6,#10b981)',
    'linear-gradient(135deg,#8b5cf6,#0ea5e9)',
];

const pickGradient = (id: string) => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xff;
    return "#a11f1f";
};

const getInitials = (first: string | null, last: string | null) => {
    if (isPiiMasked(first) || isPiiMasked(last)) return '•';
    return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
};

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

const VisitCount = styled.div<{ $large?: boolean }>`
    font-size: ${p => p.$large ? '13px' : '11px'};
    font-weight: ${p => p.$large ? '700' : '400'};
    color: ${p => p.$large ? st.text : st.textMuted};
    font-variant-numeric: tabular-nums;
    letter-spacing: ${p => p.$large ? '-0.3px' : 'normal'};
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

// ─── Dropdown menu ────────────────────────────────────────────────────────────

const DropdownMenu = styled.div<{ $top: number; $right: number }>`
    position: fixed;
    top: ${p => p.$top}px;
    right: ${p => p.$right}px;
    z-index: 1000;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    padding: 4px;
    min-width: 160px;
    animation: ${fadeIn} 120ms ease both;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: none;
    background: transparent;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    color: ${p => p.$danger ? '#ef4444' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    svg { width: 14px; height: 14px; flex-shrink: 0; }

    &:hover {
        background: ${p => p.$danger ? '#fef2f2' : st.bg};
    }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (c: Customer) =>
    joinPiiName(c.firstName?.trim(), c.lastName?.trim()) ?? '';

const vehicleLabel = (n: number) => {
    if (n === 1) return '1 pojazd';
    if (n >= 2 && n <= 4) return `${n} pojazdy`;
    return `${n} pojazdów`;
};

// ─── Sort icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ direction }: { direction: SortDirection }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        {direction === 'asc'
            ? <path d="M5 2 L9 8 L1 8 Z" />
            : <path d="M5 8 L9 2 L1 2 Z" />
        }
    </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerTableProps {
    customers: Customer[];
    sortBy?: CustomerSortField;
    sortDirection?: SortDirection;
    onSort?: (field: CustomerSortField) => void;
    onDelete?: (customerId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CustomerTable = ({ customers, sortBy, sortDirection = 'asc', onSort, onDelete }: CustomerTableProps) => {
    const navigate = useNavigate();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

    useEffect(() => {
        if (!openMenuId) return;
        const handler = () => setOpenMenuId(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openMenuId]);

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (openMenuId === id) {
            setOpenMenuId(null);
            setMenuPos(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
            setOpenMenuId(id);
        }
    };

    return (
        <TableWrapper>
            <Table>
                <thead>
                    <tr>
                        <ThAva />
                        <Th>{t.customers.table.customer}</Th>
                        <Th>{t.customers.table.contact}</Th>
                        <Th>{t.customers.table.vehicles}</Th>
                        <ThSortable
                            $active={sortBy === 'totalVisits'}
                            onClick={() => onSort?.('totalVisits')}
                            title="Sortuj po liczbie wizyt"
                        >
                            <span>
                                Wizyty
                                {sortBy === 'totalVisits' && <SortIcon direction={sortDirection} />}
                            </span>
                        </ThSortable>
                        <ThSortable
                            $active={sortBy === 'totalRevenue'}
                            onClick={() => onSort?.('totalRevenue')}
                            title="Sortuj po przychodach"
                        >
                            <span>
                                Przychód
                                {sortBy === 'totalRevenue' && <SortIcon direction={sortDirection} />}
                            </span>
                        </ThSortable>
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
                                            ? <CellMain><PiiValue value={name} kind="name" /></CellMain>
                                            : <CellItalic>Nie wprowadzono danych</CellItalic>
                                        }
                                        {customer.company && (
                                            <CellSub>{customer.company.name}</CellSub>
                                        )}
                                    </CellStack>
                                </Td>

                                <Td>
                                    <CellStack>
                                        <CellMono>
                                            {isPiiMasked(customer.contact.phone)
                                                ? <PiiValue value={customer.contact.phone} kind="phone" />
                                                : (formatPhoneNumber(customer.contact.phone) || '—')}
                                        </CellMono>
                                        {customer.contact.email && (
                                            <CellSub><PiiValue value={customer.contact.email} kind="email" /></CellSub>
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
                                    <VisitCount $large>{customer.totalVisits}</VisitCount>
                                    <CellSub>
                                        {customer.totalVisits === 1 ? 'wizyta'
                                            : customer.totalVisits >= 2 && customer.totalVisits <= 4 ? 'wizyty'
                                            : 'wizyt'}
                                    </CellSub>
                                </Td>

                                <Td>
                                    <Revenue>
                                        {formatCurrency(
                                            customer.totalRevenue.grossAmount,
                                            customer.totalRevenue.currency
                                        )}
                                    </Revenue>
                                    <CellSub>brutto</CellSub>
                                </Td>

                                <TdActions onClick={e => e.stopPropagation()}>
                                    <IconBtn
                                        title="Więcej"
                                        aria-label="Więcej opcji"
                                        onClick={e => toggleMenu(customer.id, e)}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="5"  r="1.5" />
                                            <circle cx="12" cy="12" r="1.5" />
                                            <circle cx="12" cy="19" r="1.5" />
                                        </svg>
                                    </IconBtn>

                                    {openMenuId === customer.id && menuPos && createPortal(
                                        <DropdownMenu
                                            $top={menuPos.top}
                                            $right={menuPos.right}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <DropdownItem onClick={() => { setOpenMenuId(null); navigate(`/customers/${customer.id}`); }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg>
                                                Zobacz profil
                                            </DropdownItem>
                                            <DropdownItem
                                                $danger
                                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); onDelete?.(customer.id); }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14H6L5 6"/>
                                                    <path d="M9 6V4h6v2"/>
                                                </svg>
                                                Usuń klienta
                                            </DropdownItem>
                                        </DropdownMenu>,
                                        document.body
                                    )}
                                </TdActions>
                            </Tr>
                        );
                    })}
                </tbody>
            </Table>
        </TableWrapper>
    );
};
