// ─── Team / Employees (Settings) ───────────────────────────────────────────────

export interface TeamEmployeeAccount {
    userId: string;
    roleId: string | null;
    isActive: boolean;
}

export interface TeamEmployeeListItem {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    linkedUserId: string | null;
}

export interface TeamPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface TeamEmployeeListResponse {
    items: TeamEmployeeListItem[];
    pagination: TeamPagination;
}

export interface TeamEmployeeDetail {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    linkedUserId: string | null;
    account: TeamEmployeeAccount | null;
    phone: string | null;
    email: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TeamEmployeeFilters {
    search: string;
    page: number;
    limit: number;
}

export interface CreateEmployeeRequest {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    roleId?: string | null;
}

export interface UpdateEmployeeRequest {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
}

export interface CreateAccountRequest {
    email: string;
}

export interface CreateAccountResponse {
    userId: string;
}

/** Data collected by the "add employee" form — maps to a 3-step API flow. */
export interface CreateEmployeeFormOutput {
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    createAccount: boolean;
    roleId: string | null;
}

export interface ChangePasswordRequest {
    newPassword: string;
    confirmPassword: string;
}
