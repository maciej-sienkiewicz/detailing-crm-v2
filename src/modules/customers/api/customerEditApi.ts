// src/modules/customers/api/customerEditApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    Customer,
    UpdateCustomerPayload,
    UpdateCompanyPayload,
    UpdateNotesPayload,
    CustomerDocument,
    DocumentListResponse,
    DocumentFilters,
    UploadDocumentPayload,
    DocumentDownloadResponse,
    CompanyDetails,
} from '../types';

const CUSTOMERS_BASE_PATH = '/v1/customers';
const DOCUMENTS_BASE_PATH = '/v1/documents';
const USE_MOCKS = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockUpdateCustomer = async (
    customerId: string,
    payload: UpdateCustomerPayload
): Promise<Customer> => {
    await delay(600);

    return {
        id: customerId,
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        contact: {
            email: payload.contact?.email || '',
            phone: payload.contact?.phone || '',
        },
        homeAddress: payload.homeAddress || null,
        company: null,
        notes: 'Updated customer',
        lastVisitDate: '2025-01-10',
        totalVisits: 12,
        vehicleCount: 3,
        totalRevenue: {
            netAmount: 45000,
            grossAmount: 55350,
            currency: 'PLN',
        },
        createdAt: '2023-06-15T10:30:00Z',
        updatedAt: new Date().toISOString(),
    };
};

const mockUpdateCompany = async (
    _customerId: string,
    payload: UpdateCompanyPayload
): Promise<CompanyDetails> => {
    await delay(500);

    return {
        id: `comp_${Date.now()}`,
        name: payload.name,
        nip: payload.nip,
        regon: payload.regon,
        address: payload.address,
    };
};

const mockDeleteCompany = async (_customerId: string): Promise<void> => {
    await delay(400);
};

const mockUpdateNotes = async (
    _customerId: string,
    payload: UpdateNotesPayload
): Promise<{ notes: string; updatedAt: string }> => {
    await delay(300);

    return {
        notes: payload.notes,
        updatedAt: new Date().toISOString(),
    };
};

const mockDocuments: CustomerDocument[] = [
    {
        id: 'doc_001',
        customerId: 'cust_123',
        type: 'PDF',
        name: 'Umowa serwisowa - pakiet Gold',
        fileName: 'umowa_serwisowa_2023.pdf',
        fileUrl: 'https://s3.example.com/doc1.pdf',
        uploadedAt: '2023-06-15T10:30:00Z',
        uploadedBy: 'user_123',
        uploadedByName: 'Jan Kowalski',
        category: 'contracts',
    },
    {
        id: 'doc_002',
        customerId: 'cust_123',
        type: 'PDF',
        name: 'Kopia dowodu osobistego',
        fileName: 'dowod_osobisty_skan.pdf',
        fileUrl: 'https://s3.example.com/doc2.pdf',
        uploadedAt: '2023-06-15T10:35:00Z',
        uploadedBy: 'user_123',
        uploadedByName: 'Jan Kowalski',
        category: 'identity',
    },
    {
        id: 'doc_003',
        customerId: 'cust_123',
        type: 'PDF',
        name: 'Faktura VAT 2024/01/001',
        fileName: 'faktura_2024_01.pdf',
        fileUrl: 'https://s3.example.com/doc3.pdf',
        uploadedAt: '2024-01-15T09:00:00Z',
        uploadedBy: 'user_456',
        uploadedByName: 'Anna Nowak',
        category: 'invoices',
    },
];

const mockGetDocuments = async (
    customerId: string
): Promise<CustomerDocument[]> => {
    await delay(400);
    return mockDocuments.filter(doc => doc.customerId === customerId);
};

const mockUploadDocument = async (
    payload: UploadDocumentPayload
): Promise<CustomerDocument> => {
    await delay(1500);

    const newDoc: CustomerDocument = {
        id: `doc_${Date.now()}`,
        customerId: payload.customerId,
        type: payload.type,
        name: payload.name || payload.file.name,
        fileName: payload.file.name,
        fileUrl: `https://s3.example.com/${payload.file.name}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current_user',
        uploadedByName: 'Current User',
        category: payload.category,
    };

    mockDocuments.unshift(newDoc);
    return newDoc;
};

const mockGetDocumentDownload = async (documentId: string): Promise<DocumentDownloadResponse> => {
    await delay(200);

    const doc = mockDocuments.find(d => d.id === documentId);
    if (!doc) {
        throw new Error('Document not found');
    }

    return {
        documentId,
        fileName: doc.fileName,
        downloadUrl: `${doc.documentUrl}?expires=3600&signature=abc123`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
    };
};

const mockDeleteDocument = async (documentId: string): Promise<void> => {
    await delay(300);

    const index = mockDocuments.findIndex(d => d.id === documentId);
    if (index !== -1) {
        mockDocuments.splice(index, 1);
    }
};

export const customerEditApi = {
    updateCustomer: async (
        customerId: string,
        payload: UpdateCustomerPayload
    ): Promise<Customer> => {
        if (USE_MOCKS) {
            return mockUpdateCustomer(customerId, payload);
        }

        const response = await apiClient.patch<Customer>(
            `${CUSTOMERS_BASE_PATH}/${customerId}`,
            payload
        );
        return response.data;
    },

    updateCompany: async (
        customerId: string,
        payload: UpdateCompanyPayload
    ): Promise<CompanyDetails> => {
        if (USE_MOCKS) {
            return mockUpdateCompany(customerId, payload);
        }

        const response = await apiClient.patch<CompanyDetails>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/company`,
            payload
        );
        return response.data;
    },

    deleteCompany: async (customerId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteCompany(customerId);
        }

        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}/company`);
    },

    updateNotes: async (
        customerId: string,
        payload: UpdateNotesPayload
    ): Promise<{ notes: string; updatedAt: string }> => {
        if (USE_MOCKS) {
            return mockUpdateNotes(customerId, payload);
        }

        const response = await apiClient.patch<{ notes: string; updatedAt: string }>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/notes`,
            payload
        );
        return response.data;
    },

    getDocuments: async (customerId: string): Promise<CustomerDocument[]> => {
        if (USE_MOCKS) {
            return mockGetDocuments(customerId);
        }

        const response = await apiClient.get<CustomerDocument[]>(
            `customers/${customerId}/documents`
        );
        return response.data;
    },

    uploadDocument: async (payload: UploadDocumentPayload): Promise<CustomerDocument> => {
        if (USE_MOCKS) {
            return mockUploadDocument(payload);
        }

        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('customerId', payload.customerId);
        formData.append('type', payload.type);
        formData.append('name', payload.name || payload.file.name);
        if (payload.visitId) formData.append('visitId', payload.visitId);
        if (payload.category) formData.append('category', payload.category);

        const response = await apiClient.post<CustomerDocument>(
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

    getDocumentDownload: async (documentId: string): Promise<string> => {
        if (USE_MOCKS) {
            const mockResponse = await mockGetDocumentDownload(documentId);
            return mockResponse.downloadUrl;
        }

        const response = await apiClient.get<{ url: string }>(
            `/documents/${documentId}/download-url`
        );
        return response.data.url;
    },

    deleteDocument: async (documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteDocument(documentId);
        }

        await apiClient.delete(`/documents/${documentId}`);
    },
};
