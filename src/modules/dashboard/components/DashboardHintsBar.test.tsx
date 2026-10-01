// @vitest-environment jsdom
//
// Podpowiedź „karty czasu pracy czekają na zatwierdzenie" prowadzi tak samo jak
// „wnioski urlopowe czekają": akcja NAVIGATE otwiera wskazany miesiąc w Listach
// miesięcznych (najstarszy z kartą do decyzji).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { DashboardHint } from '../hooks/useDashboardHints';
import { DashboardHintsBar } from './DashboardHintsBar';

const hints = vi.hoisted(() => ({ list: [] as DashboardHint[] }));
vi.mock('../hooks/useDashboardHints', () => ({
    useDashboardHints: () => ({ hints: hints.list }),
    useDismissDashboardHint: () => ({ mutate: vi.fn() }),
    useDisableWorkTimeTracking: () => ({ mutateAsync: vi.fn() }),
}));

afterEach(() => cleanup());

describe('DashboardHintsBar - WORKTIME_CARDS_PENDING', () => {
    it('„Przejrzyj" otwiera miesiąc z kartami do zatwierdzenia', async () => {
        hints.list = [{
            key: 'WORKTIME_CARDS_PENDING_1790000000',
            kind: 'WORKTIME_CARDS_PENDING',
            text: '2 karty czasu pracy czekają na zatwierdzenie',
            action: { label: 'Przejrzyj', type: 'NAVIGATE', url: '/employees/worktime?period=2026-09' },
            permanentDismiss: false,
            severity: 'INFO',
        }];
        const router = createMemoryRouter([
            { path: '/dashboard', element: <DashboardHintsBar /> },
            { path: '/employees/worktime', element: <p>listy miesięczne</p> },
        ], { initialEntries: ['/dashboard'] });
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <RouterProvider router={router} />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );

        expect(await screen.findByText('2 karty czasu pracy czekają na zatwierdzenie')).toBeInTheDocument();
        // Pasek jest ukryty poniżej breakpointu md, a jsdom nie zna szerokości ekranu.
        fireEvent.click(screen.getByRole('button', { name: 'Przejrzyj', hidden: true }));
        expect(router.state.location.pathname).toBe('/employees/worktime');
        expect(router.state.location.search).toBe('?period=2026-09');
    });
});
