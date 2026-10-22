// @vitest-environment jsdom
//
// Skaner na telefonie kończy się sam, gdy okno dodawania produktu na komputerze zostanie
// zamknięte, i ma własny koniec („Zakończ skanowanie").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MobileProductScanView } from './MobileProductScanView';
import { mobileScanApi } from '../api/productsApi';

vi.mock('../api/productsApi', () => ({
    mobileScanApi: { context: vi.fn(), submit: vi.fn(), submitPhoto: vi.fn() },
}));
vi.mock('../hooks/useBarcodeScanner', () => ({
    useBarcodeScanner: () => ({
        videoRef: { current: null }, active: true, error: null,
        startContinuous: vi.fn(), stop: vi.fn(), decodeImageFile: vi.fn(),
    }),
}));

const api = vi.mocked(mobileScanApi);
const ctx = (status: string, scannedCount = 0) => ({ status, scannedCount, expiresAt: '2099-01-01T00:00:00Z' });

const renderView = () => render(
    <MemoryRouter initialEntries={['/m/scan?s=qr']}><MobileProductScanView /></MemoryRouter>,
);

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe('MobileProductScanView', () => {
    it('kończy skanowanie, gdy okno na komputerze zostanie zamknięte', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        api.context.mockResolvedValue(ctx('OPEN'));
        renderView();
        await screen.findByRole('heading', { name: 'Skanuj produkt' });

        api.context.mockResolvedValue(ctx('CONSUMED', 2));
        await act(async () => { await vi.advanceTimersByTimeAsync(5_100); });

        expect(screen.getByRole('heading', { name: 'Zakończono na komputerze' })).toBeInTheDocument();
        expect(screen.getByText(/przesłano 2 kody/)).toBeInTheDocument();
    });

    it('„Zakończ skanowanie" daje ekran końcowy', async () => {
        api.context.mockResolvedValue(ctx('OPEN'));
        renderView();
        await userEvent.click(await screen.findByRole('button', { name: 'Zakończ skanowanie' }));
        expect(screen.getByRole('heading', { name: 'Gotowe' })).toBeInTheDocument();
    });

    it('nieważny link to „Link wygasł"', async () => {
        api.context.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
        renderView();
        expect(await screen.findByRole('heading', { name: 'Link wygasł' })).toBeInTheDocument();
    });
});
