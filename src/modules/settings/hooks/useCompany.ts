import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../api/companyApi';
import type {
    UpdateCompanySettingsRequest,
    UpdateDocumentLogoConfigRequest,
    ProtocolContentConfig,
    VisitViewConfig,
    VehicleFormConfig,
    UpdateVisitNumberingConfigRequest,
} from '../types';

const QUERY_KEY = ['settings', 'company'] as const;
const VISIT_NUMBERING_QUERY_KEY = ['settings', 'visit-numbering-config'] as const;
export const DOCUMENT_LOGO_CONFIG_QUERY_KEY = ['settings', 'document-logo-config'] as const;
export const VISIT_VIEW_CONFIG_QUERY_KEY = ['settings', 'visit-view-config'] as const;
export const VEHICLE_FORM_CONFIG_QUERY_KEY = ['settings', 'vehicle-form-config'] as const;
export const PROTOCOL_CONTENT_CONFIG_QUERY_KEY = ['settings', 'protocol-content-config'] as const;

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
        // Błąd pokazuje CompanySection we własnym dymku - bez tego były dwa.
        mutationFn: (data: UpdateCompanySettingsRequest) =>
            companyApi.updateCompanySettings(data, { skipErrorToast: true }),
        onSuccess: updated => {
            queryClient.setQueryData(QUERY_KEY, updated);
        },
    });
};

export const useUploadCompanyLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => companyApi.uploadLogo(file),
        onSuccess: ({ logoUrl, logoNeedsLightPlate, logoAspectRatio }) => {
            queryClient.setQueryData(QUERY_KEY, (prev: ReturnType<typeof useCompanySettings>['company']) =>
                prev ? { ...prev, logoUrl, logoNeedsLightPlate, logoAspectRatio } : prev
            );
            // Karta „Logo na dokumentach" pokazuje, czy logo w ogóle jest — po uploadzie
            // i usunięciu jej stan (hasLogo) się zmienia.
            queryClient.invalidateQueries({ queryKey: DOCUMENT_LOGO_CONFIG_QUERY_KEY });
        },
    });
};

export const useDeleteCompanyLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: companyApi.deleteLogo,
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY, (prev: ReturnType<typeof useCompanySettings>['company']) =>
                prev ? { ...prev, logoUrl: null, logoNeedsLightPlate: true, logoAspectRatio: null } : prev
            );
            queryClient.invalidateQueries({ queryKey: DOCUMENT_LOGO_CONFIG_QUERY_KEY });
        },
    });
};

export const useVisitNumberingConfig = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: VISIT_NUMBERING_QUERY_KEY,
        queryFn: companyApi.getVisitNumberingConfig,
    });

    return { config: data, isLoading, isError, refetch };
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

export const useDocumentLogoConfig = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: DOCUMENT_LOGO_CONFIG_QUERY_KEY,
        queryFn: companyApi.getDocumentLogoConfig,
        staleTime: 60_000,
    });

    return { config: data, isLoading, isError };
};

export const useUpdateDocumentLogoConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateDocumentLogoConfigRequest) => companyApi.updateDocumentLogoConfig(data),
        onSuccess: updated => {
            queryClient.setQueryData(DOCUMENT_LOGO_CONFIG_QUERY_KEY, updated);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: DOCUMENT_LOGO_CONFIG_QUERY_KEY });
        },
    });
};

/** Ceny usług na protokole przyjęcia - domyślnie wyłączone, jak przed tym ustawieniem. */
export const useProtocolContentConfig = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: PROTOCOL_CONTENT_CONFIG_QUERY_KEY,
        queryFn: companyApi.getProtocolContentConfig,
        staleTime: 60_000,
    });

    return { config: data, isLoading, isError };
};

export const useUpdateProtocolContentConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProtocolContentConfig) => companyApi.updateProtocolContentConfig(data),
        onSuccess: updated => {
            queryClient.setQueryData(PROTOCOL_CONTENT_CONFIG_QUERY_KEY, updated);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: PROTOCOL_CONTENT_CONFIG_QUERY_KEY });
        },
    });
};

/**
 * „Ustawienia pól" sekcji „Dane pojazdu" - czyta każdy formularz wizyty. Do odpowiedzi
 * (i przy błędzie) formularz pokazuje wszystkie pola: lepiej pole za dużo niż ukryte,
 * którego ktoś szuka.
 */
export const useVehicleFormConfig = () => {
    const { data, isLoading } = useQuery({
        queryKey: VEHICLE_FORM_CONFIG_QUERY_KEY,
        queryFn: companyApi.getVehicleFormConfig,
        staleTime: 5 * 60_000,
    });

    return { config: data, isLoading };
};

export const useUpdateVehicleFormConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: VehicleFormConfig) => companyApi.updateVehicleFormConfig(data),
        // Przełącznik reaguje od razu; serwer potwierdza albo stan wraca.
        onMutate: async next => {
            await queryClient.cancelQueries({ queryKey: VEHICLE_FORM_CONFIG_QUERY_KEY });
            const previous = queryClient.getQueryData<VehicleFormConfig>(VEHICLE_FORM_CONFIG_QUERY_KEY);
            queryClient.setQueryData(VEHICLE_FORM_CONFIG_QUERY_KEY, next);
            return { previous };
        },
        onSuccess: updated => {
            queryClient.setQueryData(VEHICLE_FORM_CONFIG_QUERY_KEY, updated);
        },
        onError: (_error, _next, context) => {
            if (context?.previous) queryClient.setQueryData(VEHICLE_FORM_CONFIG_QUERY_KEY, context.previous);
            queryClient.invalidateQueries({ queryKey: VEHICLE_FORM_CONFIG_QUERY_KEY });
        },
    });
};

/**
 * Odhaczanie wykonanych usług na widoku wizyty - czyta je każdy widok wizyty, więc
 * odpowiedź żyje dłużej: zmienia się raz na jakiś czas, w ustawieniach.
 */
export const useVisitViewConfig = (enabled = true) => {
    const { data, isLoading } = useQuery({
        queryKey: VISIT_VIEW_CONFIG_QUERY_KEY,
        queryFn: companyApi.getVisitViewConfig,
        staleTime: 5 * 60_000,
        enabled,
    });

    return { config: data, isLoading };
};

export const useUpdateVisitViewConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: VisitViewConfig) => companyApi.updateVisitViewConfig(data),
        onSuccess: updated => {
            queryClient.setQueryData(VISIT_VIEW_CONFIG_QUERY_KEY, updated);
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: VISIT_VIEW_CONFIG_QUERY_KEY });
        },
    });
};
