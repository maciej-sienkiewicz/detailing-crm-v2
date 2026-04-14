export type EmployeeStatus = 'ACTIVE' | 'TERMINATED';
export type ContractType = 'UOP' | 'UZ' | 'B2B';
export type BonusStatus = 'PENDING' | 'INCLUDED_IN_PAYROLL';
export type ComponentType = 'FIXED' | 'PERCENTAGE_OF_REVENUE' | 'HOURLY' | 'BONUS';
export type CalculationBase = 'GROSS_REVENUE' | 'NET_REVENUE' | 'HOURS_WORKED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
export type WorkTimeEntryType = 'REGULAR' | 'OVERTIME_150' | 'OVERTIME_200' | 'HOLIDAY_WORK' | 'NIGHT_WORK';
export type WorkTimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'SPECIAL' | 'PARENTAL' | 'CARE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';
export type EmploymentMode = 'SALARY' | 'HOURLY';
export type EtatFraction = 'FULL' | 'HALF' | 'QUARTER';

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

export interface SalaryBasis {
    monthlySalaryGrossCents: number | null;
    baseSalaryGrossCents: number | null;
    hourlyRateGrossCents: number | null;
    effectiveFrom: string;
    effectiveTo: string | null;
}

export interface EmploymentContract {
    id: string;
    contractType: ContractType;
    /** Filled for UOP (derived from initial compensation). Null for B2B / UZ HOURLY. */
    etatFraction: EtatFraction | null;
    startDate: string;
    endDate: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    isActive: boolean;
    documentFileId: string | null;
    createdAt: string;
    /** Active salary configuration for this contract. Null if no compensation is configured. */
    salaryBasis: SalaryBasis | null;
}

/**
 * Discriminated union for the compensation block carried by both contract
 * creation and amendments.
 *
 * - SALARY: always requires etatFraction + monthlySalaryGrossCents (UOP / UZ).
 * - HOURLY / GROSS: gross hourly rate for UZ contracts.
 * - HOURLY / NET: net hourly rate for B2B contracts (invoiced amount, no ZUS/tax deduction).
 */
export type InitialCompensation =
    | {
          employmentMode: 'SALARY';
          /** Billing-hours basis: 168 / 84 / 42 h per month. */
          etatFraction: EtatFraction;
          monthlySalaryGrossCents: number;
      }
    | {
          employmentMode: 'HOURLY';
          /** Gross hourly rate – used for UZ (Umowa zlecenie) contracts. */
          rateType: 'GROSS';
          hourlyRateGrossCents: number;
      }
    | {
          employmentMode: 'HOURLY';
          /** Net hourly rate – used for B2B contracts (invoice amount). */
          rateType: 'NET';
          hourlyRateNetCents: number;
      };

export interface CreateContractPayload {
    contractType: ContractType;
    startDate: string;
    endDate?: string | null;
    documentFileId?: string | null;
    /** Compensation is mandatory at contract creation. */
    initialCompensation: InitialCompensation;
}

// ─── Contract Amendments ──────────────────────────────────────────────────────

export interface ContractAmendment {
    id: string;
    contractId: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    employmentMode: EmploymentMode;
    etatFraction: EtatFraction | null;
    monthlySalaryGrossCents: number | null;
    /** Gross hourly rate – populated for UZ HOURLY amendments. */
    hourlyRateGrossCents: number | null;
    /** Net hourly rate – populated for B2B HOURLY amendments. */
    hourlyRateNetCents: number | null;
    createdAt: string;
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
    /** Gross hourly rate – populated for UZ HOURLY configs. */
    hourlyRateGrossCents: number | null;
    /** Net hourly rate – populated for B2B HOURLY configs. */
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
    /** Gross hourly rate – for UZ HOURLY contracts. */
    hourlyRateGrossCents?: number | null;
    /** Net hourly rate – for B2B HOURLY contracts. */
    hourlyRateNetCents?: number | null;
    baseSalaryGrossCents?: number | null;
    components: CompensationComponentPayload[];
}

// ─── Work Time ────────────────────────────────────────────────────────────────

/**
 * Status of a monthly timesheet period.
 * DRAFT    – entries being filled in, editable.
 * SUBMITTED – sent for approval, read-only for the employee.
 * APPROVED  – approved by manager, fully read-only.
 */
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';

/**
 * Non-standard benefit types that carry a rate multiplier different from REGULAR.
 * Maps 1-to-1 to WorkTimeEntryType values excluding REGULAR.
 */
export type BenefitType = 'OVERTIME_150' | 'OVERTIME_200' | 'NIGHT_WORK' | 'HOLIDAY_WORK' | 'ON_CALL';

/** Aggregated summary for a single monthly period, returned by the periods list endpoint. */
export interface WorkTimePeriodSummary {
    period: string;        // YYYY-MM
    totalHours: number;
    regularHours: number;
    benefitHours: number;
    status: TimesheetStatus;
    entriesCount: number;
}

/**
 * Payload for the simplified "save daily regular hours" endpoint.
 * The backend converts the hours value to a WorkTimeEntry (REGULAR type).
 * Sending hours = 0 removes any existing regular entry for that date.
 */
export interface SaveDailyHoursPayload {
    date: string;   // YYYY-MM-DD
    hours: number;  // decimal, e.g. 8.0 / 7.5
    notes?: string | null;
}

/** Payload for adding a non-standard benefit entry to a specific date. */
export interface AddWorkTimeBenefitPayload {
    date: string;              // YYYY-MM-DD
    benefitType: BenefitType;
    hours: number;
    notes?: string | null;
}

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

/** One regular-hours entry in a batch period save. */
export interface SavePeriodRegularEntry {
    date: string;    // YYYY-MM-DD
    hours: number;   // positive; omitting a date = delete its PENDING entry
}

/** One benefit-hours entry in a batch period save. */
export interface SavePeriodBenefitEntry {
    date: string;          // YYYY-MM-DD
    benefitType: BenefitType;
    hours: number;         // positive; omitting a date+type = delete its PENDING entry
}

/**
 * Payload for PUT /v1/employees/{id}/worktime/periods/{period}.
 * The backend atomically replaces all PENDING entries for the period with the
 * supplied lists. APPROVED / REJECTED entries are left untouched.
 */
export interface SavePeriodPayload {
    regular: SavePeriodRegularEntry[];
    benefits: SavePeriodBenefitEntry[];
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
    revenueGrossCents?: number | null;
    revenueNetCents?: number | null;
    notes?: string | null;
}

// ─── Bonuses ──────────────────────────────────────────────────────────────────

export interface BonusEntry {
    id: string;
    employeeId: string;
    period: string;
    name: string;
    amountCents: number;
    status: BonusStatus;
    payrollEntryId: string | null;
    notes: string | null;
    createdAt: string;
}

export interface CreateBonusPayload {
    period: string;
    name: string;
    amountCents: number;
    notes?: string | null;
}

export interface ConfirmPayrollPayload {
    markAsPaid?: boolean;
    totalNetCents?: number | null;
    employerCostTotalCents?: number | null;
}
