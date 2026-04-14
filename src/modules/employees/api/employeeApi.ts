import { apiClient } from '@/core/apiClient';
import type {
    EmployeeFilters,
    EmployeeListResponse,
    EmployeeDetail,
    CreateEmployeePayload,
    UpdateEmployeePayload,
    TerminateEmployeePayload,
    EmploymentContract,
    CreateContractPayload,
    EndContractPayload,
    ContractAmendment,
    CreateAmendmentPayload,
    CompensationConfig,
    SetCompensationPayload,
    WorkTimeEntry,
    WorkTimeSummary,
    WorkTimePeriodSummary,
    LogWorkTimePayload,
    ApproveWorkTimePayload,
    SaveDailyHoursPayload,
    AddWorkTimeBenefitPayload,
    SavePeriodPayload,
    LeaveRequest,
    LeaveBalance,
    RequestLeavePayload,
    ReviewLeavePayload,
    InitLeaveBalancePayload,
    AdjustLeaveBalancePayload,
    PayrollEntry,
    GeneratePayrollPayload,
    ConfirmPayrollPayload,
    BonusEntry,
    CreateBonusPayload,
} from '../types';

const BASE = '/v1/employees';

export const employeeApi = {
    // ─── Employees ───────────────────────────────────────────────────────────

    listEmployees: async (filters: EmployeeFilters): Promise<EmployeeListResponse> => {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
            includeTerminated: filters.includeTerminated.toString(),
        });
        if (filters.search) params.append('search', filters.search);
        const res = await apiClient.get<EmployeeListResponse>(`${BASE}?${params}`);
        return res.data;
    },

    getEmployee: async (employeeId: string): Promise<EmployeeDetail> => {
        const res = await apiClient.get<EmployeeDetail>(`${BASE}/${employeeId}`);
        return res.data;
    },

    createEmployee: async (payload: CreateEmployeePayload): Promise<EmployeeDetail> => {
        const res = await apiClient.post<EmployeeDetail>(BASE, payload);
        return res.data;
    },

    updateEmployee: async (employeeId: string, payload: UpdateEmployeePayload): Promise<EmployeeDetail> => {
        const res = await apiClient.put<EmployeeDetail>(`${BASE}/${employeeId}`, payload);
        return res.data;
    },

    terminateEmployee: async (employeeId: string, payload: TerminateEmployeePayload): Promise<void> => {
        await apiClient.post(`${BASE}/${employeeId}/terminate`, payload);
    },

    // ─── Contracts ───────────────────────────────────────────────────────────

    listContracts: async (employeeId: string): Promise<EmploymentContract[]> => {
        const res = await apiClient.get<EmploymentContract[]>(`${BASE}/${employeeId}/contracts`);
        return res.data;
    },

    createContract: async (employeeId: string, payload: CreateContractPayload): Promise<{ contractId: string }> => {
        const res = await apiClient.post<{ contractId: string }>(`${BASE}/${employeeId}/contracts`, payload);
        return res.data;
    },

    endContract: async (employeeId: string, contractId: string, payload: EndContractPayload): Promise<void> => {
        await apiClient.post(`${BASE}/${employeeId}/contracts/${contractId}/end`, payload);
    },

    listAmendments: async (employeeId: string, contractId: string): Promise<ContractAmendment[]> => {
        const res = await apiClient.get<ContractAmendment[]>(
            `${BASE}/${employeeId}/contracts/${contractId}/amendments`
        );
        return res.data;
    },

    createAmendment: async (
        employeeId: string,
        contractId: string,
        payload: CreateAmendmentPayload
    ): Promise<{ amendmentId: string }> => {
        const res = await apiClient.post<{ amendmentId: string }>(
            `${BASE}/${employeeId}/contracts/${contractId}/amendments`,
            payload
        );
        return res.data;
    },

    // ─── Compensation ─────────────────────────────────────────────────────────

    getCurrentCompensation: async (employeeId: string): Promise<CompensationConfig | null> => {
        const res = await apiClient.get<CompensationConfig | null>(`${BASE}/${employeeId}/compensation`);
        return res.data;
    },

    getCompensationHistory: async (employeeId: string): Promise<CompensationConfig[]> => {
        const res = await apiClient.get<CompensationConfig[]>(`${BASE}/${employeeId}/compensation/history`);
        return res.data;
    },

    setCompensation: async (employeeId: string, payload: SetCompensationPayload): Promise<{ configId: string }> => {
        const res = await apiClient.post<{ configId: string }>(`${BASE}/${employeeId}/compensation`, payload);
        return res.data;
    },

    // ─── Work Time ────────────────────────────────────────────────────────────

    listWorkTime: async (employeeId: string, from?: string, to?: string): Promise<WorkTimeEntry[]> => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const query = params.toString();
        const res = await apiClient.get<WorkTimeEntry[]>(`${BASE}/${employeeId}/worktime${query ? `?${query}` : ''}`);
        return res.data;
    },

    listPendingWorkTime: async (): Promise<WorkTimeEntry[]> => {
        const res = await apiClient.get<WorkTimeEntry[]>(`${BASE}/worktime/pending`);
        return res.data;
    },

    getWorkTimeSummary: async (employeeId: string, period: string): Promise<WorkTimeSummary> => {
        const res = await apiClient.get<WorkTimeSummary>(`${BASE}/${employeeId}/worktime/summary?period=${period}`);
        return res.data;
    },

    logWorkTime: async (employeeId: string, payload: LogWorkTimePayload): Promise<{ entryId: string }> => {
        const res = await apiClient.post<{ entryId: string }>(`${BASE}/${employeeId}/worktime`, payload);
        return res.data;
    },

    approveWorkTime: async (entryId: string, payload: ApproveWorkTimePayload): Promise<void> => {
        await apiClient.post(`${BASE}/worktime/${entryId}/approve`, payload);
    },

    /**
     * Returns a chronological list of all monthly periods (from hire date to
     * current month) together with aggregated totals and status.
     * New endpoint: GET /v1/employees/{id}/worktime/periods
     */
    getWorkTimePeriods: async (employeeId: string): Promise<WorkTimePeriodSummary[]> => {
        const res = await apiClient.get<WorkTimePeriodSummary[]>(`${BASE}/${employeeId}/worktime/periods`);
        return res.data;
    },

    /**
     * Creates or replaces the single REGULAR work-time entry for a given date.
     * Sending hours = 0 removes any existing regular entry for that date.
     * New endpoint: POST /v1/employees/{id}/worktime/daily
     */
    saveDailyHours: async (employeeId: string, payload: SaveDailyHoursPayload): Promise<{ entryId: string | null }> => {
        const res = await apiClient.post<{ entryId: string | null }>(`${BASE}/${employeeId}/worktime/daily`, payload);
        return res.data;
    },

    /**
     * Creates a benefit (non-REGULAR) work-time entry for a specific date.
     * New endpoint: POST /v1/employees/{id}/worktime/benefit
     */
    addWorkTimeBenefit: async (employeeId: string, payload: AddWorkTimeBenefitPayload): Promise<{ entryId: string }> => {
        const res = await apiClient.post<{ entryId: string }>(`${BASE}/${employeeId}/worktime/benefit`, payload);
        return res.data;
    },

    /**
     * Deletes a work-time entry (regular or benefit) by its ID.
     * New endpoint: DELETE /v1/employees/{id}/worktime/{entryId}
     */
    deleteWorkTimeEntry: async (employeeId: string, entryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/worktime/${entryId}`);
    },

    /**
     * Atomically saves all regular and benefit entries for a monthly period.
     * The backend replaces all PENDING entries for the period; APPROVED / REJECTED
     * entries are left untouched.
     * New endpoint: PUT /v1/employees/{id}/worktime/periods/{period}
     */
    savePeriodWorkTime: async (
        employeeId: string,
        period: string,
        payload: SavePeriodPayload,
    ): Promise<void> => {
        await apiClient.put(`${BASE}/${employeeId}/worktime/periods/${period}`, payload);
    },

    // ─── Leaves ───────────────────────────────────────────────────────────────

    listLeaves: async (employeeId: string): Promise<LeaveRequest[]> => {
        const res = await apiClient.get<LeaveRequest[]>(`${BASE}/${employeeId}/leaves`);
        return res.data;
    },

    listPendingLeaves: async (): Promise<LeaveRequest[]> => {
        const res = await apiClient.get<LeaveRequest[]>(`${BASE}/leaves/pending`);
        return res.data;
    },

    requestLeave: async (employeeId: string, payload: RequestLeavePayload): Promise<{ leaveRequestId: string }> => {
        const res = await apiClient.post<{ leaveRequestId: string }>(`${BASE}/${employeeId}/leaves`, payload);
        return res.data;
    },

    reviewLeave: async (leaveRequestId: string, payload: ReviewLeavePayload): Promise<void> => {
        await apiClient.post(`${BASE}/leaves/${leaveRequestId}/review`, payload);
    },

    getLeaveBalance: async (employeeId: string, year?: number): Promise<LeaveBalance | LeaveBalance[]> => {
        const query = year ? `?year=${year}` : '';
        const res = await apiClient.get<LeaveBalance | LeaveBalance[]>(`${BASE}/${employeeId}/leave-balance${query}`);
        return res.data;
    },

    initLeaveBalance: async (employeeId: string, payload: InitLeaveBalancePayload): Promise<LeaveBalance> => {
        const res = await apiClient.post<LeaveBalance>(`${BASE}/${employeeId}/leave-balance`, payload);
        return res.data;
    },

    adjustLeaveBalance: async (employeeId: string, payload: AdjustLeaveBalancePayload): Promise<LeaveBalance> => {
        const res = await apiClient.patch<LeaveBalance>(`${BASE}/${employeeId}/leave-balance/adjust`, payload);
        return res.data;
    },

    // ─── Payroll ──────────────────────────────────────────────────────────────

    listPayroll: async (employeeId: string): Promise<PayrollEntry[]> => {
        const res = await apiClient.get<PayrollEntry[]>(`${BASE}/${employeeId}/payroll`);
        return res.data;
    },

    listPayrollForPeriod: async (period: string): Promise<PayrollEntry[]> => {
        const res = await apiClient.get<PayrollEntry[]>(`${BASE}/payroll?period=${period}`);
        return res.data;
    },

    generatePayroll: async (employeeId: string, payload: GeneratePayrollPayload): Promise<{ payrollId: string }> => {
        const res = await apiClient.post<{ payrollId: string }>(`${BASE}/${employeeId}/payroll/generate`, payload);
        return res.data;
    },

    confirmPayroll: async (payrollId: string, payload: ConfirmPayrollPayload): Promise<void> => {
        await apiClient.post(`${BASE}/payroll/${payrollId}/confirm`, payload);
    },

    // ─── Bonuses ──────────────────────────────────────────────────────────────

    listBonuses: async (employeeId: string, period?: string): Promise<BonusEntry[]> => {
        const query = period ? `?period=${period}` : '';
        const res = await apiClient.get<BonusEntry[]>(`${BASE}/${employeeId}/bonuses${query}`);
        return res.data;
    },

    createBonus: async (employeeId: string, payload: CreateBonusPayload): Promise<{ bonusEntryId: string }> => {
        const res = await apiClient.post<{ bonusEntryId: string }>(`${BASE}/${employeeId}/bonuses`, payload);
        return res.data;
    },

    deleteBonus: async (employeeId: string, bonusEntryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/bonuses/${bonusEntryId}`);
    },
};
