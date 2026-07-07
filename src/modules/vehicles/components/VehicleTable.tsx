import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PiiValue } from '@/common/pii';
import styled, { keyframes } from 'styled-components';
import type { VehicleListItem } from '../types';
import { formatCurrency, formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { CarLogoImage } from './CarLogoImage';

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
    min-width: 1000px;
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

const Tr = styled.tr<{ $menuOpen?: boolean }>`
    border-bottom: 1px solid #f1f5f9;
    transition: background ${st.transition};
    cursor: pointer;
    animation: ${fadeIn} 200ms ease both;
    position: relative;
    z-index: ${p => p.$menuOpen ? 10 : 0};

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

// ─── License plate chip ───────────────────────────────────────────────────────

const LicensePlate = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    background: #1E293B;
    color: #fff;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
    line-height: 1.4;
`;

const PlaceholderText = styled.span`
    font-size: 13px;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Vehicle cell ─────────────────────────────────────────────────────────────

const VehicleMainCell = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const VehicleBlock = styled.div`
    min-width: 0;
`;

const VehicleNamePrimary = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
    margin-bottom: 2px;
`;

const VehicleYear = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
`;

// ─── Owners cell ──────────────────────────────────────────────────────────────

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OwnerName = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: ${st.text};
`;

const OwnerSecondary = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
`;

const MoreOwners = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Date cell ────────────────────────────────────────────────────────────────

const DateMain = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

// ─── Visit badge ──────────────────────────────────────────────────────────────

const VisitBadge = styled.span`
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

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusKind = 'active' | 'sold' | 'archived';

const STATUS_CONFIG: Record<StatusKind, { label: string; bg: string; color: string }> = {
    active:   { label: 'Aktywny',   bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
    sold:     { label: 'Sprzedany', bg: '#f1f5f9',                color: '#475569' },
    archived: { label: 'Archiwum',  bg: '#f1f5f9',                color: '#64748b' },
};

const StatusBadge = styled.span<{ $bg: string; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 9999px;
    background: ${p => p.$bg};
    color: ${p => p.$color};
    white-space: nowrap;
`;

const StatusDot = styled.span<{ $color: string }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
`;

// ─── Actions cell ─────────────────────────────────────────────────────────────

const ActionsCell = styled.td`
    padding: 14px 20px;
    text-align: right;
    vertical-align: middle;
`;

const ActionsCellWrap = styled.div`
    display: flex;
    justify-content: flex-end;
    position: relative;
`;

const MenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1.5px solid ${st.border};
    border-radius: 7px;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
        background: #f1f5f9;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DropdownMenu = styled.div`
    position: fixed;
    min-width: 160px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 1000;
    overflow: hidden;
    animation: ${fadeIn} 120ms ease both;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: ${p => p.$danger ? '#DC2626' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: ${p => p.$danger ? 'rgba(220, 38, 38, 0.07)' : st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        opacity: 0.75;
    }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const DotsIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5"  r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface VehicleTableProps {
    vehicles: VehicleListItem[];
    onRowClick?: (vehicleId: string) => void;
    onDelete?: (vehicleId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VehicleTable = ({ vehicles, onRowClick, onDelete }: VehicleTableProps) => {
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

    const handleDelete = (e: React.MouseEvent, vehicleId: string, licensePlate: string) => {
        e.stopPropagation();
        setOpenMenuId(null);
        if (window.confirm(`Czy na pewno chcesz usunąć pojazd ${licensePlate}? Ta operacja jest nieodwracalna.`)) {
            onDelete?.(vehicleId);
        }
    };

    return (
        <TableWrapper>
            <Table>
                <TableHead>
                    <tr>
                        <Th>{t.vehicles.table.licensePlate}</Th>
                        <Th>{t.vehicles.table.vehicle}</Th>
                        <Th>{t.vehicles.table.owners}</Th>
                        <Th>{t.vehicles.table.lastVisit}</Th>
                        <Th>{t.vehicles.table.visits}</Th>
                        <Th>{t.vehicles.table.totalRevenue}</Th>
                        <Th>{t.vehicles.table.actions}</Th>
                    </tr>
                </TableHead>
                <TableBody>
                    {vehicles.map(vehicle => {
                        const hasLicensePlate = vehicle.licensePlate?.trim();

                        return (
                            <Tr key={vehicle.id} $menuOpen={openMenuId === vehicle.id} onClick={() => onRowClick?.(vehicle.id)}>
                                <Td>
                                    {hasLicensePlate ? (
                                        <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                                    ) : (
                                        <PlaceholderText>Nie wprowadzono danych</PlaceholderText>
                                    )}
                                </Td>

                                <Td>
                                    <VehicleMainCell>
                                        <CarLogoImage brand={vehicle.brand} size="md" />
                                        <VehicleBlock>
                                            <VehicleNamePrimary>
                                                {vehicle.brand} {vehicle.model}
                                            </VehicleNamePrimary>
                                            <VehicleYear>{vehicle.yearOfProduction}</VehicleYear>
                                        </VehicleBlock>
                                    </VehicleMainCell>
                                </Td>

                                <Td>
                                    <OwnersList>
                                        {vehicle.owners.length > 0 && vehicle.owners[0].customerName?.trim() ? (
                                            <>
                                                <OwnerName><PiiValue value={vehicle.owners[0].customerName} kind="name" /></OwnerName>
                                                {vehicle.owners.length > 1 && (
                                                    <OwnerSecondary><PiiValue value={vehicle.owners[1].customerName} kind="name" /></OwnerSecondary>
                                                )}
                                                {vehicle.owners.length > 2 && (
                                                    <MoreOwners>+{vehicle.owners.length - 2} więcej</MoreOwners>
                                                )}
                                            </>
                                        ) : (
                                            <PlaceholderText>Nie wprowadzono danych</PlaceholderText>
                                        )}
                                    </OwnersList>
                                </Td>

                                <Td>
                                    <DateMain>
                                        {vehicle.stats.lastVisitDate ? formatDate(vehicle.stats.lastVisitDate) : '—'}
                                    </DateMain>
                                </Td>

                                <Td>
                                    <VisitBadge>{vehicle.stats.totalVisits}</VisitBadge>
                                </Td>

                                <Td>
                                    <GrossAmt>
                                        {formatCurrency(
                                            vehicle.stats.totalSpent.grossAmount,
                                            vehicle.stats.totalSpent.currency
                                        )}
                                    </GrossAmt>
                                    <NetAmt>
                                        {formatCurrency(
                                            vehicle.stats.totalSpent.netAmount,
                                            vehicle.stats.totalSpent.currency
                                        )} netto
                                    </NetAmt>
                                </Td>

                                <ActionsCell onClick={e => e.stopPropagation()}>
                                    <ActionsCellWrap>
                                        <MenuBtn
                                            onClick={e => toggleMenu(vehicle.id, e)}
                                            title="Akcje"
                                        >
                                            <DotsIcon />
                                        </MenuBtn>

                                        {openMenuId === vehicle.id && menuPos && createPortal(
                                            <DropdownMenu style={{ top: menuPos.top, right: menuPos.right }}>
                                                <DropdownItem
                                                    $danger
                                                    onClick={e => handleDelete(e, vehicle.id, vehicle.licensePlate || '')}
                                                >
                                                    <TrashIcon />
                                                    Usuń pojazd
                                                </DropdownItem>
                                            </DropdownMenu>,
                                            document.body
                                        )}
                                    </ActionsCellWrap>
                                </ActionsCell>
                            </Tr>
                        );
                    })}
                </TableBody>
            </Table>
        </TableWrapper>
    );
};
