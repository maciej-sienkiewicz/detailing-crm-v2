import styled from 'styled-components';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import type { SyncInfo } from '../types';

const Bar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`;

const Pill = styled.div<{ $status: string }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: ${p => p.theme.radii.full};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: ${p => p.theme.fontWeights.medium};
    border: 1px solid;

    ${p => {
        switch (p.$status) {
            case 'SUCCESS':
                return `
                    background: ${p.theme.colors.successLight};
                    border-color: #bbf7d0;
                    color: ${p.theme.colors.success};
                `;
            case 'RUNNING':
                return `
                    background: #eff6ff;
                    border-color: #bfdbfe;
                    color: #2563eb;
                `;
            case 'ERROR':
                return `
                    background: ${p.theme.colors.errorLight};
                    border-color: #fecaca;
                    color: ${p.theme.colors.error};
                `;
            default:
                return `
                    background: ${p.theme.colors.surfaceAlt};
                    border-color: ${p.theme.colors.border};
                    color: ${p.theme.colors.textMuted};
                `;
        }
    }}
`;

const StatusText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const TaskName = styled.span`
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const LastSync = styled.span`
    opacity: 0.8;
`;

const TASK_LABELS: Record<string, string> = {
    INITIAL_SEED: 'Inicjalizacja',
    VOLUME_REFRESH: 'Wolumeny',
    TREND_FILL: 'Trendy',
};

function StatusIcon({ status }: { status: string }) {
    const size = 14;
    switch (status) {
        case 'SUCCESS': return <CheckCircle size={size} />;
        case 'RUNNING': return <RefreshCw size={size} />;
        case 'ERROR': return <AlertCircle size={size} />;
        default: return <Clock size={size} />;
    }
}

function formatDate(iso: string | null): string {
    if (!iso) return 'Nigdy';
    try {
        return new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

interface Props {
    syncStatuses: SyncInfo[];
}

export function SyncStatusBar({ syncStatuses }: Props) {
    return (
        <Bar>
            {syncStatuses.map(s => (
                <Pill key={s.taskName} $status={s.status}>
                    <StatusIcon status={s.status} />
                    <StatusText>
                        <TaskName>{TASK_LABELS[s.taskName] ?? s.taskName}</TaskName>
                        <LastSync>{formatDate(s.lastSuccessAt)}</LastSync>
                    </StatusText>
                </Pill>
            ))}
        </Bar>
    );
}
