import { apiClient } from '@/core';
import type {
    TeamEmployeeFilters,
    TeamEmployeeListResponse,
    TeamEmployeeDetail,
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    CreateAccountRequest,
    CreateAccountResponse,
    ChangePasswordRequest,
} from '../teamTypes';

const BASE = '/v1/employees';

export const teamApi = {
    // ─── Employees ───────────────────────────────────────────────────────────

    listEmployees: async (filters: TeamEmployeeFilters): Promise<TeamEmployeeListResponse> => {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
        });
        if (filters.search.trim()) params.append('search', filters.search.trim());
        const res = await apiClient.get<TeamEmployeeListResponse>(`${BASE}?${params}`);
        return res.data;
    },

    getEmployee: async (employeeId: string): Promise<TeamEmployeeDetail> => {
        const res = await apiClient.get<TeamEmployeeDetail>(`${BASE}/${employeeId}`);
        return res.data;
    },

    createEmployee: async (payload: CreateEmployeeRequest): Promise<TeamEmployeeDetail> => {
        const res = await apiClient.post<TeamEmployeeDetail>(BASE, payload);
        return res.data;
    },

    updateEmployee: async (
        employeeId: string,
        payload: UpdateEmployeeRequest,
    ): Promise<TeamEmployeeDetail> => {
        const res = await apiClient.put<TeamEmployeeDetail>(`${BASE}/${employeeId}`, payload);
        return res.data;
    },

    deleteEmployee: async (employeeId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}`);
    },

    // ─── Accounts ────────────────────────────────────────────────────────────

    createAccount: async (
        employeeId: string,
        payload: CreateAccountRequest,
    ): Promise<CreateAccountResponse> => {
        const res = await apiClient.post<CreateAccountResponse>(
            `${BASE}/${employeeId}/account`,
            payload,
        );
        return res.data;
    },

    setAccountBlocked: async (employeeId: string, block: boolean): Promise<void> => {
        await apiClient.patch(`${BASE}/${employeeId}/account/block`, { block });
    },

    deleteAccount: async (employeeId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${employeeId}/account`);
    },

    changePassword: async (
        employeeId: string,
        payload: ChangePasswordRequest,
    ): Promise<void> => {
        await apiClient.post(`${BASE}/${employeeId}/account/change-password`, payload);
    },
};
