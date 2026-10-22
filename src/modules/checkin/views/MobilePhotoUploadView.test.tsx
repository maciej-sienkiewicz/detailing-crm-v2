// @vitest-environment jsdom
//
// Strona telefonu z kodu QR ma jasny koniec: gdy komputer zakończy sesję („Gotowe",
// zamknięte okno, przerwane przyjęcie), telefon pokazuje to w kilka sekund, a ponowne
// otwarcie linku mówi „zakończono", a nie „link wygasł".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MobilePhotoUploadView } from './MobilePhotoUploadView';
import { checkinApi } from '../api/checkinApi';
import { STATUS_POLL_INTERVAL_MS } from './mobile/useMobilePhotoUploadLogic';

vi.mock('../api/checkinApi', () => ({
    checkinApi: {
        getMobileCheckinContext: vi.fn(),
        getMobileStatus: vi.fn(),
        getMobileDamagePoints: vi.fn().mockResolvedValue({ checkinId: 'c', damagePoints: [], savedAt: null }),
        markMobileDone: vi.fn(),
        undoMobileDone: vi.fn(),
    },
}));
vi.mock('../services/offlinePhotoDb', () => ({
    offlinePhotoDb: { getByToken: vi.fn().mockResolvedValue([]), getPendingByToken: vi.fn().mockResolvedValue([]) },
}));

const api = vi.mocked(checkinApi);
const status = (over = {}) => ({ sessionActive: true, visitCreated: false, userDone: false, endReason: null, paused: false, ...over });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe('MobilePhotoUploadView', () => {
    it('pokazuje studio i auto, którego dotyczą zdjęcia', async () => {
        api.getMobileCheckinContext.mockResolvedValue({
            checkinId: 'v', tenantId: 't', purpose: 'VISIT_FILES', studioName: 'Studio Lśnij', subject: 'BMW X3 · WJ79814',
        });
        api.getMobileStatus.mockResolvedValue(status());
        render(<MobilePhotoUploadView token="tok" />);

        expect(await screen.findByRole('heading', { name: 'Zdjęcia do wizyty' })).toBeInTheDocument();
        expect(screen.getByText('Studio Lśnij')).toBeInTheDocument();
        expect(screen.getByText('BMW X3 · WJ79814')).toBeInTheDocument();
        // „Gotowe" bez żadnego zdjęcia nic by nie znaczyło.
        expect(screen.getByRole('button', { name: /Gotowe/ })).toBeDisabled();
    });

    it('kończy stronę, gdy komputer kliknie „Gotowe"', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        api.getMobileCheckinContext.mockResolvedValue({ checkinId: 'v', tenantId: 't', purpose: 'VISIT_FILES' });
        api.getMobileStatus.mockResolvedValue(status());
        render(<MobilePhotoUploadView token="tok" />);
        await screen.findByRole('heading', { name: 'Zdjęcia do wizyty' });

        api.getMobileStatus.mockResolvedValue(status({ sessionActive: false, endReason: 'FINISHED' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS + 50); });

        expect(screen.getByRole('heading', { name: 'Zakończono na komputerze' })).toBeInTheDocument();
    });

    it('ponownie otwarty link po przerwanym przyjęciu mówi „Przyjęcie przerwane", nie „Link wygasł"', async () => {
        api.getMobileCheckinContext.mockRejectedValue(new Error('403'));
        api.getMobileStatus.mockResolvedValue(status({ sessionActive: false, visitCreated: true, endReason: 'CANCELLED' }));
        render(<MobilePhotoUploadView token="tok" />);

        expect(await screen.findByRole('heading', { name: 'Przyjęcie przerwane' })).toBeInTheDocument();
        expect(screen.queryByText('Link wygasł')).not.toBeInTheDocument();
    });

    it('nieznany link to „Link wygasł"', async () => {
        api.getMobileCheckinContext.mockRejectedValue(new Error('403'));
        api.getMobileStatus.mockResolvedValue(status({ sessionActive: false }));
        render(<MobilePhotoUploadView token="tok" />);

        expect(await screen.findByRole('heading', { name: 'Link wygasł' })).toBeInTheDocument();
    });

    it('VIN przy zamkniętym oknie na komputerze nie obiecuje, że numer „sam się wpisze"', async () => {
        api.getMobileCheckinContext.mockResolvedValue({ checkinId: 'vin-scan-u', tenantId: 't', purpose: 'VIN_SCAN', studioName: 'Studio Lśnij' });
        api.getMobileStatus.mockResolvedValue(status({ paused: true }));
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<MobilePhotoUploadView token="tok" />);
        await screen.findByRole('heading', { name: 'Numer VIN' });
        // Nagłówek to studio, nie „Zlecenia zbiorcze" wpisane na sztywno.
        expect(screen.queryByText('Zlecenia zbiorcze')).not.toBeInTheDocument();

        await act(async () => { await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS + 50); });
        expect(screen.getByText('Okno odczytu VIN na komputerze jest zamknięte.')).toBeInTheDocument();
    });
});
