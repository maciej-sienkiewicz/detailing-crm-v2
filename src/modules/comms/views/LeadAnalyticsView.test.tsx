// @vitest-environment jsdom
//
// „Pieniądze w zapytaniach": lejek zapytania → zlecenia → wartość, liczony ze statusów
// spraw z okresu, i „co z resztą" (w toku, przegrane z powodami).
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { LeadAnalytics } from '../types';
import LeadAnalyticsView from './LeadAnalyticsView';

const analytics = {
    totalCreated: 20,
    byStatus: { NEW: 2, IN_PROGRESS: 3, CONFIRMED: 1, COMPLETED: 8, LOST: 5, NO_SHOW: 1 },
    wonValue: 2400000,
    pipelineValue: 600000,
    silentValue: 150000,
    lostValue: 900000,
    wonValuePrevious: 1800000,
    lostReasons: [
        { code: 'PRICE', label: 'Za drogo', count: 4, share: 0.66 },
        { code: 'COMP', label: 'Konkurencja', count: 2, share: 0.33 },
    ],
    medianFirstResponseMinutes: 45,
    timeline: [],
} as unknown as LeadAnalytics;

vi.mock('../hooks/useLeads', () => ({
    useLeadAnalytics: () => ({ data: analytics, isLoading: false }),
}));

const renderView = () => render(
    <ThemeProvider theme={theme}>
        <MemoryRouter><LeadAnalyticsView /></MemoryRouter>
    </ThemeProvider>,
);

describe('LeadAnalyticsView', () => {
    it('lejek: zapytania, zlecenia z odsetkiem i wartość z porównaniem do okresu wcześniej', () => {
        renderView();
        const funnel = within(screen.getByLabelText('Wynik zapytań'));

        expect(funnel.getByText('20')).toBeTruthy();
        expect(funnel.getByText('8')).toBeTruthy();
        expect(funnel.getByText('40% zapytań')).toBeTruthy();
        expect(funnel.getByText(/okres wcześniej/)).toBeTruthy();
    });

    it('co z resztą: w toku (otwarte statusy) i przegrane z najczęstszymi powodami', () => {
        renderView();

        expect(screen.getByText('W toku: 6 leadów')).toBeTruthy();
        expect(screen.getByText('Przegrane: 6 leadów')).toBeTruthy();
        expect(screen.getByText('Za drogo (4), Konkurencja (2)')).toBeTruthy();
        expect(screen.getByText('45 min')).toBeTruthy();
    });
});
