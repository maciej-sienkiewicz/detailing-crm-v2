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
    WorkTimePeriodSummary,
    SavePeriodPayload,
    EmployeeLeave,
    AddLeavePayload,
    LeaveCalendarDay,
    PayrollEntry,
    GeneratePayrollPayload,
    ConfirmPayrollPayload,
    BonusEntry,
    CreateBonusPayload,
    EmployeeDocument,
    InitiateDocumentUploadPayload,
    InitiateDocumentUploadResponse,
} from '../types';

const BASE = '/v1/employees';

export const employeeApi = {
    // ─── Employees ───────────────────────────────────────────────────────────

    listEmployees: async (filters: EmployeeFilters): Promise<EmployeeListResponse> => {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
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
        payload: CreateAmendmentPayload,
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

    getWorkTimePeriods: async (employeeId: string): Promise<WorkTimePeriodSummary[]> => {
        const res = await apiClient.get<WorkTimePeriodSummary[]>(`${BASE}/${employeeId}/worktime/periods`);
        return res.data;
    },

    deleteWorkTimeEntry: async (employeeId: string, entryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/worktime/${entryId}`);
    },

    savePeriodWorkTime: async (
        employeeId: string,
        period: string,
        payload: SavePeriodPayload,
    ): Promise<void> => {
        await apiClient.put(`${BASE}/${employeeId}/worktime/periods/${period}`, payload);
    },

    submitPeriodForBilling: async (employeeId: string, period: string): Promise<void> => {
        await apiClient.post(`${BASE}/${employeeId}/worktime/periods/${period}/submit`);
    },

    // ─── Leaves ───────────────────────────────────────────────────────────────

    listLeaves: async (employeeId: string): Promise<EmployeeLeave[]> => {
        const res = await apiClient.get<EmployeeLeave[]>(`${BASE}/${employeeId}/leaves`);
        return res.data;
    },

    addLeave: async (employeeId: string, payload: AddLeavePayload): Promise<{ leaveId: string }> => {
        const res = await apiClient.post<{ leaveId: string }>(`${BASE}/${employeeId}/leaves`, payload);
        return res.data;
    },

    deleteLeave: async (employeeId: string, leaveId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/leaves/${leaveId}`);
    },

    /** Dzienna liczba pracowników na urlopie w zakresie dat (dla widoku kalendarza). */
    getLeaveCalendar: async (from: string, to: string): Promise<LeaveCalendarDay[]> => {
        const res = await apiClient.get<LeaveCalendarDay[]>(`${BASE}/leaves/calendar?from=${from}&to=${to}`);
        return res.data;
    },

    // ─── Payroll ──────────────────────────────────────────────────────────────

    listPayroll: async (employeeId: string): Promise<PayrollEntry[]> => {
        const res = await apiClient.get<PayrollEntry[]>(`${BASE}/${employeeId}/payroll`);
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

    // ─── Documents ────────────────────────────────────────────────────────────

    listDocuments: async (employeeId: string): Promise<EmployeeDocument[]> => {
        const res = await apiClient.get<EmployeeDocument[]>(`${BASE}/${employeeId}/documents`);
        return res.data;
    },

    initiateDocumentUpload: async (
        employeeId: string,
        payload: InitiateDocumentUploadPayload,
    ): Promise<InitiateDocumentUploadResponse> => {
        const res = await apiClient.post<InitiateDocumentUploadResponse>(
            `${BASE}/${employeeId}/documents`,
            payload,
        );
        return res.data;
    },

    getDocumentPreviewUrl: async (employeeId: string, documentId: string): Promise<string> => {
        const res = await apiClient.get<{ url: string }>(`${BASE}/${employeeId}/documents/${documentId}/preview`);
        return res.data.url;
    },

    getDocumentDownloadUrl: async (employeeId: string, documentId: string): Promise<string> => {
        const res = await apiClient.get<{ url: string }>(`${BASE}/${employeeId}/documents/${documentId}/download`);
        return res.data.url;
    },

    deleteDocument: async (employeeId: string, documentId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/documents/${documentId}`);
    },
};
