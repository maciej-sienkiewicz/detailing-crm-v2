// src/modules/badges/useBadge.ts
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/core/permissions';
import { badgesQuery, type Badges } from './badgesQuery';

/**
 * Jeden licznik z GET /v1/me/badges. Wszystkie plakietki (menu, dolna nawigacja, zakładki)
 * dzielą jedno zapytanie; rola bez żadnego z modułów nie wysyła go wcale.
 */
export const useBadge = (field: keyof Badges, options?: { enabled?: boolean }): number => {
    const { can } = usePermissions();
    const anyBadge = can(['LEADS_MANAGE', 'EMPLOYEES_LEAVES_APPROVE', 'EMPLOYEES_MANAGE']);
    const { data } = useQuery({
        ...badgesQuery(),
        select: badges => badges[field] ?? 0,
        enabled: anyBadge && (options?.enabled ?? true),
    });
    return data ?? 0;
};
