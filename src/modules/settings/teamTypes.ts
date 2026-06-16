// ─── Team / Employees (Settings) ───────────────────────────────────────────────
// Types for the "Pracownicy" settings tab. Mirrors the RBAC / Employee API contract.

export type AccountRole = 'OWNER' | 'MANAGER' | 'DETAILER';

/** Roles that an administrator may assign when creating an account (never OWNER). */
export type AssignableAccountRole = Exclude<AccountRole, 'OWNER'>;

export type TeamEmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

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
    position: string;
    email: string | null;
    phone: string | null;
    status: TeamEmployeeStatus;
    hireDate: string;
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
    personalEmail: string | null;
    pesel: string | null;
    nip: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    position: string;
    hireDate: string;
    terminationDate: string | null;
    status: TeamEmployeeStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TeamEmployeeFilters {
    search: string;
    includeTerminated: boolean;
    page: number;
    limit: number;
}

export interface CreateEmployeeRequest {
    linkedUserId?: string | null;
    firstName: string;
    lastName: string;
    position: string;
    hireDate: string;
    phone?: string | null;
    email?: string | null;
    personalEmail?: string | null;
    pesel?: string | null;
    nip?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressPostalCode?: string | null;
    notes?: string | null;
    // Tworzenie konta razem z pracownikiem
    createAccount?: boolean;
    accountEmail?: string | null;
    accountRole?: AssignableAccountRole | null;
}

export interface UpdateEmployeeRequest {
    firstName: string;
    lastName: string;
    position: string;
    hireDate: string;
    phone?: string | null;
    email?: string | null;
    personalEmail?: string | null;
    pesel?: string | null;
    nip?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressPostalCode?: string | null;
    notes?: string | null;
}

export interface TerminateEmployeeRequest {
    terminationDate: string;
    reason?: string | null;
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
