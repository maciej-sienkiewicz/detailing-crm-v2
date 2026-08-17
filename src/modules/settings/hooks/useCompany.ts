import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../api/companyApi';
import type { UpdateCompanySettingsRequest, UpdateVisitNumberingConfigRequest } from '../types';

const QUERY_KEY = ['settings', 'company'] as const;
const VISIT_NUMBERING_QUERY_KEY = ['settings', 'visit-numbering-config'] as const;

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

export const useVisitNumberingConfig = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: VISIT_NUMBERING_QUERY_KEY,
        queryFn: companyApi.getVisitNumberingConfig,
    });

    return { config: data, isLoading, isError };
};

export const useUpdateVisitNumberingConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateVisitNumberingConfigRequest) => companyApi.updateVisitNumberingConfig(data),
        onSuccess: updated => {
            queryClient.setQueryData(VISIT_NUMBERING_QUERY_KEY, updated);
        },
    });
};
