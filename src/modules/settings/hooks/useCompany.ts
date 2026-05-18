import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../api/companyApi';
import type { UpdateCompanySettingsRequest } from '../types';

const QUERY_KEY = ['settings', 'company'] as const;

export const useCompanySettings = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: companyApi.getCompanySettings,
    });

    return { company: data, isLoading, isError, refetch };
};

export const useUpdateCompanySettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateCompanySettingsRequest) =>
            companyApi.updateCompanySettings(data),
        onSuccess: updated => {
            queryClient.setQueryData(QUERY_KEY, updated);
        },
    });
};

export const useUploadCompanyLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => companyApi.uploadLogo(file),
        onSuccess: ({ logoUrl }) => {
            queryClient.setQueryData(QUERY_KEY, (prev: ReturnType<typeof useCompanySettings>['company']) =>
                prev ? { ...prev, logoUrl } : prev
            );
        },
    });
};

export const useDeleteCompanyLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: companyApi.deleteLogo,
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY, (prev: ReturnType<typeof useCompanySettings>['company']) =>
                prev ? { ...prev, logoUrl: null } : prev
            );
        },
    });
};
