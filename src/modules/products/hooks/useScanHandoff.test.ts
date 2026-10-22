// @vitest-environment jsdom
//
// Zamknięcie okna dodawania produktu musi zamknąć sesję skanowania - inaczej telefon
// skanuje dalej do nikąd. Wcześniej reset() z pierwszego renderu nie znał sesji.
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { useScanHandoff } from './useScanHandoff';
import { productsApi } from '../api/productsApi';

vi.mock('../api/productsApi', () => ({
    productsApi: { openScanSession: vi.fn(), getScanSession: vi.fn(), closeScanSession: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/core/socketClient', () => ({ subscribeToTopic: vi.fn(() => () => {}) }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { studioId: 's' } }) }));

const api = vi.mocked(productsApi);
const session = (id: string) => ({ sessionId: id, handoffToken: 't', handoffPath: '/m/scan?s=t', status: 'OPEN', scannedCodes: [], expiresAt: '' });

// Tak jak ScanHandoffPanel: start przy montowaniu, reset w sprzątaniu z pierwszego renderu.
const usePanel = () => {
    const h = useScanHandoff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { h.start(); return () => h.reset(); }, []);
    return h;
};

describe('useScanHandoff', () => {
    it('zamyka sesję przy zamknięciu okna', async () => {
        api.openScanSession.mockResolvedValue(session('a') as never);
        const { unmount } = renderHook(() => usePanel());
        await act(async () => {});
        unmount();
        expect(api.closeScanSession).toHaveBeenCalledWith('a');
    });

    it('sesja otwarta już po zamknięciu okna też zostaje zamknięta', async () => {
        let resolve: (s: unknown) => void = () => {};
        api.openScanSession.mockReturnValue(new Promise(r => { resolve = r; }) as never);
        const { unmount } = renderHook(() => usePanel());
        unmount();
        await act(async () => { resolve(session('late')); });
        expect(api.closeScanSession).toHaveBeenCalledWith('late');
    });
});
