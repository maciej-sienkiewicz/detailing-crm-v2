// @vitest-environment jsdom
//
// Import kontaktów na telefonie: zamknięte okno na komputerze kończy stronę, zamiast
// pozwolić wysłać kontakty, których nikt nie przejrzy.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileContactsImportView } from './MobileContactsImportView';
import { mobileContactImportApi } from '../api/customerImportApi';

vi.mock('../api/customerImportApi', () => ({
    mobileContactImportApi: { getContext: vi.fn(), submit: vi.fn() },
}));

const renderView = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/m/contacts?s=qr']}><MobileContactsImportView /></MemoryRouter>
    </QueryClientProvider>,
);

describe('MobileContactsImportView', () => {
    it('okno zamknięte na komputerze kończy stronę', async () => {
        vi.mocked(mobileContactImportApi.getContext).mockRejectedValue({
            response: { status: 410, data: { message: 'Okno importu na komputerze zostało zamknięte.', reason: 'CLOSED' } },
        });
        renderView();
        expect(await screen.findByRole('heading', { name: 'Okno na komputerze jest zamknięte' })).toBeInTheDocument();
    });

    it('przeglądarka bez wyboru kontaktów to jasny koniec, nie martwy przycisk', async () => {
        vi.mocked(mobileContactImportApi.getContext).mockResolvedValue({ studioName: 'Studio Lśnij', expiresAt: '2099-01-01T00:00:00Z' });
        renderView();
        expect(await screen.findByRole('heading', { name: 'Na tym telefonie się nie da' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Wybierz kontakty' })).not.toBeInTheDocument();
    });
});
