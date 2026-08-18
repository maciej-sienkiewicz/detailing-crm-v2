// ─── Team / Employees (Settings) ───────────────────────────────────────────────

export interface TeamEmployeeAccount {
    userId: string;
    roleId: string | null;
    isActive: boolean;
}

/** The account's role as the employee list reports it. */
export interface TeamEmployeeRoleRef {
    id: string;
    name: string;
}

export interface TeamEmployeeListItem {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    hasAccount: boolean;
    /**
     * Null means three different things; read it together with `hasAccount`: no
     * account, an account with no role (signed in but locked out), or a caller
     * without permission to see roles.
     */
    role: TeamEmployeeRoleRef | null;
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
    userId: string | null;
    firstName: string;
    lastName: string;
    fullName: string;
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
    /** Provisions the login account in the same transaction. Requires `email`. */
    createAccount?: boolean;
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

/** Data collected by the "add employee" form: maps to a 3-step API flow. */
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
