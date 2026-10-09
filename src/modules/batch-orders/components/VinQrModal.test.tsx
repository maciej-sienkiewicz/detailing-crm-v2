// @vitest-environment jsdom
//
// „VIN telefonem" w oknie wpisu: kod bez unieważniania poprzedniego (telefon przy kolejnym
// aucie nie skanuje od nowa), nieczytelne zdjęcie mówi, że trzeba powtórzyć, a odczytany
// VIN trafia do pola.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { batchOrderApi } from '../api/batchOrderApi';
import { VinQrModal } from './VinQrModal';

vi.mock('../api/batchOrderApi', () => ({
    batchOrderApi: {
        startVinScanSession: vi.fn(),
        getVinScanResult: vi.fn(),
    },
}));

const api = vi.mocked(batchOrderApi);

const renderModal = (onVin = vi.fn()) => {
    render(
        <ThemeProvider theme={theme}>
            <VinQrModal onVin={onVin} onClose={vi.fn()} />
        </ThemeProvider>
    );
    return onVin;
};

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('VinQrModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        api.startVinScanSession.mockResolvedValue({
            token: 'abc',
            sessionId: 'vin-scan-u1',
            expiresAt: new Date(Date.now() + 3 * 3600_000).toISOString(),
        });
        api.getVinScanResult.mockResolvedValue(null);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('zamawia kod bez unieważniania poprzedniego i czeka na zdjęcie', async () => {
        renderModal();
        await tick(0);
        expect(api.startVinScanSession).toHaveBeenCalledWith(false);
        expect(screen.getByRole('status')).toHaveTextContent('Czekam na zdjęcie z telefonu');
    });

    it('nieczytelne zdjęcie: prosi o powtórzenie i czeka dalej', async () => {
        const onVin = renderModal();
        await tick(0);
        api.getVinScanResult.mockResolvedValue({ vin: null, scannedAt: '2026-10-09T10:00:00Z' });
        await tick(2000);
        expect(screen.getByRole('status')).toHaveTextContent('Nie udało się odczytać VIN');
        expect(onVin).not.toHaveBeenCalled();

        api.getVinScanResult.mockResolvedValue({ vin: 'WBA3A5G59DNP26082', scannedAt: '2026-10-09T10:00:30Z' });
        await tick(2000);
        expect(onVin).toHaveBeenCalledWith('WBA3A5G59DNP26082');
    });

    it('odczytany VIN oddaje raz i przestaje pytać', async () => {
        api.getVinScanResult.mockResolvedValue({ vin: 'WBA3A5G59DNP26082', scannedAt: '2026-10-09T10:00:00Z' });
        const onVin = renderModal();
        await tick(0);
        await tick(2000);
        await tick(6000);
        expect(onVin).toHaveBeenCalledTimes(1);
        expect(api.getVinScanResult).toHaveBeenCalledTimes(1);
    });
});
