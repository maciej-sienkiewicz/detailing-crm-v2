import styled from 'styled-components';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { SyncInfo } from '../types';

const Bar = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const SyncLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
`;

const Pill = styled.div<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;

    ${p => {
        switch (p.$status) {
            case 'SUCCESS':
                return `background: ${st.accentGreenDim}; border-color: rgba(16,185,129,0.25); color: ${st.accentGreen};`;
            case 'RUNNING':
                return `background: ${st.accentBlueDim}; border-color: rgba(59,130,246,0.25); color: ${st.accentBlue};`;
            case 'ERROR':
                return `background: ${st.accentRedDim}; border-color: rgba(239,68,68,0.25); color: ${st.accentRed};`;
            default:
                return `background: ${st.bgCardAlt}; border-color: ${st.border}; color: ${st.textMuted};`;
        }
    }}
`;

const TASK_LABELS: Record<string, string> = {
    INITIAL_SEED: 'Inicjalizacja',
    VOLUME_REFRESH: 'Wolumeny',
    TREND_FILL: 'Trendy',
};

function StatusIcon({ status }: { status: string }) {
    const size = 12;
    switch (status) {
        case 'SUCCESS': return <CheckCircle size={size} />;
        case 'RUNNING': return <RefreshCw size={size} />;
        case 'ERROR': return <AlertCircle size={size} />;
        default: return <Clock size={size} />;
    }
}

function formatDate(iso: string | null): string {
    if (!iso) return 'nigdy';
    try {
        return new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
}

interface Props {
    syncStatuses: SyncInfo[];
}

export function SyncStatusBar({ syncStatuses }: Props) {
    return (
        <Bar>
            <SyncLabel>Synchronizacja:</SyncLabel>
            {syncStatuses.map(s => (
                <Pill key={s.taskName} $status={s.status} title={`Ostatnia synchronizacja: ${formatDate(s.lastSuccessAt)}`}>
                    <StatusIcon status={s.status} />
                    {TASK_LABELS[s.taskName] ?? s.taskName}
                    <span style={{ opacity: 0.65 }}>· {formatDate(s.lastSuccessAt)}</span>
                </Pill>
            ))}
        </Bar>
    );
}
