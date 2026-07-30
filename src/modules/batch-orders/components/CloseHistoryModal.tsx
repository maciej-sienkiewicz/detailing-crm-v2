import { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useCloseHistory } from '../hooks/useBatchOrders';
import { batchOrderApi } from '../api/batchOrderApi';
import type { CloseHistoryRecord } from '../types';

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); } to { opacity: 1; transform: translate(-50%, -50%); }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.45);
    animation: ${fadeIn} 180ms ease;
`;

const Modal = styled.div`
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 2001;
    transform: translate(-50%, -50%);
    width: 560px;
    max-width: calc(100vw - 32px);
    max-height: 80vh;
    background: ${p => p.theme.colors.surface};
    border-radius: 16px;
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.08),
        0 24px 64px rgba(0,0,0,0.2),
        0 4px 12px rgba(0,0,0,0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 220ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const ModalHead = styled.div`
    padding: 20px 24px 16px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;
`;

const ModalTitle = styled.h2`
    margin: 0 0 2px;
    font-size: 17px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.3px;
`;

const ModalSubtitle = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

const ScrollBody = styled.div`
    overflow-y: auto;
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Empty = styled.div`
    padding: 40px 24px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: 14px;
`;

const HistoryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    transition: background 150ms;

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
`;

const RowLeft = styled.div`
    flex: 1;
    min-width: 0;
`;

const Period = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.2px;
`;

const RowMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 3px;
    flex-wrap: wrap;
`;

const MetaChip = styled.span<{ $color?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 9999px;
    background: ${p => p.$color ?? 'rgba(148,163,184,0.12)'};
    color: ${p => p.$color ? '#fff' : p.theme.colors.textMuted};
`;

const Amount = styled.div`
    font-size: 15px;
    font-weight: 800;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.4px;
    white-space: nowrap;
`;

const AmountSub = styled.div`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    text-align: right;
    margin-top: 1px;
`;

const DownloadBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 13px;
    border-radius: 9999px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms;
    flex-shrink: 0;

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
        background: rgba(14,165,233,0.05);
        transform: translateY(-1px);
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Footer = styled.div`
    padding: 14px 24px;
    border-top: 1px solid ${p => p.theme.colors.border};
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
`;

const CloseBtn = styled.button`
    padding: 9px 22px;
    border-radius: 9999px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
`;

const LoadingRow = styled.div`
    padding: 32px 24px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: 13px;
`;

function formatMoney(cents: number) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatClosedAt(iso: string) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function HistoryItem({ record, contractorName }: { record: CloseHistoryRecord; contractorName: string }) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        setDownloading(true);
        try {
            await batchOrderApi.downloadHistorySnapshot(record.id, contractorName);
        } finally {
            setDownloading(false);
        }
    }

    const isNewOnly = record.mode === 'NEW_ONLY';

    return (
        <HistoryRow>
            <RowLeft>
                <Period>{formatDate(record.fromDate)} – {formatDate(record.toDate)}</Period>
                <RowMeta>
                    <MetaChip>{record.entryCount} {record.entryCount === 1 ? 'wpis' : record.entryCount < 5 ? 'wpisy' : 'wpisów'}</MetaChip>
                    <MetaChip $color={isNewOnly ? '#0ea5e9' : '#64748b'}>
                        {isNewOnly ? 'Tylko nowe' : 'Wszystkie'}
                    </MetaChip>
                    {record.emailSent && (
                        <MetaChip $color="#22c55e">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Email wysłany
                        </MetaChip>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted, #94a3b8)' }}>
                        {formatClosedAt(record.closedAt)}
                    </span>
                </RowMeta>
            </RowLeft>

            <div style={{ textAlign: 'right' }}>
                <Amount>{formatMoney(record.totalGrossCents)}</Amount>
                <AmountSub>netto {formatMoney(record.totalNetCents)}</AmountSub>
            </div>

            <DownloadBtn onClick={handleDownload} disabled={downloading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                PDF
            </DownloadBtn>
        </HistoryRow>
    );
}

interface Props {
    contractorId: string;
    contractorName: string;
    onClose: () => void;
}

export function CloseHistoryModal({ contractorId, contractorName, onClose }: Props) {
    const { data: history, isLoading } = useCloseHistory(contractorId);

    return createPortal(
        <>
            <Overlay onClick={onClose} />
            <Modal onClick={e => e.stopPropagation()}>
                <ModalHead>
                    <ModalTitle>Historia zamknięć</ModalTitle>
                    <ModalSubtitle>{contractorName}</ModalSubtitle>
                </ModalHead>

                <ScrollBody>
                    {isLoading ? (
                        <LoadingRow>Ładowanie historii…</LoadingRow>
                    ) : !history || history.length === 0 ? (
                        <Empty>Brak historii zamknięć dla tego kontrahenta.</Empty>
                    ) : (
                        history.map(record => (
                            <HistoryItem key={record.id} record={record} contractorName={contractorName} />
                        ))
                    )}
                </ScrollBody>

                <Footer>
                    <CloseBtn onClick={onClose}>Zamknij</CloseBtn>
                </Footer>
            </Modal>
        </>,
        document.body,
    );
}
