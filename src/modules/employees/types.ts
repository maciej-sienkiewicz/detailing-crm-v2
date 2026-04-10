export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type ContractType = 'UOP' | 'UZ' | 'B2B';
export type ComponentType = 'FIXED' | 'PERCENTAGE_OF_REVENUE' | 'HOURLY' | 'BONUS';
export type CalculationBase = 'GROSS_REVENUE' | 'NET_REVENUE' | 'HOURS_WORKED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
export type WorkTimeEntryType = 'REGULAR' | 'OVERTIME_150' | 'OVERTIME_200' | 'HOLIDAY_WORK' | 'NIGHT_WORK';
export type WorkTimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'SPECIAL' | 'PARENTAL' | 'CARE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: string;
    email: string | null;
    phone: string | null;
    status: EmployeeStatus;
    hireDate: string;
    linkedUserId: string | null;
}

export interface EmployeePaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface EmployeeListResponse {
    items: EmployeeListItem[];
    pagination: EmployeePaginationInfo;
}

export interface EmployeeDetail {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    linkedUserId: string | null;
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
    status: EmployeeStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEmployeePayload {
    linkedUserId?: string | null;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    personalEmail?: string | null;
    pesel?: string | null;
    nip?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressPostalCode?: string | null;
    position: string;
    hireDate: string;
    notes?: string | null;
}

export type UpdateEmployeePayload = CreateEmployeePayload;

export interface TerminateEmployeePayload {
    terminationDate: string;
    reason?: string | null;
}

export interface EmployeeFilters {
    search: string;
    includeTerminated: boolean;
    page: number;
    limit: number;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface EmploymentContract {
    id: string;
    contractType: ContractType;
    startDate: string;
    endDate: string | null;
    workingHoursPerWeek: number;
    trialPeriodEndDate: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    isActive: boolean;
    documentFileId: string | null;
    createdAt: string;
}

export interface CreateContractPayload {
    contractType: ContractType;
    startDate: string;
    endDate?: string | null;
    workingHoursPerWeek: number;
    trialPeriodEndDate?: string | null;
    documentFileId?: string | null;
}

export interface EndContractPayload {
    terminationDate: string;
    terminationReason?: string | null;
}

// ─── Compensation ─────────────────────────────────────────────────────────────

export interface Threshold {
    minValueCents: number;
    maxValueCents: number | null;
    rate: number;
}

export interface CompensationComponent {
    id: string;
    name: string;
    type: ComponentType;
    calculationBase: CalculationBase | null;
    value: number;
    frequency: PaymentFrequency;
    isActive: boolean;
    description: string | null;
}

export interface CompensationConfig {
    id: string;
    contractId: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    baseSalaryGrossCents: number | null;
    hourlyRateGrossCents: number | null;
    components: CompensationComponent[];
    createdAt: string;
}

export interface CompensationComponentPayload {
    name: string;
    type: ComponentType;
    calculationBase?: CalculationBase | null;
    value: number;
    thresholds: Threshold[];
    frequency: PaymentFrequency;
    isActive: boolean;
    description?: string | null;
}

export interface SetCompensationPayload {
    contractId: string;
    effectiveFrom: string;
    baseSalaryGrossCents?: number | null;
    hourlyRateGrossCents?: number | null;
    components: CompensationComponentPayload[];
}

// ─── Work Time ────────────────────────────────────────────────────────────────

export interface WorkTimeEntry {
    id: string;
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    effectiveHours: number;
    entryType: WorkTimeEntryType;
    overtimeMultiplier: number;
    status: WorkTimeStatus;
    notes: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
}

export interface WorkTimeSummary {
    employeeId: string;
    period: string;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    approvedHours: number;
    pendingHours: number;
    entriesCount: number;
}

export interface LogWorkTimePayload {
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    entryType: WorkTimeEntryType;
    notes?: string | null;
}

export interface ApproveWorkTimePayload {
    approve: boolean;
    rejectionReason?: string | null;
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    businessDaysCount: number;
    status: LeaveStatus;
    reason: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    createdAt: string;
}

export interface LeaveBalance {
    id: string;
    employeeId: string;
    year: number;
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    carriedOverDays: number;
    adjustmentDays: number;
    remainingDays: number;
    notes: string | null;
    updatedAt: string;
}

export interface RequestLeavePayload {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string | null;
}

export interface ReviewLeavePayload {
    approve: boolean;
    reviewNote?: string | null;
}

export interface InitLeaveBalancePayload {
    year: number;
    totalDays: number;
    carriedOverDays?: number;
    adjustmentDays?: number;
    notes?: string | null;
}

export interface AdjustLeaveBalancePayload {
    year: number;
    adjustmentDays: number;
    notes?: string | null;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollBreakdown {
    componentName: string;
    calculatedAmountCents: number;
    calculationDetails: string;
}

export interface PayrollEntry {
    id: string;
    employeeId: string;
    contractId: string;
    period: string;
    baseSalaryGrossCents: number;
    totalHoursWorked: number;
    componentBreakdown: PayrollBreakdown[];
    totalGrossCents: number;
    totalNetCents: number | null;
    employerCostTotalCents: number | null;
    status: PayrollStatus;
    notes: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdAt: string;
}

export interface GeneratePayrollPayload {
    period: string;
    notes?: string | null;
}

export interface ConfirmPayrollPayload {
    markAsPaid?: boolean;
    totalNetCents?: number | null;
    employerCostTotalCents?: number | null;
}
