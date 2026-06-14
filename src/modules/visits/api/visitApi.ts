import { apiClient } from '@/core';
import type {
    VisitDetailResponse,
    UpdateVisitPayload,
    VisitDocument,
    UploadDocumentPayload,
    UploadPhotoPayload,
    UploadPhotoResponse,
    AddServicePayload,
    UpdateServicePayload,
    DeleteServicePayload,
    UpdateServiceStatusPayload,
    ServiceLineItem,
    VisitPhotosResponse,
    ConfirmVisitOptions,
} from '../types';
import type { ServicesChangesPayload } from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/visits';

// ─── Mock data for 3 reference-visit IDs used in sharedEstimation.relatedVisits ─

const mockVisitPhotos1: VisitPhotosResponse = {
    photos: [
        {
            id: 'p1a',
            fileName: 'porsche-front.jpg',
            description: 'Przód przed aplikacją PPF',
            uploadedAt: '2025-03-10T09:05:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1920&q=90',
        },
        {
            id: 'p1b',
            fileName: 'porsche-hood.jpg',
            description: 'Maska – folia PPF',
            uploadedAt: '2025-03-10T09:10:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=90',
        },
        {
            id: 'p1c',
            fileName: 'porsche-side.jpg',
            description: 'Bok po oklejeniu',
            uploadedAt: '2025-03-10T09:22:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920&q=90',
        },
        {
            id: 'p1d',
            fileName: 'porsche-detail.jpg',
            uploadedAt: '2025-03-10T09:30:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1920&q=90',
        },
        {
            id: 'p1e',
            fileName: 'porsche-rear.jpg',
            uploadedAt: '2025-03-10T09:38:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1920&q=90',
        },
        {
            id: 'p1f',
            fileName: 'porsche-wheel.jpg',
            uploadedAt: '2025-03-10T09:45:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1514316703755-dca7d7d9d882?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1514316703755-dca7d7d9d882?w=1920&q=90',
        },
    ],
};

const mockVisitPhotos2: VisitPhotosResponse = {
    photos: [
        {
            id: 'p2a',
            fileName: 'bmw-before.jpg',
            description: 'Przed korektą lakieru',
            uploadedAt: '2025-04-02T10:00:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=90',
        },
        {
            id: 'p2b',
            fileName: 'bmw-after.jpg',
            description: 'Po aplikacji ceramiki',
            uploadedAt: '2025-04-04T16:00:00Z',
            thumbnailUrl: 'https://images.unsplash.com/photo-1617531653332-bd46c16f4d68?w=400&q=80',
            fullSizeUrl:  'https://images.unsplash.com/photo-1617531653332-bd46c16f4d68?w=1920&q=90',
        },
    ],
};

const mockVisitPhotos3: VisitPhotosResponse = { photos: [] };

const mockVisitDetail1: VisitDetailResponse = {
    visit: {
        id: '566872ca-8db2-45be-a769-c2f1eaa3449a',
        visitNumber: 'VIS-2025-00112',
        title: 'PPF całość + ceramika',
        status: 'COMPLETED',
        scheduledDate: '2025-03-10T09:00:00Z',
        estimatedCompletionDate: '2025-03-13T17:00:00Z',
        completedDate: '2025-03-13T15:30:00Z',
        vehicle: {
            id: 'veh_ppf1',
            licensePlate: 'KR 55599',
            brand: 'Porsche',
            model: '911 Carrera',
            yearOfProduction: 2023,
            color: 'GT Silver Metallic',
        },
        customer: {
            id: 'cust_ppf1',
            firstName: 'Arkadiusz',
            lastName: 'Wróbel',
            email: 'a.wrobel@example.com',
            phone: '+48 601 200 300',
            stats: { totalVisits: 3, totalSpent: { netAmount: 1500000, grossAmount: 1845000, currency: 'PLN' }, vehiclesCount: 1 },
        },
        services: [
            { id: 's1a', serviceId: 'srv_ppf_full', serviceName: 'Folia PPF – całość', basePriceNet: 499900, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 499900, finalPriceGross: 614877, status: 'CONFIRMED' },
            { id: 's1b', serviceId: 'srv_ceramic', serviceName: 'Powłoka ceramiczna 9H', basePriceNet: 120000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 120000, finalPriceGross: 147600, status: 'CONFIRMED' },
        ],
        totalCost: { netAmount: 619900, grossAmount: 762477, currency: 'PLN' },
        mileageAtArrival: 12400,
        keysHandedOver: true,
        documentsHandedOver: true,
        technicalNotes: 'Lakier fabryczny w bardzo dobrym stanie — przed PPF wystarczyła jednoetapowa korekta. Uwaga na krawędzie zderzaka przedniego (cienki lakier) — folię zawijano ręcznie. Klient prosił o matowe wykończenie na dachu.',
        colorId: 'silver',
        createdAt: '2025-03-05T10:00:00Z',
        updatedAt: '2025-03-13T15:30:00Z',
    },
};

const mockVisitDetail2: VisitDetailResponse = {
    visit: {
        id: '61c11352-1b06-48fa-96e2-33ffee44873e',
        visitNumber: 'VIS-2025-00187',
        title: 'Sienkiewicz na full body',
        status: 'COMPLETED',
        scheduledDate: '2025-04-02T08:00:00Z',
        estimatedCompletionDate: '2025-04-05T16:00:00Z',
        completedDate: '2025-04-05T14:00:00Z',
        vehicle: {
            id: 'veh_bmw',
            licensePlate: 'WA 88801',
            brand: 'BMW',
            model: 'M3 Competition',
            yearOfProduction: 2022,
            color: 'Frozen Portimao Blue',
        },
        customer: {
            id: 'cust_bmw',
            firstName: 'Maciej',
            lastName: 'Sienkiewicz',
            email: 'sienkiewicz@example.com',
            phone: '+48 512 000 999',
            stats: { totalVisits: 7, totalSpent: { netAmount: 3200000, grossAmount: 3936000, currency: 'PLN' }, vehiclesCount: 2 },
        },
        services: [
            { id: 's2a', serviceId: 'srv_ppf_full', serviceName: 'Folia PPF – całość', basePriceNet: 499900, vatRate: 23, requireManualPrice: false, adjustment: { type: 'PERCENT', value: -5 }, note: 'Stały klient – rabat 5%', finalPriceNet: 474905, finalPriceGross: 584133, status: 'CONFIRMED' },
            { id: 's2b', serviceId: 'srv_detailing', serviceName: 'Detailing wnętrza premium', basePriceNet: 50000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 50000, finalPriceGross: 61500, status: 'CONFIRMED' },
            { id: 's2c', serviceId: 'srv_lacquer', serviceName: 'Korekta lakieru 2-etapowa', basePriceNet: 90000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 90000, finalPriceGross: 110700, status: 'CONFIRMED' },
        ],
        totalCost: { netAmount: 614905, grossAmount: 756333, currency: 'PLN' },
        mileageAtArrival: 28750,
        keysHandedOver: true,
        documentsHandedOver: true,
        technicalNotes: 'Folia Frozen wymaga delikatnego mycia — poinformować klienta o pielęgnacji. Drobne odpryski na masce wypełnione przed aplikacją. Korekta 2-etapowa: 95% defektów usuniętych, pozostałe głębokie rysy oznaczone w protokole.',
        colorId: 'blue',
        createdAt: '2025-03-28T12:00:00Z',
        updatedAt: '2025-04-05T14:00:00Z',
    },
};

const mockVisitDetail3: VisitDetailResponse = {
    visit: {
        id: 'c5200a4a-8e2a-4ac7-b509-f46b9368739e',
        visitNumber: 'VIS-2025-00203',
        title: 'Folia + detailing',
        status: 'IN_PROGRESS',
        scheduledDate: '2025-05-20T09:00:00Z',
        vehicle: {
            id: 'veh_merc',
            licensePlate: 'GD 11199',
            brand: 'Mercedes-Benz',
            model: 'GLE 63 AMG',
            yearOfProduction: 2021,
            color: 'Obsidian Black',
        },
        customer: {
            id: 'cust_merc',
            firstName: 'Tomasz',
            lastName: 'Dąbrowski',
            email: 'tdabrowski@example.com',
            phone: '+48 721 500 400',
            stats: { totalVisits: 2, totalSpent: { netAmount: 800000, grossAmount: 984000, currency: 'PLN' }, vehiclesCount: 1 },
        },
        services: [
            { id: 's3a', serviceId: 'srv_ppf_front', serviceName: 'Folia PPF – przód', basePriceNet: 230000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 230000, finalPriceGross: 282900, status: 'CONFIRMED' },
            { id: 's3b', serviceId: 'srv_detailing', serviceName: 'Detailing wnętrza', basePriceNet: 50000, vatRate: 23, requireManualPrice: false, adjustment: { type: 'FIXED_NET', value: 0 }, note: '', finalPriceNet: 50000, finalPriceGross: 61500, status: 'CONFIRMED' },
        ],
        totalCost: { netAmount: 280000, grossAmount: 344400, currency: 'PLN' },
        mileageAtArrival: 64200,
        keysHandedOver: true,
        documentsHandedOver: false,
        technicalNotes: 'Pojazd po kolizji — sprawdzić pasowanie zderzaka przed folią. Wnętrze mocno zabrudzone (sierść zwierzęca) — detailing wymaga dodatkowego czasu na tapicerkę.',
        colorId: 'black',
        createdAt: '2025-05-15T09:00:00Z',
        updatedAt: '2025-05-20T11:00:00Z',
    },
};

const mockVisitDetailsMap: Record<string, VisitDetailResponse> = {
    '566872ca-8db2-45be-a769-c2f1eaa3449a': mockVisitDetail1,
    '61c11352-1b06-48fa-96e2-33ffee44873e': mockVisitDetail2,
    'c5200a4a-8e2a-4ac7-b509-f46b9368739e': mockVisitDetail3,
};

const mockVisitPhotosMap: Record<string, VisitPhotosResponse> = {
    '566872ca-8db2-45be-a769-c2f1eaa3449a': mockVisitPhotos1,
    '61c11352-1b06-48fa-96e2-33ffee44873e': mockVisitPhotos2,
    'c5200a4a-8e2a-4ac7-b509-f46b9368739e': mockVisitPhotos3,
};

// Legacy single-visit mock (kept for other mocked endpoints)
const mockVisitPhotos: VisitPhotosResponse = mockVisitPhotos1;
const mockVisitDetail: VisitDetailResponse = mockVisitDetail1;

// Mapowanie statusu z backendu (snake_case lowercase) na frontend (SCREAMING_SNAKE_CASE)
const mapVisitStatus = (backendStatus: string): string => {
    return backendStatus.toUpperCase();
};

export const visitApi = {
    getVisitDetail: async (visitId: string): Promise<VisitDetailResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return mockVisitDetailsMap[visitId] ?? mockVisitDetail;
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

    uploadPhoto: async (
        payload: UploadPhotoPayload
    ): Promise<UploadPhotoResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                photoId: `photo_${Date.now()}`,
                uploadUrl: `https://mock-s3.amazonaws.com/upload/${Date.now()}`,
                fileId: `fileId_${Date.now()}`,
            };
        }

        // Step 1: Request presigned URL from backend
        const requestBody = {
            fileName: payload.file.name,
            description: payload.description || undefined,
        };

        const response = await apiClient.post<UploadPhotoResponse>(
            `${BASE_PATH}/${payload.visitId}/photos`,
            requestBody
        );

        const { uploadUrl } = response.data;

        // Step 2: Upload file directly to S3 using presigned URL
        await fetch(uploadUrl, {
            method: 'PUT',
            body: payload.file,
            headers: {
                'Content-Type': payload.file.type,
            },
        });

        return response.data;
    },

    deletePhoto: async (visitId: string, photoId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${visitId}/photos/${photoId}`);
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

    updateTitle: async (visitId: string, title: string): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/title`, { title });
    },

    updateEstimatedCompletionDate: async (visitId: string, date: string): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/estimated-completion-date`, { estimatedCompletionDate: date });
    },

    confirmDraftVisit: async (visitId: string, options?: ConfirmVisitOptions): Promise<{ visitId: string; message: string }> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            console.log('Mock: Confirming draft visit', visitId, options);
            return {
                visitId,
                message: 'Visit confirmed successfully'
            };
        }
        const response = await apiClient.post(`${BASE_PATH}/${visitId}/confirm`, options ?? {});
        return response.data;
    },

    /**
     * Get visit photos with presigned URLs
     * Photos uploaded during check-in
     */
    getVisitPhotos: async (visitId: string): Promise<VisitPhotosResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockVisitPhotosMap[visitId] ?? mockVisitPhotos;
        }
        const response = await apiClient.get(`${BASE_PATH}/${visitId}/photos`);
        return response.data;
    },
};
