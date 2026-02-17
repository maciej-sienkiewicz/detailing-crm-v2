// src/modules/customers/api/customerEditApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    Customer,
    UpdateCustomerPayload,
    UpdateCompanyPayload,
    UpdateNotesPayload,
    CustomerDocument,
    UploadDocumentPayload,
    CompanyDetails,
} from '../types';

const CUSTOMERS_BASE_PATH = '/v1/customers';
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
        name: 'Umowa serwisowa - pakiet Gold',
        fileName: 'umowa_serwisowa_2023.pdf',
        fileUrl: 'https://s3.example.com/doc1.pdf',
        uploadedAt: '2023-06-15T10:30:00Z',
        uploadedByName: 'Jan Kowalski',
    },
    {
        id: 'doc_002',
        name: 'Kopia dowodu osobistego',
        fileName: 'dowod_osobisty_skan.pdf',
        fileUrl: 'https://s3.example.com/doc2.pdf',
        uploadedAt: '2023-06-15T10:35:00Z',
        uploadedByName: 'Jan Kowalski',
    },
    {
        id: 'doc_003',
        name: 'Faktura VAT 2024/01/001',
        fileName: 'faktura_2024_01.pdf',
        fileUrl: 'https://s3.example.com/doc3.pdf',
        uploadedAt: '2024-01-15T09:00:00Z',
        uploadedByName: 'Anna Nowak',
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
        name: payload.name || payload.file.name,
        fileName: payload.file.name,
        fileUrl: `https://s3.example.com/${payload.file.name}`,
        uploadedAt: new Date().toISOString(),
        uploadedByName: 'Current User',
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
        downloadUrl: `${doc.fileUrl}?expires=3600&signature=abc123`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        fileSize: 1024 * 1024, // Mock size 1MB
        mimeType: 'application/pdf', // Mock mime type
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
            `${CUSTOMERS_BASE_PATH}/${customerId}/documents`
        );
        return response.data;
    },

    uploadDocument: async (payload: UploadDocumentPayload): Promise<CustomerDocument> => {
        if (USE_MOCKS) {
            return mockUploadDocument(payload);
        }

        // Step 1: Initiate upload — backend returns presigned S3 URL
        const initiateResponse = await apiClient.post<{ documentId: string; uploadUrl: string }>(
            `${CUSTOMERS_BASE_PATH}/${payload.customerId}/documents`,
            {
                name: payload.name || payload.file.name,
                fileName: payload.file.name,
                contentType: payload.file.type || 'application/octet-stream',
            }
        );
        const { documentId, uploadUrl } = initiateResponse.data;

        // Step 2: Upload file binary directly to S3 via presigned URL (no auth headers)
        const s3Response = await fetch(uploadUrl, {
            method: 'PUT',
            body: payload.file,
            headers: {
                'Content-Type': payload.file.type || 'application/octet-stream',
            },
        });

        if (!s3Response.ok) {
            throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
        }

        return {
            id: documentId,
            name: payload.name || payload.file.name,
            fileName: payload.file.name,
            fileUrl: '',
            uploadedAt: new Date().toISOString(),
            uploadedByName: '',
        };
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

    deleteDocument: async (customerId: string, documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteDocument(documentId);
        }

        await apiClient.delete(`${CUSTOMERS_BASE_PATH}/${customerId}/documents/${documentId}`);
    },
};
