import { apiClient } from '@/core/apiClient';

export interface CompanyAddressResponse {
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
}

export interface CompanyInfoResponse {
    nip: string;
    regon: string;
    name: string;
    shortName: string | null;
    legalForm: string | null;
    address: CompanyAddressResponse;
    phone: string | null;
    email: string | null;
    website: string | null;
    krsNumber: string | null;
    activityStartDate: string | null;
    activityEndDate: string | null;
    activitySuspendedDate: string | null;
    entityType: string;
    isActive: boolean;
}

export const gusApi = {
    getCompanyByNip: async (nip: string): Promise<CompanyInfoResponse> => {
        const response = await apiClient.get<CompanyInfoResponse>('/v1/gus/company', {
            params: { nip },
        });
        return response.data;
    },
};
