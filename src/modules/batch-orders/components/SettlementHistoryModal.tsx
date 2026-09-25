import { useState } from 'react';
import styled from 'styled-components';
import { Download } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { useSettlementHistory } from '../hooks/useBatchOrders';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, SettlementHistoryRecord } from '../types';
import { carsLabel } from '../utils/format';
import { formatDay } from '../utils/period';

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

/** Data okresu (YYYY-MM-DD) bez przejścia przez UTC. */
function formatDate(iso: string | null) {
    return iso ? formatDay(iso) : '';
}

function HistoryCard({ record, contractorName }: { record: SettlementHistoryRecord; contractorName: string }) {
    const [downloading, setDownloading] = useState(false);
    const { showError } = useToast();

    async function handleDownload() {
        if (downloading) return;
        setDownloading(true);
        try {
            await batchOrderApi.downloadHistorySnapshot(record.id, contractorName);
        } catch {
            showError('Nie udało się pobrać zestawienia', 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(false);
        }
    }

    const period = record.periodFrom && record.periodTo
        ? `${formatDate(record.periodFrom)}-${formatDate(record.periodTo)}`
        : null;

    const modeLabel = record.mode === 'NEW_ONLY' ? 'Tylko nowe auta' : 'Z autami z wcześniejszych zestawień';

    return (
        <Card>
            <CardTop>
                <DateInfo>
                    <ClosedAt>{formatDateTime(record.closedAt)}</ClosedAt>
                    {period && <PeriodLabel>Okres: {period}</PeriodLabel>}
                    {record.closedByUserName && (
                        <ClosedBy>Utworzył(a): {record.closedByUserName}</ClosedBy>
                    )}
                </DateInfo>
                <SharedButton $variant="secondary" $size="sm" type="button" onClick={handleDownload} disabled={downloading}>
                    <Download size={14} />
                    {downloading ? 'Pobieranie…' : 'Pobierz PDF'}
                </SharedButton>
            </CardTop>

            <MetaRow>
                <Badge $neutral>{carsLabel(record.entryCount)}</Badge>
                <Badge $neutral>{modeLabel}</Badge>
                {/* Bez plakietki „finanse": serwer nigdy nie tworzył wpisu finansowego,
                    więc „Bez wpisu finansowego" przy KAŻDYM rozliczeniu nic nie mówiło,
                    a sugerowało, że gdzieś da się to włączyć. */}
                {record.emailRequested ? (
                    record.emailSent
                        ? <Badge $ok>✓ Wysłane e-mailem{record.emailRecipient ? ` na ${record.emailRecipient}` : ''}</Badge>
                        : <Badge $warn>✗ E-mail nie wyszedł, pobierz PDF i wyślij ręcznie</Badge>
                ) : (
                    <Badge $neutral>Bez wysyłki e-mailem</Badge>
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

export function SettlementHistoryModal({ contractor, onClose }: Props) {
    const { data: records, isLoading } = useSettlementHistory(contractor.id);

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Historia zestawień</ModalTitle>
                    <ModalSubtitle>{contractor.name}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {isLoading ? (
                    <EmptyMsg>Ładowanie...</EmptyMsg>
                ) : !records || records.length === 0 ? (
                    <EmptyMsg>Dla tego kontrahenta nie utworzono jeszcze żadnego zestawienia.</EmptyMsg>
                ) : (
                    records.map(r => (
                        <HistoryCard key={r.id} record={r} contractorName={contractor.name} />
                    ))
                )}
            </ModalContent>
        </ModalShell>
    );
}
