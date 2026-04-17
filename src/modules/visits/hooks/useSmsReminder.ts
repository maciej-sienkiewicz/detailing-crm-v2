import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsReminderApi, type SmsReminderResponse } from '../api/smsReminderApi';

export type { SmsReminderResponse };

export const smsReminderQueryKey = (visitId: string) => ['visit', visitId, 'sms-reminder'];

export const useSmsReminder = (visitId: string) => {
    const queryClient = useQueryClient();

    const { data: reminders = [], isLoading } = useQuery({
        queryKey: smsReminderQueryKey(visitId),
        queryFn: () => smsReminderApi.list(visitId),
        enabled: !!visitId,
    });

    const pendingReminder = reminders.find(r => r.status === 'PENDING') ?? null;

    const { mutateAsync: generateContent, isPending: isGenerating } = useMutation({
        mutationFn: () => smsReminderApi.generateContent(visitId),
    });

    const { mutateAsync: scheduleReminder, isPending: isScheduling } = useMutation({
        mutationFn: ({ messageContent, scheduledFor }: { messageContent: string; scheduledFor: string | null }) =>
            smsReminderApi.schedule(visitId, messageContent, scheduledFor),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smsReminderQueryKey(visitId) });
        },
    });

    const { mutateAsync: updateReminder, isPending: isUpdating } = useMutation({
        mutationFn: ({ reminderId, messageContent, scheduledFor }: { reminderId: string; messageContent: string; scheduledFor: string }) =>
            smsReminderApi.update(visitId, reminderId, messageContent, scheduledFor),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smsReminderQueryKey(visitId) });
        },
    });

    const { mutateAsync: cancelReminder, isPending: isCancelling } = useMutation({
        mutationFn: (reminderId: string) => smsReminderApi.cancel(visitId, reminderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smsReminderQueryKey(visitId) });
        },
    });

    return {
        reminders,
        pendingReminder,
        isLoading,
        generateContent,
        isGenerating,
        scheduleReminder,
        isScheduling,
        updateReminder,
        isUpdating,
        cancelReminder,
        isCancelling,
    };
};
