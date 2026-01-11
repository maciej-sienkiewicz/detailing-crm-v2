export type TransitionType = 'in_progress_to_ready' | 'ready_to_completed';

export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type InvoiceType = 'vat' | 'receipt' | 'other';

export interface QualityCheckItem {
    id: string;
    label: string;
    checked: boolean;
}

export interface NotificationChannels {
    sms: boolean;
    email: boolean;
}

export interface PaymentDetails {
    method: PaymentMethod;
    invoiceType: InvoiceType;
    amount: number;
}

export interface TransitionToReadyPayload {
    qualityApproved: boolean;
    qualityChecks: QualityCheckItem[];
    notifications?: {
        sms: boolean;
        email: boolean;
    };
}

export interface TransitionToCompletedPayload {
    signatureObtained: boolean;
    payment: PaymentDetails;
}

export interface SendNotificationPayload {
    visitId: string;
    channels: {
        sms: boolean;
        email: boolean;
    };
}

export interface SendNotificationResponse {
    sent: {
        sms: boolean;
        email: boolean;
    };
    failed: string[];
}