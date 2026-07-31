import { useState } from 'react';
import styled from 'styled-components';
import { useCloseHistory } from '../hooks/useBatchOrders';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, CloseHistoryRecord } from '../types';

/* ── Shell ── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
`;

const Modal = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 82vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.07);
    overflow: hidden;
`;

/* ── Header ── */
const Header = styled.div`
    padding: 20px 24px 18px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.3px;
`;

const Subtitle = styled.p`
    margin: 3px 0 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease, transform 180ms ease;

    &:hover {
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.text};
        transform: translateY(-1px);
    }
`;

/* ── Body ── */
const Body = styled.div`
    overflow-y: auto;
    flex: 1;
`;

/* ── Empty state ── */
const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 52px 24px;
    gap: 6px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: ${p => p.theme.colors.surfaceAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
    color: ${p => p.theme.colors.textMuted};
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const EmptyDesc = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

/* ── Row ── */
const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 20px;
    align-items: start;
    padding: 16px 24px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    transition: background 120ms ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
    }
`;

const RowLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const DateLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusDot = styled.span<{ $ok?: boolean; $warn?: boolean }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${
        p => p.$ok ? '#22c55e'
           : p.$warn ? '#ef4444'
           : p.theme.colors.border
    };
`;

const DateText = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.2px;
`;

const PeriodEyebrow = styled.div`
    padding-left: 15px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${p => p.theme.colors.textMuted};
`;

const MetaLine = styled.div`
    padding-left: 15px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 0;
    margin-top: 3px;
`;

const MetaChip = styled.span<{ $ok?: boolean; $warn?: boolean }>`
    font-size: 11px;
    font-weight: 500;
    color: ${
        p => p.$ok ? '#16a34a'
           : p.$warn ? '#dc2626'
           : p.theme.colors.textMuted
    };
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &::before {
        content: '';
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        flex-shrink: 0;
        background: ${
            p => p.$ok ? '#22c55e'
               : p.$warn ? '#ef4444'
               : p.theme.colors.border
        };
    }
`;

const MetaSep = styled.span`
    padding: 0 7px;
    font-size: 11px;
    color: ${p => p.theme.colors.border};
    user-select: none;
`;

const AuthorLine = styled.div`
    padding-left: 15px;
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;
`;

/* ── Right column ── */
const RowRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    flex-shrink: 0;
    padding-top: 1px;
`;

const Amounts = styled.div`
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const GrossAmount = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.3px;
    white-space: nowrap;
`;

const NetAmount = styled.span`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const DownloadBtn = styled.button<{ $loading?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 9999px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$loading ? 0.55 : 1};
    white-space: nowrap;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 180ms ease;

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.primary};
        border-color: ${p => p.theme.colors.primary};
        color: #fff;
        transform: translateY(-1px);
    }
`;

/* ── Helpers ── */
function formatMoney(cents: number) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDate(iso: string | null) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

type RowStatus = 'ok' | 'warn' | 'neutral';

function rowStatus(r: CloseHistoryRecord): RowStatus {
    if (r.emailRequested && !r.emailSent) return 'warn';
    if (r.emailSent || r.financeEntryCreated) return 'ok';
    return 'neutral';
}

function entryCountLabel(n: number) {
    if (n === 1) return '1 wpis';
    if (n < 5) return `${n} wpisy`;
    return `${n} wpisów`;
}

/* ── HistoryRow ── */
function HistoryRow({ record, contractorName }: { record: CloseHistoryRecord; contractorName: string }) {
    const [loading, setLoading] = useState(false);

    async function handleDownload() {
        if (loading) return;
        setLoading(true);
        try {
            await batchOrderApi.downloadHistorySnapshot(record.id, contractorName);
        } finally {
            setLoading(false);
        }
    }

    const status = rowStatus(record);
    const isOk = status === 'ok';
    const isWarn = status === 'warn';

    const period =
        record.periodFrom && record.periodTo
            ? `${formatDate(record.periodFrom)}–${formatDate(record.periodTo)}`
            : null;

    const modeLabel = record.mode === 'NEW_ONLY' ? 'Tylko nowe' : 'Wszystkie wpisy';

    return (
        <Row>
            <RowLeft>
                <DateLine>
                    <StatusDot $ok={isOk} $warn={isWarn} />
                    <DateText>{formatDateTime(record.closedAt)}</DateText>
                </DateLine>

                {period && (
                    <PeriodEyebrow>Okres &middot; {period}</PeriodEyebrow>
                )}

                <MetaLine>
                    {record.financeEntryCreated
                        ? <MetaChip $ok>Finanse</MetaChip>
                        : <MetaChip>Bez finansów</MetaChip>
                    }
                    <MetaSep>·</MetaSep>
                    {record.emailRequested
                        ? record.emailSent
                            ? <MetaChip $ok>Mail wysłany</MetaChip>
                            : <MetaChip $warn>Mail nie wysłany</MetaChip>
                        : <MetaChip>Bez maila</MetaChip>
                    }
                    <MetaSep>·</MetaSep>
                    <MetaChip>{entryCountLabel(record.entryCount)}</MetaChip>
                    <MetaSep>·</MetaSep>
                    <MetaChip>{modeLabel}</MetaChip>
                </MetaLine>

                {record.closedByUserName && (
                    <AuthorLine>Wygenerował/a: {record.closedByUserName}</AuthorLine>
                )}
            </RowLeft>

            <RowRight>
                <Amounts>
                    <GrossAmount>{formatMoney(record.totalGrossCents)}</GrossAmount>
                    <NetAmount>netto {formatMoney(record.totalNetCents)}</NetAmount>
                </Amounts>
                <DownloadBtn $loading={loading} onClick={handleDownload} disabled={loading}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {loading ? 'Pobieranie…' : 'Pobierz PDF'}
                </DownloadBtn>
            </RowRight>
        </Row>
    );
}

/* ── Main export ── */
interface Props {
    contractor: BatchContractor;
    onClose: () => void;
}

export function CloseHistoryModal({ contractor, onClose }: Props) {
    const { data: records, isLoading } = useCloseHistory(contractor.id);

    return (
        <Overlay onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <Modal>
                <Header>
                    <div>
                        <Title>Historia zamknięć</Title>
                        <Subtitle>{contractor.name}</Subtitle>
                    </div>
                    <CloseBtn onClick={onClose} title="Zamknij">×</CloseBtn>
                </Header>

                <Body>
                    {isLoading ? (
                        <EmptyState>
                            <EmptyDesc>Ładowanie…</EmptyDesc>
                        </EmptyState>
                    ) : !records || records.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </EmptyIcon>
                            <EmptyTitle>Brak historii</EmptyTitle>
                            <EmptyDesc>Ten kontrahent nie ma jeszcze żadnych zamknięć.</EmptyDesc>
                        </EmptyState>
                    ) : (
                        records.map(r => (
                            <HistoryRow key={r.id} record={r} contractorName={contractor.name} />
                        ))
                    )}
                </Body>
            </Modal>
        </Overlay>
    );
}
