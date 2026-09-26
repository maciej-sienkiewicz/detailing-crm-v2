// @vitest-environment jsdom
//
// Po wygenerowaniu listy obecności „Rozliczenia" w przełączniku mają wyraźnie mrugać - to
// jedyny sygnał, że lista nie pobrała się na dysk, tylko czeka tam na zatwierdzenie.
// Licznik przy „Rozliczeniach" mówi, ile list czeka, bez wchodzenia w widok.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { AttendanceSheet } from '../api/attendanceApi';
import { TeamAndRolesSection, type TeamSubView } from './TeamAndRolesSection';

const generated = { id: 'new-sheet', period: '2026-09', status: 'GENERATED' } as AttendanceSheet;

// Lista pracowników i role nie są tu tematem - atrapa listy umie tylko otworzyć okno
// listy obecności, a atrapa okna - „wygenerować" listę.
vi.mock('./TeamSection', () => ({
    TEAM_PAGE_SIZE: 20,
    TeamSection: ({ onOpenAttendance, search }: { onOpenAttendance?: () => void; search?: string }) => (
        <>
            <button type="button" onClick={() => onOpenAttendance?.()}>atrapa: lista obecności</button>
            <output data-testid="search">{search}</output>
        </>
    ),
}));
vi.mock('./team/AttendanceSheetModal', () => ({
    AttendanceSheetModal: ({ onGenerated, onClose }: { onGenerated?: (sheet: AttendanceSheet) => void; onClose: () => void }) => (
        <button type="button" onClick={() => { onGenerated?.(generated); onClose(); }}>atrapa: wygeneruj listę</button>
    ),
}));
vi.mock('./RolesSection', () => ({ RolesSection: () => null }));
vi.mock('./settlements/SettlementsSection', () => ({ SettlementsSection: () => null }));
vi.mock('../hooks/useTeam', () => ({ useEmployees: () => ({ pagination: { totalItems: 4 } }) }));
vi.mock('../hooks/useRoles', () => ({ useRoles: () => ({ roles: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }) }));
vi.mock('../api/attendanceApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/attendanceApi')>()),
    attendanceApi: {
        listAttendanceSheets: vi.fn().mockResolvedValue([
            { id: 'a', period: '2026-08', status: 'GENERATED' },
            { id: 'b', period: '2026-07', status: 'APPROVED' },
        ]),
    },
}));

const renderSection = (subView: TeamSubView = 'employees', onSubViewChange = vi.fn()) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TeamAndRolesSection subView={subView} onSubViewChange={onSubViewChange} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onSubViewChange };
};

const segment = (name: RegExp) => screen.getByRole('button', { name });

afterEach(() => cleanup());

describe('TeamAndRolesSection - przełącznik widoków', () => {
    it('przełącznik ma liczniki, a przy Rozliczeniach - ile list czeka na zatwierdzenie', async () => {
        renderSection();
        expect(segment(/^Pracownicy\s*4$/).getAttribute('aria-pressed')).toBe('true');
        expect(segment(/^Role\s*3$/)).toBeTruthy();
        expect(await screen.findByRole('button', { name: /Rozliczenia\s*1 do zatwierdzenia/ })).toBeTruthy();
    });

    it('kliknięcie w widok zgłasza go ramie ustawień', () => {
        const { onSubViewChange } = renderSection();
        fireEvent.click(segment(/^Role/));
        expect(onSubViewChange).toHaveBeenCalledWith('roles');
    });

    it('po wygenerowaniu listy Rozliczenia zaczynają mrugać', () => {
        renderSection();
        const flashing = () => segment(/Rozliczenia/).querySelector('[data-flash]');
        expect(flashing()).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'atrapa: lista obecności' }));
        fireEvent.click(screen.getByRole('button', { name: 'atrapa: wygeneruj listę' }));

        expect(flashing()).not.toBeNull();
        expect(segment(/Pracownicy/).querySelector('[data-flash]')).toBeNull();
        // Okno zamknęło się po wygenerowaniu.
        expect(screen.queryByRole('button', { name: 'atrapa: wygeneruj listę' })).toBeNull();
    });

    it('wyszukiwarka stoi obok przełącznika i filtruje listę pracowników', () => {
        renderSection();
        fireEvent.change(screen.getByRole('searchbox', { name: /Szukaj osoby/ }), { target: { value: 'Nowak' } });
        expect(screen.getByTestId('search').textContent).toBe('Nowak');
    });

    it('poza widokiem pracowników wyszukiwarki nie ma', () => {
        renderSection('roles');
        expect(screen.queryByRole('searchbox')).toBeNull();
    });
});
