export type VisitStatus = 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';

export type JournalEntryType = 'internal_note' | 'customer_communication';

export type DocumentType = 'photo' | 'pdf' | 'protocol';

export interface MoneyAmount {
    netAmount: number;
    grossAmount: number;
    currency: string;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    };
    note: string;
    finalPriceNet: number;
    finalPriceGross: number;
}

export interface VehicleInfo {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    color: string;
    engineType: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
    currentMileage?: number;
}

export interface CustomerInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName?: string;
    stats: {
        totalVisits: number;
        totalSpent: MoneyAmount;
        vehiclesCount: number;
    };
}

export interface JournalEntry {
    id: string;
    type: JournalEntryType;
    content: string;
    createdBy: string;
    createdAt: string;
    isDeleted: boolean;
}

export interface VisitDocument {
    id: string;
    type: DocumentType;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: string;
    category?: string;
}

export interface Visit {
    id: string;
    visitNumber: string;
    status: VisitStatus;
    scheduledDate: string;
    completedDate?: string;
    vehicle: VehicleInfo;
    customer: CustomerInfo;
    services: ServiceLineItem[];
    totalCost: MoneyAmount;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    technicalNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface VisitDetailResponse {
    visit: Visit;
    journalEntries: JournalEntry[];
    documents: VisitDocument[];
}

export interface UpdateVisitPayload {
    status?: VisitStatus;
    mileageAtArrival?: number;
    keysHandedOver?: boolean;
    documentsHandedOver?: boolean;
    technicalNotes?: string;
}

export interface CreateJournalEntryPayload {
    visitId: string;
    type: JournalEntryType;
    content: string;
}

export interface UploadDocumentPayload {
    visitId: string;
    file: File;
    type: DocumentType;
    category?: string;
}