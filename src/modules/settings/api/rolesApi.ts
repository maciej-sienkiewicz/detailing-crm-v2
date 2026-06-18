import { apiClient } from '@/core';
import type {
    PermissionModuleGroup,
    PermissionModuleKey,
    PermissionCatalogItem,
    Role,
    CreateRoleRequest,
    UpdateRoleRequest,
    CreateRoleResponse,
} from '../rbacTypes';

const BASE = '/v1/roles';

// ─── Permission catalog normalization ────────────────────────────────────────
// The permission catalog is produced by the backend and the frontend renders it
// in <RoleEditorModal>. If the backend field names drift from the expected shape
// (e.g. `name` instead of `displayName`, `items` instead of `permissions`), the
// rows still toggle (we read `code`) but every label comes back `undefined`, so
// the UI collapses into blank gray bars. To stay resilient we normalize the
// response into our canonical `PermissionModuleGroup[]` and log what we received
// so a mismatch is obvious in the console.

const pick = (obj: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

const asString = (value: unknown): string =>
    typeof value === 'string' ? value : value == null ? '' : String(value);

const normalizePermission = (raw: unknown): PermissionCatalogItem | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const code = asString(pick(obj, ['code', 'permissionCode', 'key', 'id', 'value']));
    if (!code) return null;
    const displayName = asString(
        pick(obj, ['displayName', 'name', 'label', 'permissionName', 'title', 'description']),
    );
    const requiresRaw = obj['requires'];
    const requires = Array.isArray(requiresRaw)
        ? requiresRaw.filter((r): r is string => typeof r === 'string')
        : [];
    return { code, displayName: displayName || code, requires };
};

const normalizeModule = (raw: unknown): PermissionModuleGroup | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    const module = asString(
        pick(obj, ['module', 'moduleKey', 'key', 'code', 'id']),
    ) as PermissionModuleKey;
    const displayName = asString(
        pick(obj, ['displayName', 'moduleDisplayName', 'name', 'label', 'title', 'moduleName']),
    );
    const featureKeyRaw = pick(obj, ['featureKey', 'feature', 'requiredFeature', 'featureCode']);
    const featureKey = typeof featureKeyRaw === 'string' && featureKeyRaw ? featureKeyRaw : null;

    const rawPermissions = pick(obj, ['permissions', 'items', 'permissionList', 'perms', 'children']);
    const permissions = Array.isArray(rawPermissions)
        ? rawPermissions.map(normalizePermission).filter((p): p is PermissionCatalogItem => p !== null)
        : [];

    if (!module && permissions.length === 0) return null;

    return {
        module: (module || displayName) as PermissionModuleKey,
        displayName: displayName || module,
        featureKey,
        permissions,
    };
};

/** Unwraps array responses that may be wrapped in an envelope object. */
const extractArray = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        for (const key of ['data', 'modules', 'groups', 'catalog', 'content', 'items', 'result']) {
            if (Array.isArray(obj[key])) return obj[key] as unknown[];
        }
    }
    return [];
};

const normalizePermissionCatalog = (data: unknown): PermissionModuleGroup[] => {
    const arr = extractArray(data);
    const normalized = arr
        .map(normalizeModule)
        .filter((m): m is PermissionModuleGroup => m !== null);

    // ── Diagnostics: surface the real backend shape vs. what we parsed ──────────
    const firstModule = arr[0] as Record<string, unknown> | undefined;
    const firstPermissionRaw = firstModule
        ? (pick(firstModule, ['permissions', 'items', 'permissionList', 'perms', 'children']) as unknown[] | undefined)?.[0]
        : undefined;
    console.log('[rolesApi] permission catalog — raw response:', data);
    console.log('[rolesApi] permission catalog — diagnostics:', {
        isArray: Array.isArray(data),
        topLevelType: data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data,
        rawModuleCount: arr.length,
        firstModuleKeys: firstModule ? Object.keys(firstModule) : null,
        firstPermissionKeys:
            firstPermissionRaw && typeof firstPermissionRaw === 'object'
                ? Object.keys(firstPermissionRaw as object)
                : null,
        normalizedModuleCount: normalized.length,
        normalizedPermissionCount: normalized.reduce((n, m) => n + m.permissions.length, 0),
    });

    if (arr.length > 0 && normalized.every(m => m.permissions.length === 0)) {
        console.warn(
            '[rolesApi] Permission catalog has modules but no permissions parsed — ' +
            'the backend permission field name likely differs from the expected ' +
            '`permissions[].{code,displayName}` shape. Inspect "raw response" above.',
        );
    }

    return normalized;
};

export const rolesApi = {
    getPermissionCatalog: async (): Promise<PermissionModuleGroup[]> => {
        const res = await apiClient.get(`${BASE}/permissions`);
        return normalizePermissionCatalog(res.data);
    },

    listRoles: async (): Promise<Role[]> => {
        const res = await apiClient.get<Role[]>(BASE);
        return res.data;
    },

    getRole: async (roleId: string): Promise<Role> => {
        const res = await apiClient.get<Role>(`${BASE}/${roleId}`);
        return res.data;
    },

    createRole: async (payload: CreateRoleRequest): Promise<CreateRoleResponse> => {
        const res = await apiClient.post<CreateRoleResponse>(BASE, payload);
        return res.data;
    },

    updateRole: async (roleId: string, payload: UpdateRoleRequest): Promise<Role> => {
        const res = await apiClient.put<Role>(`${BASE}/${roleId}`, payload);
        return res.data;
    },

    deleteRole: async (roleId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${roleId}`);
    },

    assignRole: async (userId: string, roleId: string | null): Promise<void> => {
        await apiClient.put(`${BASE}/assign/${userId}`, { roleId });
    },
};
