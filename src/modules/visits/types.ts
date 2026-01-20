export type VisitStatus = 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';

export type DocumentType = 'PHOTO' | 'PDF' | 'PROTOCOL' | 'INTAKE' | 'OUTTAKE' | 'DAMAGE_MAP' | 'OTHER';

export type CommentType = 'INTERNAL' | 'FOR_CUSTOMER';

export type ServiceStatus = 'CONFIRMED' | 'PENDING';

export interface CommentRevision {
    id: string;
    commentId: string;
    oldContent: string;
    newContent: string;
    changedBy: string;
    changedByName: string;
    changedAt: string;
}

export interface VisitComment {
    id: string;
    visitId: string;
    type: CommentType;
    content: string;
    isDeleted: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedBy?: string;
    updatedByName?: string;
    updatedAt?: string;
    deletedBy?: string;
    deletedByName?: string;
    deletedAt?: string;
    revisions: CommentRevision[];
}

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
    status: ServiceStatus;
}

export interface VehicleInfo {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    color: string;
    engineType?: string;
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

export interface VisitDocument {
    id: string;
    visitId: string;
    customerId: string;
    type: DocumentType;
    name: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
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
    colorId: string;
    createdAt: string;
    updatedAt: string;
}

export interface VisitDetailResponse {
    visit: Visit;
    documents?: VisitDocument[];
}

export interface UpdateVisitPayload {
    status?: VisitStatus;
    mileageAtArrival?: number;
    keysHandedOver?: boolean;
    documentsHandedOver?: boolean;
    technicalNotes?: string;
}

export interface UploadDocumentPayload {
    visitId: string;
    customerId?: string;
    file: File;
    type: DocumentType;
    category?: string;
}

export interface AddCommentPayload {
    type: CommentType;
    content: string;
}

export interface UpdateCommentPayload {
    content: string;
}

export interface GetCommentsResponse {
    comments: VisitComment[];
}

export interface AddCommentResponse {
    commentId: string;
}

export interface UpdateCommentResponse {
    commentId: string;
    wasChanged: boolean;
}

export interface DeleteCommentResponse {
    commentId: string;
    wasDeleted: boolean;
}

// Service management types
export interface AddServicePayload {
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment?: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    };
    note?: string;
    notifyCustomer?: boolean;
}

export interface UpdateServicePayload {
    basePriceNet?: number;
    vatRate?: number;
    adjustment?: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    };
    note?: string;
    notifyCustomer?: boolean;
}

export interface DeleteServicePayload {
    notifyCustomer?: boolean;
}

export interface UpdateServiceStatusPayload {
    status: ServiceStatus;
}
