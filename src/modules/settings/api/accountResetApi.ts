import { apiClient } from '@/core';

const BASE_PATH = '/v1/company/reset';

export type AccountResetStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AccountResetJob {
    jobId: string;
    status: AccountResetStatus;
    currentStep: number;
    totalSteps: number;
    currentStepName: string | null;
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
}

export interface StartAccountResetRequest {
    currentPassword: string;
    confirmationName: string;
    wipeCompanyData: boolean;
}

export const accountResetApi = {
    // Błędy startu (złe hasło, zła nazwa, reset w toku) pokazuje modal przy polu,
    // nie globalny toast — stąd skipErrorToast.
    startReset: async (data: StartAccountResetRequest): Promise<AccountResetJob> => {
        const response = await apiClient.post<AccountResetJob>(BASE_PATH, data, {
            skipErrorToast: true,
        });
        return response.data;
    },

    // Poll statusu to wywołanie w tle: nie może wybić na /login ani sypać toastami,
    // gdy pojedynczy odczyt się nie powiedzie.
    getStatus: async (jobId: string): Promise<AccountResetJob> => {
        const response = await apiClient.get<AccountResetJob>(`${BASE_PATH}/${jobId}`, {
            skipErrorToast: true,
            skipAuthRedirect: true,
        });
        return response.data;
    },

    /** Ostatni job studia — pozwala podjąć trwający reset po odświeżeniu strony. */
    getLatest: async (): Promise<AccountResetJob | null> => {
        const response = await apiClient.get<AccountResetJob | null>(`${BASE_PATH}/latest`, {
            skipErrorToast: true,
        });
        return response.data ?? null;
    },
};
