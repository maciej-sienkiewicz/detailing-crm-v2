import type { PermissionChanges } from '@/modules/settings/components/roles/PermissionTreeEditor';

/** Co jest w `current`, a nie było w `reference` (dodane) - i odwrotnie (odebrane). */
export function diffCodes(reference: Iterable<string>, current: Iterable<string>): PermissionChanges {
    const ref = new Set(reference);
    const cur = new Set(current);
    return {
        added: new Set([...cur].filter(c => !ref.has(c))),
        removed: new Set([...ref].filter(c => !cur.has(c))),
    };
}

export function sameSelection(a: Set<string>, b: Set<string>): boolean {
    return a.size === b.size && [...a].every(c => b.has(c));
}

export function changeCount(changes: PermissionChanges): number {
    return changes.added.size + changes.removed.size;
}

/** Podgląd kończy się wcześniej z dwóch terminów: końca życia albo bezczynności. */
export function effectiveExpiry(expiresAt: string, idleExpiresAt: string): Date {
    return new Date(Math.min(Date.parse(expiresAt), Date.parse(idleExpiresAt)));
}

export type DeviceMode = 'desktop' | 'tablet' | 'phone';

/** Szerokość ramki aplikacji: komputer - całe okno, tablet i telefon - typowe ekrany w pionie. */
export const DEVICE_WIDTH: Record<DeviceMode, number | null> = {
    desktop: null,
    tablet: 820,
    phone: 390,
};

export const DEVICE_LABEL: Record<DeviceMode, string> = {
    desktop: 'Komputer',
    tablet: 'Tablet',
    phone: 'Telefon',
};

/** Aplikacja w ramce trafiła na ekran logowania - sesja podglądu już nie istnieje. */
export function frameLostSession(pathname: string): boolean {
    return pathname === '/login' || pathname.startsWith('/login/');
}
