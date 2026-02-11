import { apiClient } from '@/core';
import type {
    VisitDetailResponse,
    UpdateVisitPayload,
    VisitDocument,
    UploadDocumentPayload,
    AddServicePayload,
    UpdateServicePayload,
    DeleteServicePayload,
    UpdateServiceStatusPayload,
    ServiceLineItem,
} from '../types';
import type { ServicesChangesPayload } from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/visits';

const mockVisitDetail: VisitDetailResponse = {
    visit: {
        id: 'visit_1',
        visitNumber: 'VIS-2025-00042',
        status: 'READY_FOR_PICKUP',
        scheduledDate: '2025-01-15T09:00:00Z',
        vehicle: {
            id: 'veh_1',
            licensePlate: 'WA 12345',
            brand: 'BMW',
            model: 'X5',
            yearOfProduction: 2021,
            color: 'Czarny metalik',
            engineType: 'diesel',
            currentMileage: 45230,
        },
        customer: {
            id: 'cust_1',
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan.kowalski@example.com',
            phone: '+48 123 456 789',
            companyName: 'Firma Transport Sp. z o.o.',
            stats: {
                totalVisits: 12,
                totalSpent: {
                    netAmount: 2450000,
                    grossAmount: 3013500,
                    currency: 'PLN',
                },
                vehiclesCount: 3,
            },
        },
        services: [
            {
                id: 'service_line_1',
                serviceId: 'srv_ppf',
                serviceName: 'Oklejanie PPF - cały przód',
                basePriceNet: 350000,
                vatRate: 23,
                requireManualPrice: false,
                adjustment: { type: 'PERCENT', value: -10 },
                note: 'Dodatkowa warstwa na maskę',
                finalPriceNet: 315000,
                finalPriceGross: 387450,
                status: 'CONFIRMED',
            },
            {
                id: 'service_line_2',
                serviceId: 'srv_ceramic',
                serviceName: 'Powłoka ceramiczna',
                basePriceNet: 180000,
                vatRate: 23,
                requireManualPrice: false,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
                finalPriceNet: 180000,
                finalPriceGross: 221400,
                status: 'CONFIRMED',
            },
        ],
        totalCost: {
            netAmount: 495000,
            grossAmount: 608850,
            currency: 'PLN',
        },
        mileageAtArrival: 45230,
        keysHandedOver: true,
        documentsHandedOver: true,
        technicalNotes: 'Drobne zarysowania na masce - do wyprostowania przed oklejaniem',
        colorId: 'color_primary',
        createdAt: '2025-01-10T14:30:00Z',
        updatedAt: '2025-01-15T11:20:00Z',
    },
    documents: [
        {
            id: 'doc_1',
            visitId: 'visit_1',
            customerId: 'cust_1',
            type: 'PHOTO',
            name: 'Zdjęcie przodu pojazdu przy przyjęciu',
            fileName: 'przyjecie_przod.jpg',
            fileUrl: '/documents/doc_1/download',
            uploadedAt: '2025-01-15T09:10:00Z',
            uploadedBy: 'user_1',
            uploadedByName: 'Marek Nowak',
            category: 'przyjecie',
        },
        {
            id: 'doc_2',
            visitId: 'visit_1',
            customerId: 'cust_1',
            type: 'PHOTO',
            name: 'Zdjęcie tyłu pojazdu przy przyjęciu',
            fileName: 'przyjecie_tyl.jpg',
            fileUrl: '/documents/doc_2/download',
            uploadedAt: '2025-01-15T09:12:00Z',
            uploadedBy: 'user_1',
            uploadedByName: 'Marek Nowak',
            category: 'przyjecie',
        },
        {
            id: 'doc_3',
            visitId: 'visit_1',
            customerId: 'cust_1',
            type: 'PROTOCOL',
            name: 'Protokół przyjęcia pojazdu',
            fileName: 'protokol_przyjecia_VIS-2025-00042.pdf',
            fileUrl: '/documents/doc_3/download',
            uploadedAt: '2025-01-15T09:20:00Z',
            uploadedBy: 'system',
            uploadedByName: 'System',
            category: 'protokoly',
        },
    ],
};

// Mapowanie statusu z backendu (snake_case lowercase) na frontend (SCREAMING_SNAKE_CASE)
const mapVisitStatus = (backendStatus: string): string => {
    return backendStatus.toUpperCase();
};

export const visitApi = {
    getVisitDetail: async (visitId: string): Promise<VisitDetailResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return mockVisitDetail;
        }
        const response = await apiClient.get(`${BASE_PATH}/${visitId}`);
        const data = response.data;

        // Mapuj status z backendu na format frontendowy
        if (data.visit && data.visit.status) {
            data.visit.status = mapVisitStatus(data.visit.status);
        }

        return data;
    },

    getVisitDocuments: async (visitId: string): Promise<VisitDocument[]> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return mockVisitDetail.documents || [];
        }
        const response = await apiClient.get(`${BASE_PATH}/${visitId}/documents`);
        return response.data;
    },

    updateVisit: async (
        visitId: string,
        payload: UpdateVisitPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return;
        }

        // Mapuj status z formatu frontendowego (SCREAMING_SNAKE_CASE) na backend (snake_case lowercase)
        const backendPayload = { ...payload };
        if (backendPayload.status) {
            backendPayload.status = backendPayload.status.toLowerCase() as any;
        }

        await apiClient.patch(`${BASE_PATH}/${visitId}`, backendPayload);
    },

    uploadDocument: async (
        payload: UploadDocumentPayload
    ): Promise<VisitDocument> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                id: `doc_${Date.now()}`,
                visitId: payload.visitId,
                customerId: 'mock_customer_id',
                type: payload.type,
                name: payload.file.name,
                fileName: payload.file.name,
                fileUrl: `/documents/doc_${Date.now()}/download`,
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'mock_user_id',
                uploadedByName: 'Aktualny Użytkownik',
                category: payload.category,
            };
        }
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('visitId', payload.visitId);
        formData.append('customerId', payload.customerId || '');
        formData.append('type', payload.type);
        formData.append('name', payload.file.name);
        if (payload.category) {
            formData.append('category', payload.category);
        }

        const response = await apiClient.post(
            '/documents/external',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    deleteDocument: async (_visitId: string, documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }
        await apiClient.delete(`/documents/${documentId}`);
    },

    getDocumentDownloadUrl: async (documentId: string): Promise<string> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 200));
            return `/mock/documents/${documentId}/download`;
        }
        const response = await apiClient.get(`/documents/${documentId}/download-url`);
        return response.data.url;
    },

    // Service management
    addService: async (
        visitId: string,
        payload: AddServicePayload
    ): Promise<ServiceLineItem> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return {
                id: `service_line_${Date.now()}`,
                serviceId: payload.serviceId,
                serviceName: payload.serviceName,
                basePriceNet: payload.basePriceNet,
                vatRate: payload.vatRate,
                requireManualPrice: false,
                adjustment: payload.adjustment || { type: 'FIXED_NET', value: 0 },
                note: payload.note || '',
                finalPriceNet: payload.basePriceNet,
                finalPriceGross: Math.round(payload.basePriceNet * (1 + payload.vatRate / 100)),
                status: 'PENDING',
            };
        }
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services`,
            payload
        );
        return response.data;
    },

    updateService: async (
        visitId: string,
        serviceLineItemId: string,
        payload: UpdateServicePayload
    ): Promise<ServiceLineItem> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return {
                id: serviceLineItemId,
                serviceId: 'srv_mock',
                serviceName: 'Mock Service',
                basePriceNet: payload.basePriceNet || 100000,
                vatRate: payload.vatRate || 23,
                requireManualPrice: false,
                adjustment: payload.adjustment || { type: 'FIXED_NET', value: 0 },
                note: payload.note || '',
                finalPriceNet: payload.basePriceNet || 100000,
                finalPriceGross: Math.round((payload.basePriceNet || 100000) * (1 + (payload.vatRate || 23) / 100)),
                status: 'PENDING',
            };
        }
        const response = await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}`,
            payload
        );
        return response.data;
    },

    deleteService: async (
        visitId: string,
        serviceLineItemId: string,
        payload: DeleteServicePayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return;
        }
        await apiClient.delete(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}`,
            { data: payload }
        );
    },

    updateServiceStatus: async (
        visitId: string,
        serviceLineItemId: string,
        payload: UpdateServiceStatusPayload
    ): Promise<ServiceLineItem> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return {
                id: serviceLineItemId,
                serviceId: 'srv_mock',
                serviceName: 'Mock Service',
                basePriceNet: 100000,
                vatRate: 23,
                requireManualPrice: false,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
                finalPriceNet: 100000,
                finalPriceGross: 123000,
                status: payload.status,
            };
        }
        const response = await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/status`,
            payload
        );
        return response.data;
    },

    saveServicesChanges: async (
        visitId: string,
        payload: ServicesChangesPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return;
        }
        await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/`,
            payload
        );
    },

    approveServiceChange: async (
        visitId: string,
        serviceLineItemId: string
    ): Promise<ServiceLineItem> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return {
                id: serviceLineItemId,
                serviceId: 'srv_mock',
                serviceName: 'Mock Service',
                basePriceNet: 100000,
                vatRate: 23,
                requireManualPrice: false,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
                finalPriceNet: 100000,
                finalPriceGross: 123000,
                status: 'CONFIRMED',
                pendingOperation: null,
                hasPendingChange: false,
                previousPriceNet: null,
                previousPriceGross: null,
            };
        }
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/approve`
        );
        return response.data;
    },

    rejectServiceChange: async (
        visitId: string,
        serviceLineItemId: string
    ): Promise<ServiceLineItem> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return {
                id: serviceLineItemId,
                serviceId: 'srv_mock',
                serviceName: 'Mock Service',
                basePriceNet: 100000,
                vatRate: 23,
                requireManualPrice: false,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
                finalPriceNet: 100000,
                finalPriceGross: 123000,
                status: 'CONFIRMED',
                pendingOperation: null,
                hasPendingChange: false,
                previousPriceNet: null,
                previousPriceGross: null,
            };
        }
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/reject`
        );
        return response.data;
    },

    // Draft visit management
    cancelDraftVisit: async (visitId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('Mock: Cancelling draft visit', visitId);
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${visitId}`);
    },

    confirmDraftVisit: async (visitId: string): Promise<{ visitId: string; message: string }> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            console.log('Mock: Confirming draft visit', visitId);
            return {
                visitId,
                message: 'Visit confirmed successfully'
            };
        }
        const response = await apiClient.post(`${BASE_PATH}/${visitId}/confirm`);
        return response.data;
    },
};
