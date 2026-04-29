import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import type { SignCustomerConsentPayload } from '../types';

export const customerConsentsQueryKey = 'customerConsentsStatus';

export const useCustomerConsentsStatus = (customerId: string) => {
    return useQuery({
        queryKey: [customerConsentsQueryKey, customerId],
        queryFn: () => customerDetailApi.getCustomerConsentsStatus(customerId),
        enabled: !!customerId,
    });
};

export const useSignCustomerConsent = (customerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            templateId,
            payload,
        }: {
            templateId: string;
            payload?: SignCustomerConsentPayload;
        }) => customerDetailApi.signCustomerConsent(customerId, templateId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerConsentsQueryKey, customerId] });
        },
    });
};

export const useRevokeCustomerConsent = (customerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (consentId: string) =>
            customerDetailApi.revokeCustomerConsent(customerId, consentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerConsentsQueryKey, customerId] });
        },
    });
};

export const useUploadConsentAttachment = () => {
    return useMutation({
        mutationFn: ({ uploadUrl, file }: { uploadUrl: string; file: File }) =>
            customerDetailApi.uploadConsentAttachment(uploadUrl, file),
    });
};
