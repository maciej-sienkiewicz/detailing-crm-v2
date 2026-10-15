// @vitest-environment jsdom
//
// Wejście wprost w /appointments/:id/edit bez danych osobowych: czytelna odmowa zamiast
// formularza wypełnionego gwiazdkami - i bez odczytu rezerwacji.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { appointmentApi } from '../api/appointmentApi';
import { AppointmentEditView } from './AppointmentEditView';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'r@studio.pl', permissions: ['VISITS_VIEW', 'VISITS_CREATE'] }, setUser: vi.fn() }),
}));

afterEach(cleanup);

describe('AppointmentEditView bez danych osobowych', () => {
    it('pokazuje odmowę i nie pobiera rezerwacji', () => {
        const getAppointment = vi.spyOn(appointmentApi, 'getAppointment');
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <MemoryRouter initialEntries={['/appointments/a-1/edit']}>
                            <Routes>
                                <Route path="/appointments/:appointmentId/edit" element={<AppointmentEditView />} />
                            </Routes>
                        </MemoryRouter>
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        );
        expect(screen.getByText('Nie możesz edytować tej rezerwacji')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Wróć do kalendarza' })).toBeTruthy();
        expect(getAppointment).not.toHaveBeenCalled();
    });
});
