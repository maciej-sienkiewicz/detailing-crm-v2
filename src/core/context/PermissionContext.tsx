import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PermissionContextType {
    /** Returns true if the current user has the given permission code.
     *  null permissions (owner) always returns true. */
    hasPermission: (code: string) => boolean;
    /** Returns true if the user has at least one of the given permission codes. */
    hasAnyPermission: (codes: string[]) => boolean;
    /** True when user is owner (null permissions = unrestricted). */
    isOwner: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    const isOwner = user?.permissions === null || user?.permissions === undefined;

    const hasPermission = (code: string): boolean => {
        if (isOwner) return true;
        return user?.permissions?.includes(code) ?? false;
    };

    const hasAnyPermission = (codes: string[]): boolean => {
        if (isOwner) return true;
        return codes.some(code => user?.permissions?.includes(code) ?? false);
    };

    return (
        <PermissionContext.Provider value={{ hasPermission, hasAnyPermission, isOwner }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermission() {
    const ctx = useContext(PermissionContext);
    if (!ctx) throw new Error('usePermission must be used within PermissionProvider');
    return ctx;
}
