export type CommunicationChannel = 'EMAIL' | 'SMS';
/** QUEUED: przyjęta, czeka na godziny wysyłki (12:00–18:00); dispatcher zmieni ją w SENT / FAILED. */
export type CommunicationStatus = 'SENT' | 'RECEIVED' | 'FAILED' | 'QUEUED';

export interface CommunicationEntry {
    id: string;
    visitId: string | null;
    channel: CommunicationChannel;
    messageType: string;
    messageTypeLabel: string;
    recipientAddress: string;
    subject: string | null;
    bodyContent: string;
    status: CommunicationStatus;
    errorMessage: string | null;
    /** Chwila wysyłki; dla QUEUED chwila przyjęcia do kolejki. */
    sentAt: string;
    /** Tylko dla QUEUED: kiedy wiadomość wyjdzie. Brak, gdy kolejka nie zna już terminu. */
    scheduledFor?: string | null;
}
