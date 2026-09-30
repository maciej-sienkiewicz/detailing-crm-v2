// src/modules/employees/api/leaveRequestsApi.ts
//
// Wnioski urlopowe. Kontrakt: docs/api-leave-requests.md - nazwy pól 1:1.
//
// Dwie strony tego samego dokumentu:
//   - samoobsługa pracownika (`/v1/my/leave-requests`) - pracownik ustalany z sesji,
//     w ścieżce nie ma employeeId, więc nie da się złożyć wniosku za kogoś;
//   - rozpatrywanie (`/v1/leave-requests`) - właściciel albo EMPLOYEES_LEAVES_APPROVE.
//
// `skipErrorToast` stoi wszędzie tam, gdzie błąd pokazuje ekran, przy którym stoi
// użytkownik: 400 z `field` trafia do pola formularza, 409 przy podpisie odświeża
// dokument, 404 samoobsługi to „konto nie jest powiązane z pracownikiem". Bez flagi
// globalny dymek powtórzyłby to samo zdanie drugi raz, bez kontekstu.

import { apiClient } from '@/core/apiClient';
import type {
    CreateLeaveRequestPayload,
    CreateLeaveRequestResponse,
    LeaveDecisionPayload,
    LeaveRequestDetail,
    LeaveRequestPreview,
    LeaveRequestQueueResponse,
    LeaveRequestQueueStatus,
    MyLeaveRequestsResponse,
    SigningSession,
    SubmitLeaveRequestPayload,
} from '../types';

const MY = '/v1/my/leave-requests';
const QUEUE = '/v1/leave-requests';

/** Dokładne bajty PDF do podpisu i ich skrót z nagłówka (WYSIWYS). */
export interface LeaveDocument {
    bytes: ArrayBuffer;
    /** `X-Document-Sha256`; null, gdy przeglądarka nie dostała nagłówka. */
    sha256: string | null;
}

const fetchDocument = async (url: string): Promise<LeaveDocument> => {
    const res = await apiClient.get<ArrayBuffer>(url, { responseType: 'arraybuffer', skipErrorToast: true });
    const header = res.headers?.['x-document-sha256'];
    return { bytes: res.data, sha256: typeof header === 'string' ? header : null };
};

const fetchFile = async (url: string): Promise<Blob> => {
    const res = await apiClient.get(url, { responseType: 'blob', skipErrorToast: true });
    return res.data as Blob;
};

// ─── Samoobsługa pracownika ──────────────────────────────────────────────────

export const myLeaveRequestsApi = {
    list: async (): Promise<MyLeaveRequestsResponse> => {
        const res = await apiClient.get<MyLeaveRequestsResponse>(MY, { skipErrorToast: true });
        return res.data;
    },

    preview: async (startDate: string, endDate: string): Promise<LeaveRequestPreview> => {
        const res = await apiClient.get<LeaveRequestPreview>(`${MY}/preview`, {
            params: { startDate, endDate },
            skipErrorToast: true,
        });
        return res.data;
    },

    /** Tworzy szkic (DRAFT) z wygenerowanym PDF i jednorazową sesją podpisu. */
    create: async (payload: CreateLeaveRequestPayload): Promise<CreateLeaveRequestResponse> => {
        const res = await apiClient.post<CreateLeaveRequestResponse>(MY, payload, { skipErrorToast: true });
        return res.data;
    },

    /** Nowy challenge dla szkicu - po 409 albo po ponownym otwarciu kroku podpisu. */
    signingSession: async (id: string): Promise<SigningSession> => {
        const res = await apiClient.post<SigningSession>(`${MY}/${id}/signing-session`, undefined, { skipErrorToast: true });
        return res.data;
    },

    document: (id: string): Promise<LeaveDocument> => fetchDocument(`${MY}/${id}/document`),

    submit: async (id: string, payload: SubmitLeaveRequestPayload): Promise<LeaveRequestDetail> => {
        const res = await apiClient.post<LeaveRequestDetail>(`${MY}/${id}/submit`, payload, { skipErrorToast: true });
        return res.data;
    },

    /**
     * Z DRAFT albo PENDING. Porzucony szkic backend i tak usuwa po 24 h. Błąd zgłasza
     * wywołujący: kreator wycofuje szkice w tle i nie ma o czym mówić, a „Wycofaj"
     * na liście pokazuje własny dymek z tytułem.
     */
    withdraw: async (id: string): Promise<LeaveRequestDetail> => {
        const res = await apiClient.post<LeaveRequestDetail>(`${MY}/${id}/withdraw`, undefined, { skipErrorToast: true });
        return res.data;
    },

    /** Final, a przed decyzją - wersja podpisana przez pracownika. */
    file: (id: string): Promise<Blob> => fetchFile(`${MY}/${id}/file`),
};

// ─── Rozpatrywanie ───────────────────────────────────────────────────────────

export const leaveRequestsApi = {
    list: async (status: LeaveRequestQueueStatus, employeeId?: string): Promise<LeaveRequestQueueResponse> => {
        const res = await apiClient.get<LeaveRequestQueueResponse>(QUEUE, {
            params: { status, ...(employeeId ? { employeeId } : {}) },
            // Błąd wczytania pokazuje zakładka (Notice z „Spróbuj ponownie").
            skipErrorToast: true,
        });
        return res.data;
    },

    /** Oczekujące, które bieżący użytkownik może rozpatrzyć (bez własnych) - licznik w panelu. */
    pendingCount: async (): Promise<number> => {
        const res = await apiClient.get<{ count: number }>(`${QUEUE}/pending-count`, { skipAuthRedirect: true });
        return res.data.count;
    },

    get: async (id: string): Promise<LeaveRequestDetail> => {
        const res = await apiClient.get<LeaveRequestDetail>(`${QUEUE}/${id}`, { skipErrorToast: true });
        return res.data;
    },

    /** Sesja podpisu decyzji - dla wersji podpisanej przez pracownika. */
    decisionSession: async (id: string): Promise<SigningSession> => {
        const res = await apiClient.post<SigningSession>(`${QUEUE}/${id}/decision-session`, undefined, { skipErrorToast: true });
        return res.data;
    },

    /** Wersja podpisana przez pracownika - dokładnie to, co podpisuje rozpatrujący. */
    document: (id: string): Promise<LeaveDocument> => fetchDocument(`${QUEUE}/${id}/document`),

    approve: async (id: string, payload: LeaveDecisionPayload): Promise<LeaveRequestDetail> => {
        const res = await apiClient.post<LeaveRequestDetail>(`${QUEUE}/${id}/approve`, payload, { skipErrorToast: true });
        return res.data;
    },

    reject: async (id: string, payload: LeaveDecisionPayload): Promise<LeaveRequestDetail> => {
        const res = await apiClient.post<LeaveRequestDetail>(`${QUEUE}/${id}/reject`, payload, { skipErrorToast: true });
        return res.data;
    },

    cancel: async (id: string, reason: string): Promise<LeaveRequestDetail> => {
        const res = await apiClient.post<LeaveRequestDetail>(`${QUEUE}/${id}/cancel`, { reason }, { skipErrorToast: true });
        return res.data;
    },

    file: (id: string): Promise<Blob> => fetchFile(`${QUEUE}/${id}/file`),
};

// ─── Błędy ───────────────────────────────────────────────────────────────────

/** Ciało błędu z backendu: `{ error, message, timestamp, field }`. */
export interface LeaveApiError {
    status: number | null;
    message: string | null;
    /** Pole żądania, którego dotyczy błąd walidacji (400); null, gdy dotyczy całości. */
    field: string | null;
}

export function leaveApiError(error: unknown): LeaveApiError {
    const response = (error as { response?: { status?: number; data?: unknown } })?.response;
    const data = response?.data;
    const body = data && typeof data === 'object' && !(data instanceof ArrayBuffer) && !(data instanceof Blob)
        ? data as { message?: unknown; field?: unknown }
        : {};
    return {
        status: response?.status ?? null,
        message: typeof body.message === 'string' ? body.message : null,
        field: typeof body.field === 'string' ? body.field : null,
    };
}
