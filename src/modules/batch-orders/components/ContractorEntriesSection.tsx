import { useState } from 'react';
import styled from 'styled-components';
import { useContractorEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../hooks/useBatchOrders';
import { EntryFormModal } from './EntryFormModal';
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
    padding: 16px 20px;
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
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.background}88;
    flex-wrap: wrap;
`;

const DateInput = styled.input`
    padding: 6px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
`;

const FilterLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

const SmallBtn = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>`
    padding: 7px 14px;
    border-radius: 7px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    white-space: nowrap;

    ${p => p.variant === 'primary' && `
        background: ${p.theme.colors.primary};
        color: #fff;
        &:hover { opacity: 0.9; }
    `}
    ${p => p.variant === 'outline' && `
        background: transparent;
        border-color: ${p.theme.colors.border};
        color: ${p.theme.colors.text};
        &:hover { background: ${p.theme.colors.background}; }
    `}
    ${p => p.variant === 'danger' && `
        background: transparent;
        border-color: #fed7d7;
        color: #e53e3e;
        &:hover { background: #fff5f5; }
    `}
    ${p => (!p.variant || p.variant === 'secondary') && `
        background: transparent;
        border-color: ${p.theme.colors.border};
        color: ${p.theme.colors.textMuted};
        &:hover { background: ${p.theme.colors.background}; }
    `}
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Th = styled.th`
    padding: 10px 16px;
    text-align: left;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${p => p.theme.colors.background};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    white-space: nowrap;
`;

const Tr = styled.tr`
    &:hover { background: ${p => p.theme.colors.background}55; }
    &:not(:last-child) { border-bottom: 1px solid ${p => p.theme.colors.border}66; }
`;

const Td = styled.td`
    padding: 12px 16px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    vertical-align: top;
`;

const ServiceList = styled.ul`
    margin: 0;
    padding: 0 0 0 16px;
    list-style: disc;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};

    li { margin-bottom: 2px; }
`;

const Money = styled.span`
    font-weight: 600;
    white-space: nowrap;
`;

const MoneyMuted = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    display: block;
`;

const SummaryBar = styled.div`
    display: flex;
    gap: 24px;
    padding: 14px 20px;
    background: ${p => p.theme.colors.primary}11;
    border-top: 1px solid ${p => p.theme.colors.border};
    flex-wrap: wrap;
`;

const SummaryItem = styled.div`
    display: flex;
    flex-direction: column;
`;

const SummaryLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

const SummaryValue = styled.span`
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const EmptyRow = styled.div`
    padding: 32px 20px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
`;

const VehicleCell = styled.div`
    font-weight: 600;
    line-height: 1.4;
`;

const PlateTag = styled.span`
    display: inline-block;
    margin-top: 3px;
    padding: 2px 7px;
    background: ${p => p.theme.colors.background};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 4px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 700;
    letter-spacing: 0.05em;
    font-family: monospace;
`;

const RowActions = styled.div`
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s;

    ${Tr}:hover & { opacity: 1; }
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
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [appliedFrom, setAppliedFrom] = useState('');
    const [appliedTo, setAppliedTo] = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editEntry, setEditEntry] = useState<BatchOrderEntry | null>(null);
    const [downloading, setDownloading] = useState(false);

    const { data, isLoading, isError } = useContractorEntries(contractor.id, appliedFrom || undefined, appliedTo || undefined);
    const createEntry = useCreateEntry(contractor.id);
    const updateEntry = useUpdateEntry(contractor.id);
    const deleteEntry = useDeleteEntry(contractor.id);

    function applyFilter() {
        setAppliedFrom(from);
        setAppliedTo(to);
    }

    function clearFilter() {
        setFrom('');
        setTo('');
        setAppliedFrom('');
        setAppliedTo('');
    }

    async function handleSaveEntry(req: EntryRequest) {
        if (editEntry) {
            await updateEntry.mutateAsync({ entryId: editEntry.id, data: req });
        } else {
            await createEntry.mutateAsync(req);
        }
    }

    async function handleDeleteEntry(entryId: string) {
        if (!window.confirm('Usunąć ten wpis?')) return;
        await deleteEntry.mutateAsync(entryId);
    }

    async function handleDownloadReport() {
        setDownloading(true);
        try {
            await batchOrderApi.downloadReport(
                contractor.id,
                contractor.name,
                appliedFrom || undefined,
                appliedTo || undefined
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
                        <SmallBtn variant="outline" onClick={onEdit}>Edytuj</SmallBtn>
                        <SmallBtn variant="danger" onClick={onDelete}>Usuń</SmallBtn>
                        <SmallBtn
                            variant="outline"
                            onClick={handleDownloadReport}
                            disabled={downloading}
                        >
                            {downloading ? 'Generowanie...' : '↓ Raport PDF'}
                        </SmallBtn>
                        <SmallBtn variant="primary" onClick={() => { setEditEntry(null); setShowEntryForm(true); }}>
                            + Dodaj wpis
                        </SmallBtn>
                    </HeaderActions>
                </SectionHeader>

                <FilterRow>
                    <FilterLabel>Filtr okresu:</FilterLabel>
                    <DateInput type="date" value={from} onChange={e => setFrom(e.target.value)} />
                    <FilterLabel>–</FilterLabel>
                    <DateInput type="date" value={to} onChange={e => setTo(e.target.value)} />
                    <SmallBtn onClick={applyFilter}>Filtruj</SmallBtn>
                    {(appliedFrom || appliedTo) && (
                        <SmallBtn onClick={clearFilter}>Wyczyść</SmallBtn>
                    )}
                </FilterRow>

                {isLoading ? (
                    <EmptyRow>Ładowanie...</EmptyRow>
                ) : isError ? (
                    <EmptyRow>Błąd ładowania danych</EmptyRow>
                ) : entries.length === 0 ? (
                    <EmptyRow>
                        Brak wpisów
                        {(appliedFrom || appliedTo) ? ' dla wybranego okresu' : '. Dodaj pierwszy wpis używając przycisku powyżej.'}
                    </EmptyRow>
                ) : (
                    <>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Data</Th>
                                    <Th>Pojazd</Th>
                                    <Th>Usługi</Th>
                                    <Th>Netto</Th>
                                    <Th>Brutto</Th>
                                    <Th>Uwagi</Th>
                                    <Th></Th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <Tr key={entry.id}>
                                        <Td style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(entry.serviceDate).toLocaleDateString('pl-PL')}
                                        </Td>
                                        <Td>
                                            <VehicleCell>
                                                {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ') || '—'}
                                            </VehicleCell>
                                            {entry.vehicleLicensePlate && (
                                                <PlateTag>{entry.vehicleLicensePlate}</PlateTag>
                                            )}
                                        </Td>
                                        <Td>
                                            {entry.services.length > 0 ? (
                                                <ServiceList>
                                                    {entry.services.map((s, i) => <li key={i}>{s}</li>)}
                                                </ServiceList>
                                            ) : '—'}
                                        </Td>
                                        <Td>
                                            <Money>{formatMoney(entry.netAmountCents)}</Money>
                                            <MoneyMuted>VAT {vatLabel(entry.vatRate)}</MoneyMuted>
                                        </Td>
                                        <Td>
                                            <Money>{formatMoney(entry.grossAmountCents)}</Money>
                                        </Td>
                                        <Td style={{ maxWidth: 160, wordBreak: 'break-word' }}>
                                            {entry.notes || '—'}
                                        </Td>
                                        <Td>
                                            <RowActions>
                                                <SmallBtn
                                                    variant="outline"
                                                    onClick={() => { setEditEntry(entry); setShowEntryForm(true); }}
                                                >
                                                    Edytuj
                                                </SmallBtn>
                                                <SmallBtn
                                                    variant="danger"
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                >
                                                    Usuń
                                                </SmallBtn>
                                            </RowActions>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>

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
        </>
    );
}
