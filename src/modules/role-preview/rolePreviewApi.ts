import { apiClient } from '@/core/apiClient';
import { sanitizeCatalog } from '@/modules/settings/api/permissionCatalog';
import type { PermissionModuleTree } from '@/modules/settings/rbacTypes';

// ─── Podgląd roli ────────────────────────────────────────────────────────────────
// Dwie strony tej samej funkcji:
// - prawdziwe studio (ustawienia ról): konfiguracja i otwarcie podglądu,
// - okno podglądu (osobny adres): wejście kodem, stan roli, zmiana uprawnień, koniec.
// Endpointy okna podglądu nie przyjmują żadnych identyfikatorów - backend zawsze
// działa na piaskownicy, do której należy sesja.

const BASE = '/v1/role-preview';

export interface RolePreviewConfig {
    enabled: boolean;
    previewBaseUrl: string | null;
}

export interface StartRolePreviewRequest {
    roleName: string;
    permissions: string[];
    trackWorkTime: boolean;
    /** Jednorazowy kod wejścia (32 losowe bajty, base64url) - ten sam, z którym otwarto okno. */
    entryCode: string;
}

export interface SimulatedEffect {
    channel: string;
    channelLabel: string;
    recipient: string | null;
    summary: string;
    at: string;
}

export interface RolePreviewState {
    roleName: string;
    /** Uprawnienia roli w piaskownicy teraz, domknięte po drzewie zależności. */
    permissions: string[];
    trackWorkTime: boolean;
    /** Uprawnienia w chwili otwarcia podglądu - rola z ustawień. */
    initialPermissions: string[];
    initialTrackWorkTime: boolean;
    enabledFeatures: string[];
    catalog: PermissionModuleTree[];
    openedByName: string;
    expiresAt: string;
    idleExpiresAt: string;
    simulatedEffects: SimulatedEffect[];
}

/**
 * Wywołania okna podglądu obsługują błędy same (ekran okna podglądu), więc bez ogólnego
 * komunikatu i bez przekierowania na logowanie - okno podglądu nie ma czego tam szukać.
 */
const shellCall = { skipErrorToast: true, skipAuthRedirect: true } as const;

const normalizeState = (state: RolePreviewState): RolePreviewState => ({
    ...state,
    catalog: sanitizeCatalog(state.catalog),
    simulatedEffects: state.simulatedEffects ?? [],
    enabledFeatures: state.enabledFeatures ?? [],
});

export const rolePreviewApi = {
    getConfig: async (): Promise<RolePreviewConfig> => {
        // Tło ustawień ról: brak uprawnień albo wyłączony podgląd kończą się po cichu brakiem przycisku.
        const res = await apiClient.get<RolePreviewConfig>(`${BASE}/config`, shellCall);
        return res.data;
    },

    start: async (payload: StartRolePreviewRequest): Promise<void> => {
        await apiClient.post(BASE, payload, { skipErrorToast: true });
    },

    enter: async (entryCode: string): Promise<void> => {
        await apiClient.post(`${BASE}/enter`, { entryCode }, shellCall);
    },

    current: async (): Promise<RolePreviewState> => {
        const res = await apiClient.get<RolePreviewState>(`${BASE}/current`, shellCall);
        return normalizeState(res.data);
    },

    updateRole: async (permissions: string[], trackWorkTime: boolean): Promise<RolePreviewState> => {
        const res = await apiClient.put<RolePreviewState>(`${BASE}/current/role`, { permissions, trackWorkTime }, shellCall);
        return normalizeState(res.data);
    },

    end: async (): Promise<void> => {
        await apiClient.delete(`${BASE}/current`, shellCall);
    },
};
