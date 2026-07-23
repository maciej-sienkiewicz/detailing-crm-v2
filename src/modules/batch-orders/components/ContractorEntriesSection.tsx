import { Fragment, useState } from 'react';
import styled from 'styled-components';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useContractorEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../hooks/useBatchOrders';
import { EntryFormModal } from './EntryFormModal';
import { DateRangeFilter } from './DateRangeFilter';
import { BatchOrderPhotoSection } from './BatchOrderPhotoSection';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, BatchOrderEntry, EntryRequest } from '../types';

const Section = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    overflow: hidden;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.background};
    gap: 12px;
    flex-wrap: wrap;
`;

const ContractorName = styled.h3`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const ContractorMeta = styled.div`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    flex-wrap: wrap;
`;

/* ── Action buttons aligned with ServiceTable ── */
const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'outline' | 'ghost' }>`
    padding: 6px 14px;
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease;

    &:hover { transform: translateY(-1px); }
    &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    ${p => p.$variant === 'primary' && `
        background: ${p.theme.colors.primary};
        border: 1px solid ${p.theme.colors.primary};
        color: #fff;
        &:hover:not(:disabled) { opacity: 0.9; }
    `}
    ${p => p.$variant === 'danger' && `
        background: transparent;
        border: 1px solid ${p.theme.colors.border};
        color: ${p.theme.colors.textMuted};
        &:hover:not(:disabled) { background: ${p.theme.colors.error}; color: #fff; border-color: ${p.theme.colors.error}; }
    `}
    ${p => (!p.$variant || p.$variant === 'outline') && `
        background: transparent;
        border: 1px solid ${p.theme.colors.border};
        color: ${p.theme.colors.text};
        &:hover:not(:disabled) { background: ${p.theme.colors.primary}; color: #fff; border-color: ${p.theme.colors.primary}; }
    `}
    ${p => p.$variant === 'ghost' && `
        background: transparent;
        border: 1px solid ${p.theme.colors.border};
        color: ${p.theme.colors.textMuted};
        &:hover:not(:disabled) { background: ${p.theme.colors.background}; color: ${p.theme.colors.text}; }
    `}
`;

/* ── Table ── */
const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
    background: ${p => p.theme.colors.surface};
`;

const TableHead = styled.thead`
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 2px solid ${p => p.theme.colors.border};
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
    padding: 10px 16px;
    text-align: ${p => p.$align ?? 'left'};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const Tr = styled.tr`
    border-bottom: 1px solid ${p => p.theme.colors.border};
    transition: background ${p => p.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
    padding: 12px 16px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    vertical-align: middle;
    text-align: ${p => p.$align ?? 'left'};
`;

/* ── Vehicle cell ── */
const VehicleCell = styled.div`
    font-weight: 600;
    line-height: 1.4;
    color: ${p => p.theme.colors.text};
`;

const PlateTag = styled.span`
    display: inline-block;
    margin-top: 4px;
    padding: 3px 9px;
    background: #0f172a;
    color: #f1f5f9;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.5;
`;

const VinTag = styled.span`
    display: inline-block;
    margin-top: 3px;
    margin-left: 6px;
    padding: 2px 7px;
    background: #f1f5f9;
    color: #475569;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.5;
`;

/* ── Services list ── */
const ServiceList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;

    li {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
    }
`;

const ServiceName = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    font-weight: 500;
`;

const ServicePrice = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

/* ── Money values ── */
const Money = styled.span`
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const GrossMoney = styled(Money)`
    font-size: ${p => p.theme.fontSizes.md};
    color: ${p => p.theme.colors.text};
`;

/* ── Row action buttons ── */
const RowActions = styled.div`
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    opacity: 0;
    transition: opacity 0.15s;

    ${Tr}:hover & { opacity: 1; }
`;

/* ── Summary footer ── */
const SummaryBar = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    background: rgba(14, 165, 233, 0.04);
    border-top: 2px solid ${p => p.theme.colors.border};
`;

const SummaryItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 24px;
    border-right: 1px solid ${p => p.theme.colors.border};

    &:last-child { border-right: none; }
`;

const SummaryLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${p => p.theme.colors.textMuted};
`;

const SummaryValue = styled.span`
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 800;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
`;

/* ── Empty / loading ── */
const EmptyRow = styled.div`
    padding: 32px 20px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
`;

function formatMoney(cents: number) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);
}

function vatLabel(rate: number) {
    if (rate === -1) return 'ZW';
    return `${rate}%`;
}

interface Props {
    contractor: BatchContractor;
    onEdit: () => void;
    onDelete: () => void;
}

export function ContractorEntriesSection({ contractor, onEdit, onDelete }: Props) {
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editEntry, setEditEntry] = useState<BatchOrderEntry | null>(null);
    const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [expandedPhotoEntryId, setExpandedPhotoEntryId] = useState<string | null>(null);

    const { data, isLoading, isError } = useContractorEntries(contractor.id, filterFrom || undefined, filterTo || undefined);
    const createEntry = useCreateEntry(contractor.id);
    const updateEntry = useUpdateEntry(contractor.id);
    const deleteEntry = useDeleteEntry(contractor.id);

    async function handleSaveEntry(req: EntryRequest) {
        if (editEntry) {
            await updateEntry.mutateAsync({ entryId: editEntry.id, data: req });
        } else {
            await createEntry.mutateAsync(req);
        }
    }

    async function handleDownloadReport() {
        setDownloading(true);
        try {
            await batchOrderApi.downloadReport(
                contractor.id,
                contractor.name,
                filterFrom || undefined,
                filterTo || undefined
            );
        } finally {
            setDownloading(false);
        }
    }

    const entries = data?.entries ?? [];
    const summary = data?.summary;

    return (
        <>
            <Section>
                <SectionHeader>
                    <div>
                        <ContractorName>{contractor.name}</ContractorName>
                        <ContractorMeta>
                            {contractor.taxId && `NIP: ${contractor.taxId}`}
                            {contractor.taxId && contractor.contactPersonName && ' · '}
                            {contractor.contactPersonName}
                            {contractor.phone && ` · ${contractor.phone}`}
                        </ContractorMeta>
                    </div>
                    <HeaderActions>
                        <ActionBtn $variant="ghost" onClick={onEdit}>Edytuj</ActionBtn>
                        <ActionBtn $variant="danger" onClick={onDelete}>Usuń</ActionBtn>
                        <ActionBtn
                            $variant="ghost"
                            onClick={handleDownloadReport}
                            disabled={downloading}
                        >
                            {downloading ? 'Generowanie...' : '↓ Raport PDF'}
                        </ActionBtn>
                        <ActionBtn $variant="primary" onClick={() => { setEditEntry(null); setShowEntryForm(true); }}>
                            + Dodaj wpis
                        </ActionBtn>
                    </HeaderActions>
                </SectionHeader>

                <FilterRow>
                    <DateRangeFilter
                        from={filterFrom}
                        to={filterTo}
                        onChange={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
                    />
                </FilterRow>

                {isLoading ? (
                    <EmptyRow>Ładowanie...</EmptyRow>
                ) : isError ? (
                    <EmptyRow>Błąd ładowania danych</EmptyRow>
                ) : entries.length === 0 ? (
                    <EmptyRow>
                        Brak wpisów{(filterFrom || filterTo) ? ' dla wybranego okresu' : '. Dodaj pierwszy wpis używając przycisku powyżej.'}
                    </EmptyRow>
                ) : (
                    <>
                        <TableWrapper>
                            <Table>
                                <TableHead>
                                    <tr>
                                        <Th>Data</Th>
                                        <Th>Pojazd</Th>
                                        <Th>Usługi</Th>
                                        <Th $align="right">Netto</Th>
                                        <Th $align="right">Brutto</Th>
                                        <Th>Uwagi</Th>
                                        <Th $align="right"></Th>
                                    </tr>
                                </TableHead>
                                <tbody>
                                    {entries.map(entry => (
                                        <Fragment key={entry.id}>
                                            <Tr>
                                                <Td style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(entry.serviceDate).toLocaleDateString('pl-PL')}
                                                </Td>
                                                <Td>
                                                    <VehicleCell>
                                                        {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ') || '—'}
                                                    </VehicleCell>
                                                    {(entry.vehicleLicensePlate || entry.vehicleVin) && (
                                                        <div>
                                                            {entry.vehicleLicensePlate && (
                                                                <PlateTag>{entry.vehicleLicensePlate}</PlateTag>
                                                            )}
                                                            {entry.vehicleVin && (
                                                                <VinTag>VIN {entry.vehicleVin}</VinTag>
                                                            )}
                                                        </div>
                                                    )}
                                                </Td>
                                                <Td>
                                                    {entry.services.length > 0 ? (
                                                        <ServiceList>
                                                            {entry.services.map((s, i) => (
                                                                <li key={i}>
                                                                    <ServiceName>{s.name}</ServiceName>
                                                                    <ServicePrice>
                                                                        {formatMoney(s.netAmountCents)} / {formatMoney(s.grossAmountCents)} {vatLabel(s.vatRate)}
                                                                    </ServicePrice>
                                                                </li>
                                                            ))}
                                                        </ServiceList>
                                                    ) : '—'}
                                                </Td>
                                                <Td $align="right">
                                                    <Money>{formatMoney(entry.netAmountCents)}</Money>
                                                </Td>
                                                <Td $align="right">
                                                    <GrossMoney>{formatMoney(entry.grossAmountCents)}</GrossMoney>
                                                </Td>
                                                <Td style={{ maxWidth: 160, wordBreak: 'break-word', color: 'inherit' }}>
                                                    {entry.notes || <span style={{ color: 'var(--color-text-muted, #94a3b8)' }}>—</span>}
                                                </Td>
                                                <Td $align="right">
                                                    <RowActions>
                                                        <ActionBtn
                                                            $variant="ghost"
                                                            title="Dokumentacja zdjęciowa"
                                                            onClick={() => setExpandedPhotoEntryId(
                                                                expandedPhotoEntryId === entry.id ? null : entry.id
                                                            )}
                                                            style={expandedPhotoEntryId === entry.id ? { background: 'rgba(14,165,233,0.1)', borderColor: 'rgba(14,165,233,0.4)' } : {}}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ verticalAlign: 'middle' }}>
                                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                                <circle cx="12" cy="13" r="4" />
                                                            </svg>
                                                        </ActionBtn>
                                                        <ActionBtn
                                                            $variant="outline"
                                                            onClick={() => { setEditEntry(entry); setShowEntryForm(true); }}
                                                        >
                                                            Edytuj
                                                        </ActionBtn>
                                                        <ActionBtn
                                                            $variant="danger"
                                                            onClick={() => setConfirmDeleteEntryId(entry.id)}
                                                        >
                                                            Usuń
                                                        </ActionBtn>
                                                    </RowActions>
                                                </Td>
                                            </Tr>
                                            {expandedPhotoEntryId === entry.id && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: 0 }}>
                                                        <BatchOrderPhotoSection entryId={entry.id} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </Table>
                        </TableWrapper>

                        {summary && (
                            <SummaryBar>
                                <SummaryItem>
                                    <SummaryLabel>Liczba wpisów</SummaryLabel>
                                    <SummaryValue>{summary.entryCount}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Suma netto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalNetCents)}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Suma brutto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalGrossCents)}</SummaryValue>
                                </SummaryItem>
                            </SummaryBar>
                        )}
                    </>
                )}
            </Section>

            {showEntryForm && (
                <EntryFormModal
                    initial={editEntry}
                    onSave={handleSaveEntry}
                    onClose={() => { setShowEntryForm(false); setEditEntry(null); }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmDeleteEntryId !== null}
                title="Usuń wpis"
                message="Czy na pewno chcesz usunąć ten wpis? Operacja jest nieodwracalna."
                variant="danger"
                confirmText="Usuń"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDeleteEntryId) deleteEntry.mutateAsync(confirmDeleteEntryId); }}
                onCancel={() => setConfirmDeleteEntryId(null)}
            />
        </>
    );
}
