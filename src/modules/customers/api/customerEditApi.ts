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
        category: 'contracts',
        fileName: 'umowa_serwisowa_2023.pdf',
        description: 'Umowa serwisowa - pakiet Gold',
        fileSize: 1245678,
        mimeType: 'application/pdf',
        s3Key: 'customers/cust_123/contracts/umowa_serwisowa_2023.pdf',
        s3Bucket: 'crm-documents-prod',
        documentUrl: 'https://s3.example.com/doc1.pdf',
        thumbnailUrl: null,
        uploadedAt: '2023-06-15T10:30:00Z',
        uploadedBy: 'user_123',
        tags: ['serwis', 'gold', '2023'],
        metadata: {
            contractNumber: 'KTR/2023/001',
            validFrom: '2023-06-15',
            validTo: '2024-06-15',
        },
    },
    {
        id: 'doc_002',
        customerId: 'cust_123',
        category: 'identity',
        fileName: 'dowod_osobisty_skan.pdf',
        description: 'Kopia dowodu osobistego',
        fileSize: 845231,
        mimeType: 'application/pdf',
        s3Key: 'customers/cust_123/identity/dowod_osobisty_skan.pdf',
        s3Bucket: 'crm-documents-prod',
        documentUrl: 'https://s3.example.com/doc2.pdf',
        thumbnailUrl: 'https://s3.example.com/doc2_thumb.jpg',
        uploadedAt: '2023-06-15T10:35:00Z',
        uploadedBy: 'user_123',
        tags: ['weryfikacja', 'KYC'],
        metadata: {
            documentType: 'national_id',
            documentNumber: 'ABC123456',
        },
    },
    {
        id: 'doc_003',
        customerId: 'cust_123',
        category: 'invoices',
        fileName: 'faktura_2024_01.pdf',
        description: 'Faktura VAT 2024/01/001',
        fileSize: 245890,
        mimeType: 'application/pdf',
        s3Key: 'customers/cust_123/invoices/faktura_2024_01.pdf',
        s3Bucket: 'crm-documents-prod',
        documentUrl: 'https://s3.example.com/doc3.pdf',
        thumbnailUrl: null,
        uploadedAt: '2024-01-15T09:00:00Z',
        uploadedBy: 'user_456',
        tags: ['faktura', '2024', 'VAT'],
        metadata: {
            invoiceNumber: '2024/01/001',
            amount: 5500,
            currency: 'PLN',
        },
    },
];

const mockGetDocuments = async (
    customerId: string,
    filters: DocumentFilters
): Promise<DocumentListResponse> => {
    await delay(400);

    let filtered = mockDocuments.filter(doc => doc.customerId === customerId);

    if (filters.category) {
        filtered = filtered.filter(doc => doc.category === filters.category);
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(doc =>
            doc.fileName.toLowerCase().includes(searchLower) ||
            doc.description.toLowerCase().includes(searchLower)
        );
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / filters.limit);
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginatedDocs = filtered.slice(startIndex, endIndex);

    return {
        data: paginatedDocs,
        pagination: {
            currentPage: filters.page,
            totalPages,
            totalItems,
            itemsPerPage: filters.limit,
        },
    };
};

const mockUploadDocument = async (
    customerId: string,
    payload: UploadDocumentPayload
): Promise<CustomerDocument> => {
    await delay(1500);

    const newDoc: CustomerDocument = {
        id: `doc_${Date.now()}`,
        customerId,
        category: payload.category,
        fileName: payload.file.name,
        description: payload.description,
        fileSize: payload.file.size,
        mimeType: payload.file.type,
        s3Key: `customers/${customerId}/${payload.category}/${payload.file.name}`,
        s3Bucket: 'crm-documents-prod',
        documentUrl: `https://s3.example.com/${payload.file.name}`,
        thumbnailUrl: null,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current_user',
        tags: payload.tags,
        metadata: payload.metadata || {},
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

    getDocuments: async (
        customerId: string,
        filters: DocumentFilters
    ): Promise<DocumentListResponse> => {
        if (USE_MOCKS) {
            return mockGetDocuments(customerId, filters);
        }

        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
        });

        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

        const response = await apiClient.get<DocumentListResponse>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/documents?${params.toString()}`
        );
        return response.data;
    },

    uploadDocument: async (
        customerId: string,
        payload: UploadDocumentPayload
    ): Promise<CustomerDocument> => {
        if (USE_MOCKS) {
            return mockUploadDocument(customerId, payload);
        }

        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('category', payload.category);
        formData.append('description', payload.description);
        formData.append('tags', JSON.stringify(payload.tags));
        if (payload.metadata) {
            formData.append('metadata', JSON.stringify(payload.metadata));
        }

        const response = await apiClient.post<CustomerDocument>(
            `${CUSTOMERS_BASE_PATH}/${customerId}/documents`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    getDocumentDownload: async (documentId: string): Promise<DocumentDownloadResponse> => {
        if (USE_MOCKS) {
            return mockGetDocumentDownload(documentId);
        }

        const response = await apiClient.get<DocumentDownloadResponse>(
            `${DOCUMENTS_BASE_PATH}/${documentId}/download`
        );
        return response.data;
    },

    deleteDocument: async (documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteDocument(documentId);
        }

        await apiClient.delete(`${DOCUMENTS_BASE_PATH}/${documentId}`);
    },
};
