export type CommunicationChannel = 'EMAIL' | 'SMS';
export type CommunicationStatus = 'SENT' | 'RECEIVED' | 'FAILED';

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
    sentAt: string;
}
