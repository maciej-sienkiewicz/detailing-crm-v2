import { apiClient } from '@/core';
import type {
    CompanySettings,
    UpdateCompanySettingsRequest,
    UploadLogoResponse,
} from '../types';

const BASE_PATH = '/v1/company';

const MOCK_DATA: CompanySettings = {
    id: '1',
    name: 'Detail Pro Studio Sp. z o.o.',
    taxId: '525-123-45-67',
    regon: '142836501',
    street: 'ul. Puławska 145',
    postalCode: '02-715',
    city: 'Warszawa',
    phone: '+48 22 555 12 34',
    email: 'kontakt@detailpro.pl',
    website: 'https://detailpro.pl',
    bankAccount: '12 1020 1042 0000 0102 0123 4567',
    logoUrl: null,
    emailAlias: 'detailpro',
    updatedAt: new Date().toISOString(),
};

let mockStore: CompanySettings = { ...MOCK_DATA };

const USE_MOCKS = false;

export const companyApi = {
    getCompanySettings: async (): Promise<CompanySettings> => {
        if (USE_MOCKS) {
            return new Promise(resolve => setTimeout(() => resolve({ ...mockStore }), 300));
        }
        const response = await apiClient.get<CompanySettings>(BASE_PATH);
        return response.data;
    },

    updateCompanySettings: async (data: UpdateCompanySettingsRequest): Promise<CompanySettings> => {
        if (USE_MOCKS) {
            return new Promise(resolve =>
                setTimeout(() => {
                    mockStore = { ...mockStore, ...data, updatedAt: new Date().toISOString() };
                    resolve({ ...mockStore });
                }, 600)
            );
        }
        const response = await apiClient.put<CompanySettings>(BASE_PATH, data);
        return response.data;
    },

    uploadLogo: async (file: File): Promise<UploadLogoResponse> => {
        if (USE_MOCKS) {
            return new Promise(resolve =>
                setTimeout(() => {
                    const url = URL.createObjectURL(file);
                    mockStore = { ...mockStore, logoUrl: url };
                    resolve({ logoUrl: url });
                }, 800)
            );
        }
        const form = new FormData();
        form.append('file', file);
        const response = await apiClient.post<UploadLogoResponse>(`${BASE_PATH}/logo`, form);
        return response.data;
    },

    deleteLogo: async (): Promise<void> => {
        if (USE_MOCKS) {
            return new Promise(resolve =>
                setTimeout(() => {
                    mockStore = { ...mockStore, logoUrl: null };
                    resolve();
                }, 400)
            );
        }
        await apiClient.delete(`${BASE_PATH}/logo`);
    },
};
