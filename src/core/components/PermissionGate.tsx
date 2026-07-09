import { ReactNode } from 'react';
import { usePermission } from '@/core/context/PermissionContext';
import { AccessDeniedView } from '@/common/components/AccessDeniedView';

interface PermissionGateProps {
    /** Single permission code required, OR... */
    permission?: string;
    /** ...at least one of these codes (OR semantics). */
    anyPermission?: string[];
    children: ReactNode;
}

/**
 * Renders children when the current user holds the required permission.
 * Otherwise renders the AccessDeniedView.
 *
 * Use this to wrap route element content in router.tsx so that a user who
 * types the URL directly is blocked at render-time, not only by menu hiding.
 */
export function PermissionGate({ permission, anyPermission, children }: PermissionGateProps) {
    const { hasPermission, hasAnyPermission } = usePermission();

    const allowed =
        (!permission || hasPermission(permission)) &&
        (!anyPermission || hasAnyPermission(anyPermission));

    if (!allowed) return <AccessDeniedView />;
    return <>{children}</>;
}
