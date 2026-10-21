// @vitest-environment jsdom
//
// Layout (Sidebar, liczniki, subskrypcja gniazda) nie może montować się od nowa przy
// zmianie strony. Dawniej strony bez wymagań (np. /settings) pomijały RequirePermission,
// więc przejście Kalendarz → Ustawienia → Kalendarz montowało Layout dwa razy, a z nim
// zapytania Sidebara i ponowną subskrypcję STOMP.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mounts = vi.hoisted(() => ({ layout: 0 }));

vi.mock('@/widgets/Layout', () => ({
    Layout: ({ children }: { children: ReactNode }) => {
        useEffect(() => { mounts.layout += 1; }, []);
        return <main>{children}</main>;
    },
}));
vi.mock('./components/ProtectedRoute', () => ({ ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'u1', permissions: null } }) }));
vi.mock('@/modules/subscription/components/ModuleGate', () => ({ ModuleGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/modules/comms/views/InboxRedirects', () => ({ LegacyLeadsRedirect: () => null, LegacyMailRedirect: () => null }));
vi.mock('@/modules/employees/employeesRoutes', () => ({ employeesTabRoutes: [] }));

import { page } from './router';

afterEach(() => {
    cleanup();
    mounts.layout = 0;
});

describe('page()', () => {
    it('trzyma jeden Layout przy przejściach między stronami z wymaganiem i bez', async () => {
        const router = createMemoryRouter([
            { path: '/calendar', element: page(<p>kalendarz</p>, 'VISITS_VIEW') },
            { path: '/settings', element: page(<p>ustawienia</p>) },
        ], { initialEntries: ['/calendar'] });
        render(<RouterProvider router={router} />);
        expect(screen.getByText('kalendarz')).toBeInTheDocument();

        await act(() => router.navigate('/settings'));
        expect(screen.getByText('ustawienia')).toBeInTheDocument();
        await act(() => router.navigate('/calendar'));
        expect(screen.getByText('kalendarz')).toBeInTheDocument();

        expect(mounts.layout).toBe(1);
    });
});
