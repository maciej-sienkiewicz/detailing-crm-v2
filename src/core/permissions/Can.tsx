import { ReactNode } from 'react';
import type { PermissionRequirement } from './catalog';
import { usePermissions } from './usePermissions';

interface CanProps {
    /** Single code or ANY-OF list required to render the children. */
    anyOf: PermissionRequirement;
    /** Rendered when the permission is missing (default: nothing). */
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Component-level permission gate for buttons, table columns, tabs etc.
 * Renders nothing (or `fallback`) when the user lacks the permission —
 * the UI hides capabilities instead of showing "no access" errors.
 *
 *   <Can anyOf="VISITS_DELETE"><DeleteVisitButton /></Can>
 */
export function Can({ anyOf, fallback = null, children }: CanProps) {
    const { can } = usePermissions();
    return <>{can(anyOf) ? children : fallback}</>;
}
