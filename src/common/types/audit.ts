// src/common/types/audit.ts

export interface AuditChange {
    field: string;
    oldValue: string | null;
    newValue: string | null;
}

export interface AuditEntry {
    id: string;
    userId: string;
    userDisplayName: string;
    module: string;
    entityId: string;
    entityDisplayName: string;
    action: string;
    changes: AuditChange[];
    metadata: Record<string, any>;
    createdAt: string;
}

export interface AuditLogResponse {
    items: AuditEntry[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
