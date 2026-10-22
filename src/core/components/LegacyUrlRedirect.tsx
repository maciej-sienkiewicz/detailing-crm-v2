// src/core/components/LegacyUrlRedirect.tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { translateLegacyUrl } from '../legacyUrls';

/**
 * Stary adres (polska trasa albo parametr z wysłanego pusha, e-maila, powrotu z OAuth)
 * zamienia na nowy, zanim wyrenderuje się ekran - patrz `legacyUrls.ts`. Podmiana idzie
 * w miejscu wpisu historii, więc „wstecz" nie wraca na stary adres.
 */
export function LegacyUrlRedirect({ children }: { children: ReactNode }) {
    const location = useLocation();
    const target = translateLegacyUrl(location.pathname, location.search);
    if (target) return <Navigate to={`${target}${location.hash}`} replace state={location.state} />;
    return <>{children}</>;
}
