// @vitest-environment jsdom
//
// Tablicę otwiera każde uprawnienie z ANY_DASHBOARD, ale statystyki, podpowiedzi,
// rezerwacje i najbliższe wizyty są na serwerze za VISITS_VIEW. Rola bez niego
// dostawała przy nich 403 - statystyki co 30 s, z kolejnym /auth/me za każdym razem.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { DashboardView } from './DashboardView';

const access = vi.hoisted(() => ({ permissions: [] as string[], pii: true }));
const useDashboard = vi.hoisted(() => vi.fn(() => ({ stats: undefined, isError: false, refetch: vi.fn() })));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({
        can: (required: string | string[]) =>
            (Array.isArray(required) ? required : [required]).some(code => access.permissions.includes(code)),
    }),
    usePersonalDataActions: () => ({ canCreateVisit: false }),
}));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { firstName: 'Anna' } }) }));
vi.mock('@/common/hooks', () => ({ useBreakpoint: () => true }));
vi.mock('@/common/pii', () => ({ usePiiAccess: () => access.pii }));
vi.mock('@/modules/worktime', () => ({ ReportWorkdayButton: () => null }));
vi.mock('@/modules/comms/hooks/useComms', () => ({ useMailAccounts: () => ({ data: undefined }) }));
vi.mock('@/modules/competition-monitoring/components/GeneratePostModal', () => ({ GeneratePostModal: () => null }));
vi.mock('../hooks', () => ({ useDashboard, useDashboardSocket: vi.fn() }));
vi.mock('../components/OperationalScorecard', () => ({ OperationalScorecard: () => <p>statystyki</p> }));
vi.mock('../components/UpcomingVisitsPanel', () => ({ UpcomingVisitsPanel: () => <p>najbliższe wizyty</p> }));
vi.mock('../components/TasksPanel', () => ({ TasksPanel: () => <p>zadania</p> }));
vi.mock('../components/RevenueKpiCard', () => ({ RevenueKpiCard: () => <p>przychód</p> }));
vi.mock('../components/ReservationsKpiCard', () => ({ ReservationsKpiCard: () => <p>rezerwacje</p> }));
vi.mock('../components/LeadsWaitingKpi', () => ({ LeadsWaitingKpi: () => null }));
vi.mock('../components/mailSetup/MailSetupKpi', () => ({ MailSetupKpi: () => null }));
vi.mock('../components/DashboardHintsBar', () => ({ DashboardHintsBar: () => <p>podpowiedzi</p> }));

const renderView = () => render(
    <MemoryRouter>
        <ThemeProvider theme={theme}>
            <DashboardView />
        </ThemeProvider>
    </MemoryRouter>,
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    access.permissions = [];
    access.pii = true;
});

describe('DashboardView', () => {
    it('bez VISITS_VIEW nie pyta o statystyki i nie pokazuje widżetów wizyt', () => {
        access.permissions = ['TASKS_VIEW'];

        renderView();

        expect(useDashboard).toHaveBeenLastCalledWith({ enabled: false });
        expect(screen.getByText('zadania')).toBeInTheDocument();
        for (const widget of ['statystyki', 'najbliższe wizyty', 'rezerwacje', 'podpowiedzi']) {
            expect(screen.queryByText(widget)).not.toBeInTheDocument();
        }
    });

    it('z VISITS_VIEW pokazuje widżety wizyt i pyta o statystyki', () => {
        access.permissions = ['VISITS_VIEW', 'TASKS_VIEW'];

        renderView();

        expect(useDashboard).toHaveBeenLastCalledWith({ enabled: true });
        for (const widget of ['statystyki', 'najbliższe wizyty', 'rezerwacje', 'podpowiedzi', 'zadania']) {
            expect(screen.getByText(widget)).toBeInTheDocument();
        }
    });

    it('bez dostępu do danych osobowych nie pyta o statystyki', () => {
        access.permissions = ['VISITS_VIEW'];
        access.pii = false;

        renderView();

        expect(useDashboard).toHaveBeenLastCalledWith({ enabled: false });
    });
});
