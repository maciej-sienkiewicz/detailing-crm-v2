import { apiClient } from '@/core';
import type {
    VisitDetailResponse,
    UpdateVisitPayload,
    CreateJournalEntryPayload,
    JournalEntry,
    VisitDocument,
    UploadDocumentPayload,
} from '../types';

const USE_MOCKS = true;
const BASE_PATH = '/api/visits';

const mockVisitDetail: VisitDetailResponse = {
    visit: {
        id: 'visit_1',
        visitNumber: 'VIS-2025-00042',
        status: 'ready',
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
                adjustment: { type: 'PERCENT', value: -10 },
                note: 'Dodatkowa warstwa na maskę',
                finalPriceNet: 315000,
                finalPriceGross: 387450,
            },
            {
                id: 'service_line_2',
                serviceId: 'srv_ceramic',
                serviceName: 'Powłoka ceramiczna',
                basePriceNet: 180000,
                vatRate: 23,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
                finalPriceNet: 180000,
                finalPriceGross: 221400,
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
        createdAt: '2025-01-10T14:30:00Z',
        updatedAt: '2025-01-15T11:20:00Z',
    },
    journalEntries: [
        {
            id: 'entry_1',
            type: 'internal_note',
            content: 'Samochód przyjęty do warsztatu. Przebieg zgodny z deklaracją.',
            createdBy: 'Marek Nowak',
            createdAt: '2025-01-15T09:05:00Z',
            isDeleted: false,
        },
        {
            id: 'entry_2',
            type: 'customer_communication',
            content: 'Klient poinformowany o rozpoczęciu prac. Szacowany czas wykonania: 3 dni robocze.',
            createdBy: 'Anna Kowalczyk',
            createdAt: '2025-01-15T09:30:00Z',
            isDeleted: false,
        },
        {
            id: 'entry_3',
            type: 'internal_note',
            content: 'Rozpoczęto przygotowanie powierzchni lakieru pod oklejanie PPF.',
            createdBy: 'Piotr Wiśniewski',
            createdAt: '2025-01-15T10:15:00Z',
            isDeleted: false,
        },
    ],
    documents: [
        {
            id: 'doc_1',
            type: 'photo',
            fileName: 'przyjecie_przod.jpg',
            fileUrl: '/api/documents/doc_1/download',
            uploadedAt: '2025-01-15T09:10:00Z',
            uploadedBy: 'Marek Nowak',
            category: 'przyjecie',
        },
        {
            id: 'doc_2',
            type: 'photo',
            fileName: 'przyjecie_tyl.jpg',
            fileUrl: '/api/documents/doc_2/download',
            uploadedAt: '2025-01-15T09:12:00Z',
            uploadedBy: 'Marek Nowak',
            category: 'przyjecie',
        },
        {
            id: 'doc_3',
            type: 'pdf',
            fileName: 'protokol_przyjecia_VIS-2025-00042.pdf',
            fileUrl: '/api/documents/doc_3/download',
            uploadedAt: '2025-01-15T09:20:00Z',
            uploadedBy: 'System',
            category: 'protokoly',
        },
    ],
};

export const visitApi = {
    getVisitDetail: async (visitId: string): Promise<VisitDetailResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return mockVisitDetail;
        }
        const response = await apiClient.get(`${BASE_PATH}/${visitId}`);
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
        await apiClient.patch(`${BASE_PATH}/${visitId}`, payload);
    },

    createJournalEntry: async (
        payload: CreateJournalEntryPayload
    ): Promise<JournalEntry> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return {
                id: `entry_${Date.now()}`,
                type: payload.type,
                content: payload.content,
                createdBy: 'Aktualny Użytkownik',
                createdAt: new Date().toISOString(),
                isDeleted: false,
            };
        }
        const response = await apiClient.post(
            `${BASE_PATH}/${payload.visitId}/journal`,
            payload
        );
        return response.data;
    },

    deleteJournalEntry: async (
        visitId: string,
        entryId: string
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${visitId}/journal/${entryId}`);
    },

    uploadDocument: async (
        payload: UploadDocumentPayload
    ): Promise<VisitDocument> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                id: `doc_${Date.now()}`,
                type: payload.type,
                fileName: payload.file.name,
                fileUrl: `/api/documents/doc_${Date.now()}/download`,
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'Aktualny Użytkownik',
                category: payload.category,
            };
        }
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('type', payload.type);
        if (payload.category) {
            formData.append('category', payload.category);
        }

        const response = await apiClient.post(
            `${BASE_PATH}/${payload.visitId}/documents`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    deleteDocument: async (visitId: string, documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${visitId}/documents/${documentId}`);
    },
};