import { useState } from 'react';
import styled from 'styled-components';
import { useCloseHistory } from '../hooks/useBatchOrders';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, CloseHistoryRecord } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding:
        max(16px, env(safe-area-inset-top, 0px))
        max(16px, env(safe-area-inset-right, 0px))
        max(16px, env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));

    @media (max-height: 480px) {
        padding-top: max(8px, env(safe-area-inset-top, 0px));
        padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    }
`;

const Modal = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: 16px;
    width: 100%;
    max-width: 640px;
    max-height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    overflow: hidden;

    @media (max-width: 640px) {
        border-radius: 14px;
    }
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;

    @media (max-width: 640px) {
        padding: 16px 16px 12px;
    }
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    overflow-wrap: anywhere;
    min-width: 0;
`;

const CloseBtn = styled.button`
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease;

    &:hover {
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.text};
    }
`;

const ModalBody = styled.div`
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    flex: 1;
    min-height: 0;
    padding: 16px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 640px) {
        padding: 12px 16px 20px;
    }
`;

const EmptyMsg = styled.p`
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    padding: 32px 0;
    margin: 0;
`;

const Card = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: ${p => p.theme.colors.background};
`;

const CardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const DateInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ClosedAt = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const PeriodLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

const ClosedBy = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

const DownloadBtn = styled.button<{ $loading?: boolean }>`
    padding: 5px 12px;
    border-radius: 7px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.text};
    cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$loading ? 0.6 : 1};
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    min-height: 32px;

    @media (hover: none) and (pointer: coarse) {
        min-height: 40px;
        padding: 8px 14px;
    }

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.primary};
        color: #fff;
        border-color: ${p => p.theme.colors.primary};
    }
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

const Badge = styled.span<{ $ok?: boolean; $warn?: boolean; $neutral?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background: ${
        p => p.$ok ? 'rgba(34, 197, 94, 0.1)'
           : p.$warn ? 'rgba(239, 68, 68, 0.08)'
           : 'rgba(0,0,0,0.05)'
    };
    color: ${
        p => p.$ok ? '#16a34a'
           : p.$warn ? '#dc2626'
           : p.theme.colors.textMuted
    };
`;

const Amounts = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const AmountItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const AmountLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${p => p.theme.colors.textMuted};
`;

const AmountValue = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

function formatMoney(cents: number) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDate(iso: string | null) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pl-PL');
}

function HistoryCard({ record, contractorName }: { record: CloseHistoryRecord; contractorName: string }) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (downloading) return;
        setDownloading(true);
        try {
            await batchOrderApi.downloadHistorySnapshot(record.id, contractorName);
        } finally {
            setDownloading(false);
        }
    }

    const period = record.periodFrom && record.periodTo
        ? `${formatDate(record.periodFrom)} – ${formatDate(record.periodTo)}`
        : null;

    const modeLabel = record.mode === 'NEW_ONLY' ? 'Tylko nowe' : 'Wszystkie';

    return (
        <Card>
            <CardTop>
                <DateInfo>
                    <ClosedAt>{formatDateTime(record.closedAt)}</ClosedAt>
                    {period && <PeriodLabel>Okres: {period}</PeriodLabel>}
                    {record.closedByUserName && (
                        <ClosedBy>Wygenerował/a: {record.closedByUserName}</ClosedBy>
                    )}
                </DateInfo>
                <DownloadBtn $loading={downloading} onClick={handleDownload}>
                    {downloading ? 'Pobieranie...' : '↓ Pobierz raport'}
                </DownloadBtn>
            </CardTop>

            <MetaRow>
                <Badge $neutral>{record.entryCount} {record.entryCount === 1 ? 'wpis' : record.entryCount < 5 ? 'wpisy' : 'wpisów'}</Badge>
                <Badge $neutral>{modeLabel}</Badge>
                {record.financeEntryCreated
                    ? <Badge $ok>✓ Dodano do finansów</Badge>
                    : <Badge $neutral>Bez wpisu finansowego</Badge>
                }
                {record.emailRequested ? (
                    record.emailSent
                        ? <Badge $ok>✓ Mail wysłany{record.emailRecipient ? ` (${record.emailRecipient})` : ''}</Badge>
                        : <Badge $warn>✗ Mail nie wysłany</Badge>
                ) : (
                    <Badge $neutral>Bez maila</Badge>
                )}
            </MetaRow>

            <Amounts>
                <AmountItem>
                    <AmountLabel>Netto</AmountLabel>
                    <AmountValue>{formatMoney(record.totalNetCents)}</AmountValue>
                </AmountItem>
                <AmountItem>
                    <AmountLabel>Brutto</AmountLabel>
                    <AmountValue>{formatMoney(record.totalGrossCents)}</AmountValue>
                </AmountItem>
            </Amounts>
        </Card>
    );
}

interface Props {
    contractor: BatchContractor;
    onClose: () => void;
}

export function CloseHistoryModal({ contractor, onClose }: Props) {
    const { data: records, isLoading } = useCloseHistory(contractor.id);

    return (
        <Overlay onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <Modal>
                <ModalHeader>
                    <Title>Historia zamknięć — {contractor.name}</Title>
                    <CloseBtn onClick={onClose} title="Zamknij">×</CloseBtn>
                </ModalHeader>
                <ModalBody>
                    {isLoading ? (
                        <EmptyMsg>Ładowanie...</EmptyMsg>
                    ) : !records || records.length === 0 ? (
                        <EmptyMsg>Brak historii zamknięć dla tego kontrahenta.</EmptyMsg>
                    ) : (
                        records.map(r => (
                            <HistoryCard key={r.id} record={r} contractorName={contractor.name} />
                        ))
                    )}
                </ModalBody>
            </Modal>
        </Overlay>
    );
}
