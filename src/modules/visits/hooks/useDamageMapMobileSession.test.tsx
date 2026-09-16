// src/modules/visits/hooks/useDamageMapMobileSession.test.tsx
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DamagePoint } from '@/modules/checkin/types';
import { useDamageMapMobileSession } from './useDamageMapMobileSession';
import { visitApi } from '../api/visitApi';
import type { ClaimedMobilePhoto } from '../types';

/** Przechwycone wywołania zwrotne gniazda — test gra rolę telefonu. */
const socketHandlers: {
    onPhotoUploaded?: () => void;
    onDamageUpdated?: (event: unknown) => void | Promise<void>;
    enabled?: boolean;
} = {};

vi.mock('@/modules/checkin/hooks/useCheckinSocket', () => ({
    useCheckinSocket: (opts: {
        onPhotoUploaded: () => void;
        onDamageUpdated?: (event: unknown) => void | Promise<void>;
        enabled?: boolean;
    }) => {
        socketHandlers.onPhotoUploaded = opts.onPhotoUploaded;
        socketHandlers.onDamageUpdated = opts.onDamageUpdated;
        socketHandlers.enabled = opts.enabled;
    },
}));

vi.mock('../api/visitApi', () => ({
    visitApi: {
        startDamageMapMobileSession: vi.fn(),
        claimDamageMapQrPhotos: vi.fn(),
    },
}));

const startMock = vi.mocked(visitApi.startDamageMapMobileSession);
const claimMock = vi.mocked(visitApi.claimDamageMapQrPhotos);

const existing: DamagePoint = { id: 1, x: 10, y: 20, note: 'rysa' };

/**
 * Harness odwzorowuje prawdziwy układ: sesja mieszka w OKNIE, a panel z kodem jest
 * odmontowywalną zakładką. To właśnie ta różnica psuła wcześniej całą funkcję.
 */
const Harness = ({
    onPoints,
    onClaimed,
}: {
    onPoints: (p: DamagePoint[], v: string | null) => void;
    onClaimed: (p: ClaimedMobilePhoto[]) => void;
}) => {
    const session = useDamageMapMobileSession({
        visitId: 'visit-1',
        points: [existing],
        vehicleType: 'sedan',
        knownPhotoIds: ['photo-existing'],
        onPointsFromPhone: onPoints,
        onPhotosClaimed: onClaimed,
    });
    return (
        <div>
            <button onClick={() => void session.start(false)}>start</button>
            <span data-testid="qr">{session.qrUrl ?? 'brak'}</span>
            <span data-testid="seen">{String(session.phoneSeen)}</span>
        </div>
    );
};

describe('useDamageMapMobileSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete socketHandlers.onPhotoUploaded;
        delete socketHandlers.onDamageUpdated;
        startMock.mockResolvedValue({
            token: 'tok-1',
            checkinId: 'visit-1',
            expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            uploadEndpoint: '/api/mobile/checkin/photos',
        });
        claimMock.mockResolvedValue({ photos: [] });
    });

    const startSession = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByText('start'));
        await waitFor(() => expect(screen.getByTestId('qr').textContent).toContain('/m/upload?t=tok-1'));
    };

    it('zasiewa sesję aktualnymi punktami, żeby telefon nie startował z pustej mapy', async () => {
        const user = userEvent.setup();
        render(<Harness onPoints={vi.fn()} onClaimed={vi.fn()} />);

        await startSession(user);

        expect(startMock).toHaveBeenCalledWith('visit-1', {
            damagePoints: [existing],
            vehicleType: 'sedan',
            rotate: false,
        });
    });

    it('zdjęcie z telefonu trafia do punktu z adresem miniatury od razu', async () => {
        // Sedno zgłoszenia: zdjęcie szło na serwer, ale nie było widać go na mapie.
        const user = userEvent.setup();
        const onPoints = vi.fn();
        claimMock.mockResolvedValue({
            photos: [{
                temporaryPhotoId: 'temp-1',
                photoId: 'visit-photo-1',
                fileName: 'temp-1.jpg',
                thumbnailUrl: 'https://example.test/nowe.jpg',
            }],
        });
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => {
            await socketHandlers.onDamageUpdated?.({
                type: 'CHECKIN_DAMAGE_UPDATED',
                checkinId: 'visit-1',
                vehicleType: 'sedan',
                updatedAt: new Date().toISOString(),
                damagePoints: [{ id: 1, x: 10, y: 20, note: 'rysa', photos: [{ photoId: 'temp-1', strokes: [] }] }],
            });
        });

        const [points] = onPoints.mock.calls[0];
        expect(points[0].photos).toEqual([{
            photoId: 'visit-photo-1',
            strokes: [],
            thumbnailUrl: 'https://example.test/nowe.jpg',
        }]);
    });

    it('zdjęcie przypięte przed sesją wraca nietknięte', async () => {
        // Telefon oddaje pełną mapę, więc identyfikatory sprzed sesji wracają bez
        // zmiany — pominięcie ich zrzucałoby zdjęcia z punktów.
        const user = userEvent.setup();
        const onPoints = vi.fn();
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => {
            await socketHandlers.onDamageUpdated?.({
                type: 'CHECKIN_DAMAGE_UPDATED',
                checkinId: 'visit-1',
                vehicleType: null,
                updatedAt: new Date().toISOString(),
                damagePoints: [{ id: 1, x: 10, y: 20, note: 'rysa', photos: [{ photoId: 'photo-existing', strokes: [] }] }],
            });
        });

        const [points] = onPoints.mock.calls[0];
        expect(points[0].photos[0].photoId).toBe('photo-existing');
    });

    it('zdjęcie bez rozwiązanego identyfikatora jest pomijane, nie wstawiane martwe', async () => {
        const user = userEvent.setup();
        const onPoints = vi.fn();
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => {
            await socketHandlers.onDamageUpdated?.({
                type: 'CHECKIN_DAMAGE_UPDATED',
                checkinId: 'visit-1',
                vehicleType: null,
                updatedAt: new Date().toISOString(),
                damagePoints: [{ id: 1, x: 10, y: 20, note: 'rysa', photos: [{ photoId: 'temp-nieznane', strokes: [] }] }],
            });
        });

        const [points] = onPoints.mock.calls[0];
        expect(points[0].photos).toEqual([]);
    });

    it('drugi zapis z telefonu nadal rozwiązuje zdjęcie, choć plik tymczasowy już nie istnieje', async () => {
        /*
         * Telefon ma własny stan i przy każdym zapisie przysyła SWOJE identyfikatory,
         * także po przeniesieniu zdjęcia do galerii wizyty. Drugie `claim` nie ma już
         * czego przenieść — mapowanie musi przeżyć w pamięci sesji.
         */
        const user = userEvent.setup();
        const onPoints = vi.fn();
        claimMock.mockResolvedValueOnce({
            photos: [{
                temporaryPhotoId: 'temp-1',
                photoId: 'visit-photo-1',
                fileName: 'temp-1.jpg',
                thumbnailUrl: 'https://example.test/nowe.jpg',
            }],
        });
        claimMock.mockResolvedValue({ photos: [] });
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        const event = (extraPoint: boolean) => ({
            type: 'CHECKIN_DAMAGE_UPDATED',
            checkinId: 'visit-1',
            vehicleType: null,
            updatedAt: new Date().toISOString(),
            damagePoints: [
                { id: 1, x: 10, y: 20, note: 'rysa', photos: [{ photoId: 'temp-1', strokes: [] }] },
                ...(extraPoint ? [{ id: 2, x: 50, y: 50, note: 'wgniecenie', photos: [] }] : []),
            ],
        });

        await act(async () => { await socketHandlers.onDamageUpdated?.(event(false)); });
        await act(async () => { await socketHandlers.onDamageUpdated?.(event(true)); });

        const [points] = onPoints.mock.calls[1];
        expect(points[0].photos[0].photoId).toBe('visit-photo-1');
        expect(points).toHaveLength(2);
    });

    it('zdarzenie o samym zdjęciu przenosi je do wizyty bez czekania na zapis punktów', async () => {
        const user = userEvent.setup();
        const onClaimed = vi.fn();
        claimMock.mockResolvedValue({
            photos: [{
                temporaryPhotoId: 'temp-1',
                photoId: 'visit-photo-1',
                fileName: 'temp-1.jpg',
                thumbnailUrl: 'https://example.test/nowe.jpg',
            }],
        });
        render(<Harness onPoints={vi.fn()} onClaimed={onClaimed} />);
        await startSession(user);

        await act(async () => { socketHandlers.onPhotoUploaded?.(); });

        await waitFor(() => expect(onClaimed).toHaveBeenCalled());
        expect(screen.getByTestId('seen').textContent).toBe('true');
    });
});
