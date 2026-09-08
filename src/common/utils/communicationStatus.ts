import type { CommunicationEntry, CommunicationStatus } from '@/common/types/communication';

export type CommunicationTone = 'sent' | 'received' | 'queued' | 'failed';

/**
 * Jedno miejsce, które wie, jak czytać status wpisu w dzienniku komunikacji.
 *
 * QUEUED to wiadomość przyjęta, ale jeszcze niewysłana — czeka na godziny, w których
 * wolno pisać do klienta (12:00–18:00). Dispatcher zmienia ten wpis w SENT albo FAILED
 * po faktycznej wysyłce, więc UI ma go pokazywać jako „w kolejce", nie jako „wysłano".
 */
export const communicationTone = (status: CommunicationStatus): CommunicationTone => {
    switch (status) {
        case 'FAILED':   return 'failed';
        case 'RECEIVED': return 'received';
        case 'QUEUED':   return 'queued';
        default:         return 'sent';
    }
};

export const COMMUNICATION_STATUS_LABEL: Record<CommunicationTone, string> = {
    sent: 'Wysłano',
    received: 'Otrzymano',
    queued: 'W kolejce',
    failed: 'Błąd',
};

const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

/**
 * „wyjdzie o 16.09.2026, 12:00" dla wpisu w kolejce; null, gdy wpis nie czeka albo
 * kolejka nie zna już terminu (wtedy pokazujemy samo „W kolejce").
 */
export const queuedHint = (entry: Pick<CommunicationEntry, 'status' | 'scheduledFor'>): string | null => {
    if (entry.status !== 'QUEUED') return null;
    if (!entry.scheduledFor) return null;
    return `wyjdzie o ${formatWhen(entry.scheduledFor)}`;
};

/** Kolory plakietki statusu — te same w kartotece klienta, historii wizyty i podglądzie. */
export const COMMUNICATION_TONE_STYLE: Record<CommunicationTone, { background: string; color: string; border: string }> = {
    sent:     { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    received: { background: 'rgba(14, 165, 233, 0.10)', color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
    queued:   { background: 'rgba(245,158,11,0.12)', color: '#b45309', border: 'rgba(245,158,11,0.30)' },
    failed:   { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
};
