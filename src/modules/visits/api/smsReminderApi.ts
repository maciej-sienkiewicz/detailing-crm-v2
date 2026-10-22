import { apiClient } from '@/core/apiClient';

export interface SmsReminderResponse {
    id: string;
    visitId: string;
    phoneNumber: string;
    messageContent: string;
    scheduledFor: string;
    status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
    sentAt: string | null;
    externalMessageId: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface GeneratedSmsContentResponse {
    content: string;
    charCount: number;
}

export const smsReminderApi = {
    generateContent: async (visitId: string, scheduledFor: string): Promise<GeneratedSmsContentResponse> => {
        const { data } = await apiClient.post<GeneratedSmsContentResponse>(
            `/v1/visits/${visitId}/sms-reminders/generate`,
            { scheduledFor }
        );
        return data;
    },

    schedule: async (
        visitId: string,
        messageContent: string,
        scheduledFor: string | null
    ): Promise<SmsReminderResponse> => {
        const { data } = await apiClient.post<SmsReminderResponse>(
            `/v1/visits/${visitId}/sms-reminders`,
            { messageContent, scheduledFor }
        );
        return data;
    },

    list: async (visitId: string): Promise<SmsReminderResponse[]> => {
        const { data } = await apiClient.get<SmsReminderResponse[]>(
            `/v1/visits/${visitId}/sms-reminders`
        );
        return data;
    },

    update: async (
        visitId: string,
        reminderId: string,
        messageContent: string,
        scheduledFor: string
    ): Promise<SmsReminderResponse> => {
        const { data } = await apiClient.put<SmsReminderResponse>(
            `/v1/visits/${visitId}/sms-reminders/${reminderId}`,
            { messageContent, scheduledFor }
        );
        return data;
    },

    cancel: async (visitId: string, reminderId: string): Promise<void> => {
        await apiClient.delete(`/v1/visits/${visitId}/sms-reminders/${reminderId}`);
    },
};
