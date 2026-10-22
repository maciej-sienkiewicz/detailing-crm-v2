import { apiClient } from '@/core';
import type {
    CompanySettings,
    DocumentLogoConfig,
    ProtocolContentConfig,
    UpdateProtocolContentConfig,
    VisitViewConfig,
    VehicleFormConfig,
    UpdateCompanySettingsRequest,
    UpdateDocumentLogoConfigRequest,
    UpdateVisitNumberingConfigRequest,
    UploadLogoResponse,
    VisitNumberingConfig,
} from '../types';

const BASE_PATH = '/v1/company';

export const companyApi = {
    getCompanySettings: async (): Promise<CompanySettings> => {
        const response = await apiClient.get<CompanySettings>(BASE_PATH);
        return response.data;
    },

    /**
     * `skipErrorToast` tylko na życzenie: CompanySection pokazuje powód odrzucenia we
     * własnym dymku z tytułem, a SellerPrompt (wydanie pojazdu) nie ma własnego
     * komunikatu i polega na globalnym.
     */
    updateCompanySettings: async (
        data: UpdateCompanySettingsRequest,
        options: { skipErrorToast?: boolean } = {},
    ): Promise<CompanySettings> => {
        const response = await apiClient.put<CompanySettings>(BASE_PATH, data, {
            skipErrorToast: options.skipErrorToast,
        });
        return response.data;
    },

    uploadLogo: async (file: File): Promise<UploadLogoResponse> => {
        const form = new FormData();
        form.append('file', file);
        // Powód odrzucenia (za mały raster, zły format) pokazuje CompanySection we
        // własnym toaście — globalny toast z interceptora byłby dubletem.
        const response = await apiClient.post<UploadLogoResponse>(`${BASE_PATH}/logo`, form, {
            skipErrorToast: true,
        });
        return response.data;
    },

    deleteLogo: async (): Promise<void> => {
        // Jak przy uploadzie: komunikat pokazuje CompanySection, nie interceptor.
        await apiClient.delete(`${BASE_PATH}/logo`, { skipErrorToast: true });
    },

    getVisitNumberingConfig: async (): Promise<VisitNumberingConfig> => {
        const response = await apiClient.get<VisitNumberingConfig>(`${BASE_PATH}/visit-numbering-config`);
        return response.data;
    },

    updateVisitNumberingConfig: async (data: UpdateVisitNumberingConfigRequest): Promise<VisitNumberingConfig> => {
        // Odmowę (np. nieznany znacznik w formacie) pokazuje VisitNumberingSection.
        const response = await apiClient.patch<VisitNumberingConfig>(`${BASE_PATH}/visit-numbering-config`, data, {
            skipErrorToast: true,
        });
        return response.data;
    },

    getDocumentLogoConfig: async (): Promise<DocumentLogoConfig> => {
        const response = await apiClient.get<DocumentLogoConfig>(`${BASE_PATH}/document-logo-config`);
        return response.data;
    },

    updateDocumentLogoConfig: async (data: UpdateDocumentLogoConfigRequest): Promise<DocumentLogoConfig> => {
        const response = await apiClient.patch<DocumentLogoConfig>(`${BASE_PATH}/document-logo-config`, data);
        return response.data;
    },

    getVehicleFormConfig: async (): Promise<VehicleFormConfig> => {
        const response = await apiClient.get<VehicleFormConfig>(`${BASE_PATH}/vehicle-form-config`, { skipErrorToast: true });
        return response.data;
    },

    updateVehicleFormConfig: async (data: VehicleFormConfig): Promise<VehicleFormConfig> => {
        const response = await apiClient.patch<VehicleFormConfig>(`${BASE_PATH}/vehicle-form-config`, data);
        return response.data;
    },

    getVisitViewConfig: async (): Promise<VisitViewConfig> => {
        const response = await apiClient.get<VisitViewConfig>(`${BASE_PATH}/visit-view-config`, { skipErrorToast: true });
        return response.data;
    },

    updateVisitViewConfig: async (data: VisitViewConfig): Promise<VisitViewConfig> => {
        const response = await apiClient.patch<VisitViewConfig>(`${BASE_PATH}/visit-view-config`, data);
        return response.data;
    },

    getProtocolContentConfig: async (): Promise<ProtocolContentConfig> => {
        const response = await apiClient.get<ProtocolContentConfig>(`${BASE_PATH}/protocol-content-config`);
        return response.data;
    },

    updateProtocolContentConfig: async (data: UpdateProtocolContentConfig): Promise<ProtocolContentConfig> => {
        const response = await apiClient.patch<ProtocolContentConfig>(`${BASE_PATH}/protocol-content-config`, data);
        return response.data;
    },
};
