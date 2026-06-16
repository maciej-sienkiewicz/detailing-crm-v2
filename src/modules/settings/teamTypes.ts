// ─── Team / Employees (Settings) ───────────────────────────────────────────────

export type AccountRole = 'OWNER' | 'MANAGER' | 'DETAILER';

/** Roles that an administrator may assign when creating an account (never OWNER). */
export type AssignableAccountRole = Exclude<AccountRole, 'OWNER'>;

export interface TeamEmployeeAccount {
    userId: string;
    email: string;
    role: AccountRole;
    isActive: boolean; // false = konto zablokowane
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
    createAccount?: boolean;
    accountEmail?: string | null;
    accountRole?: AssignableAccountRole | null;
}

export interface UpdateEmployeeRequest {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
}

export interface CreateAccountRequest {
    email: string;
    role: AssignableAccountRole;
}

export interface CreateAccountResponse {
    userId: string;
}

export interface ChangePasswordRequest {
    newPassword: string;
    confirmPassword: string;
}
