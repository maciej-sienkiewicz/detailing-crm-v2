export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type ContractType = 'UOP' | 'UZ' | 'B2B';
export type BonusStatus = 'PENDING' | 'INCLUDED_IN_PAYROLL';
export type ComponentType = 'FIXED' | 'PERCENTAGE_OF_REVENUE' | 'HOURLY' | 'BONUS';
export type CalculationBase = 'GROSS_REVENUE' | 'NET_REVENUE' | 'HOURS_WORKED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
export type WorkTimeEntryType = 'REGULAR' | 'OVERTIME_150' | 'OVERTIME_200' | 'HOLIDAY_WORK' | 'NIGHT_WORK';
export type WorkTimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'SPECIAL' | 'PARENTAL' | 'CARE';
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';
export type EmploymentMode = 'SALARY' | 'HOURLY';
export type EtatFraction = 'FULL' | 'HALF' | 'QUARTER';

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    hasAccount: boolean;
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

export interface EmployeeAccountInfo {
    userId: string;
    roleId: string | null;
    isActive: boolean;
}

export interface EmployeeDetail {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    account: EmployeeAccountInfo | null;
    createdAt: string;
    updatedAt: string;
    // Pola planowane na kolejne iteracje modułu kadrowego — backend jeszcze ich nie zwraca
    personalEmail?: string | null;
    pesel?: string | null;
    nip?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressPostalCode?: string | null;
    position?: string;
    hireDate?: string;
    terminationDate?: string | null;
    status?: EmployeeStatus;
    notes?: string | null;
}

export interface CreateEmployeePayload {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    createAccount?: boolean;
    roleId?: string | null;
}

export interface UpdateEmployeePayload {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
}

export interface TerminateEmployeePayload {
    terminationDate: string;
    reason?: string | null;
}

export interface EmployeeFilters {
    search: string;
    page: number;
    limit: number;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface SalaryBasis {
    monthlySalaryGrossCents: number | null;
    baseSalaryGrossCents: number | null;
    hourlyRateGrossCents: number | null;
    hourlyRateNetCents: number | null;
    effectiveFrom: string;
    effectiveTo: string | null;
}

export interface EmploymentContract {
    id: string;
    contractType: ContractType;
    etatFraction: EtatFraction | null;
    startDate: string;
    endDate: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    isActive: boolean;
    documentFileId: string | null;
    createdAt: string;
    salaryBasis: SalaryBasis | null;
}

export type InitialCompensation =
    | {
          employmentMode: 'SALARY';
          etatFraction: EtatFraction;
          monthlySalaryGrossCents: number;
      }
    | {
          employmentMode: 'HOURLY';
          rateType: 'GROSS';
          hourlyRateGrossCents: number;
      }
    | {
          employmentMode: 'HOURLY';
          rateType: 'NET';
          hourlyRateNetCents: number;
      };

export interface CreateContractPayload {
    contractType: ContractType;
    startDate: string;
    endDate?: string | null;
    documentFileId?: string | null;
    initialCompensation: InitialCompensation;
}

// ─── Contract Amendments ──────────────────────────────────────────────────────

export interface ContractAmendment {
    id: string;
    effectiveFrom: string;
    monthlySalaryGrossCents: number | null;
    hourlyRateGrossCents: number | null;
    hourlyRateNetCents: number | null;
}

export interface CreateAmendmentPayload {
    effectiveFrom: string;
    compensation: InitialCompensation;
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
    employmentMode: EmploymentMode;
    etatFraction: EtatFraction | null;
    standardMonthlyHours: number | null;
    monthlySalaryGrossCents: number | null;
    baseSalaryGrossCents: number | null;
    hourlyRateGrossCents: number | null;
    hourlyRateNetCents: number | null;
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
    employmentMode: EmploymentMode;
    etatFraction?: EtatFraction | null;
    monthlySalaryGrossCents?: number | null;
    hourlyRateGrossCents?: number | null;
    hourlyRateNetCents?: number | null;
    baseSalaryGrossCents?: number | null;
    components: CompensationComponentPayload[];
}

// ─── Work Time ────────────────────────────────────────────────────────────────

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';

export type BenefitType = 'OVERTIME_150' | 'OVERTIME_200' | 'NIGHT_WORK' | 'HOLIDAY_WORK' | 'ON_CALL';

export interface WorkTimePeriodSummary {
    period: string;
    totalHours: number;
    status: TimesheetStatus;
}

export interface WorkTimeEntry {
    id: string;
    date: string;
    effectiveHours: number;
    entryType: WorkTimeEntryType;
    status: WorkTimeStatus;
    notes: string | null;
}

export interface SavePeriodRegularEntry {
    date: string;
    hours: number;
}

export interface SavePeriodBenefitEntry {
    date: string;
    benefitType: BenefitType;
    hours: number;
}

export interface SavePeriodPayload {
    regular: SavePeriodRegularEntry[];
    benefits: SavePeriodBenefitEntry[];
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

export interface EmployeeLeave {
    id: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    daysCount: number;
    note: string | null;
    createdAt: string;
}

export interface AddLeavePayload {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    note?: string | null;
}

export interface LeaveCalendarEmployee {
    id: string;
    fullName: string;
}

export interface LeaveCalendarDay {
    date: string;
    count: number;
    employees: LeaveCalendarEmployee[];
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollBreakdown {
    componentName: string;
    calculatedAmountCents: number;
}

export interface PayrollEntry {
    id: string;
    period: string;
    totalHoursWorked: number;
    componentBreakdown: PayrollBreakdown[];
    totalGrossCents: number;
    totalNetCents: number | null;
    employerCostTotalCents: number | null;
    status: PayrollStatus;
}

export interface GeneratePayrollPayload {
    period: string;
    revenueGrossCents?: number | null;
    revenueNetCents?: number | null;
    notes?: string | null;
}

export interface ConfirmPayrollPayload {
    markAsPaid?: boolean;
    totalNetCents?: number | null;
    employerCostTotalCents?: number | null;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface EmployeeDocument {
    id: string;
    name: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedByName: string;
}

export interface InitiateDocumentUploadPayload {
    name: string;
    fileName: string;
    contentType: string;
}

export interface InitiateDocumentUploadResponse {
    documentId: string;
    uploadUrl: string;
}

// ─── Bonuses ──────────────────────────────────────────────────────────────────

export interface BonusEntry {
    id: string;
    period: string;
    name: string;
    amountCents: number;
    status: BonusStatus;
    notes: string | null;
    createdAt: string;
}

export interface CreateBonusPayload {
    period: string;
    name: string;
    amountCents: number;
    notes?: string | null;
}
