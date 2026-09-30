// src/core/components/RedirectWithParams.tsx
//
// Przekierowanie starego adresu z parametrem ścieżki na nowy, np.
// `/team/:employeeId` → `/employees/:employeeId`. Zwykłe <Navigate to="…"> nie
// podstawia parametrów, a stare linki krążą w zakładkach i mailach - nie mogą umrzeć.
// Zapytanie i kotwica jadą dalej bez zmian.

import { Navigate, generatePath, useLocation, useParams } from 'react-router-dom';

export function RedirectWithParams({ to }: { to: string }) {
    const params = useParams();
    const { search, hash } = useLocation();
    return <Navigate to={`${generatePath(to, params)}${search}${hash}`} replace />;
}
