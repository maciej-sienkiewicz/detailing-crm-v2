// src/modules/visits/hooks/useDamageMapMobileSession.test.tsx
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DamagePoint } from '@/modules/checkin/types';
import { useDamageMapMobileSession } from './useDamageMapMobileSession';
import { visitApi } from '../api/visitApi';

/** Przechwycone wywołania zwrotne gniazda — test gra rolę telefonu. */
const socketHandlers: {
    onPhotoUploaded?: () => void;
    onDamageUpdated?: (event: unknown) => void | Promise<void>;
} = {};

vi.mock('@/modules/checkin/hooks/useCheckinSocket', () => ({
    useCheckinSocket: (opts: {
        onPhotoUploaded: () => void;
        onDamageUpdated?: (event: unknown) => void | Promise<void>;
    }) => {
        socketHandlers.onPhotoUploaded = opts.onPhotoUploaded;
        socketHandlers.onDamageUpdated = opts.onDamageUpdated;
    },
}));

vi.mock('../api/visitApi', () => ({
    visitApi: {
        startDamageMapMobileSession: vi.fn(),
        syncDamageMapMobileSession: vi.fn(),
    },
}));

const startMock = vi.mocked(visitApi.startDamageMapMobileSession);
const syncMock = vi.mocked(visitApi.syncDamageMapMobileSession);

const existing: DamagePoint = { id: 1, x: 10, y: 20, note: 'rysa' };

const withPhoto: DamagePoint = {
    id: 1,
    x: 10,
    y: 20,
    note: 'rysa',
    photos: [{ photoId: 'visit-photo-1', strokes: [], thumbnailUrl: 'https://example.test/nowe.jpg' }],
};

/** Harness odwzorowuje prawdziwy układ: sesja mieszka w OKNIE, nie w panelu z kodem. */
const Harness = ({
    onPoints,
    onClaimed,
}: {
    onPoints: (p: DamagePoint[], v: string | null) => void;
    onClaimed: () => void;
}) => {
    const session = useDamageMapMobileSession({
        visitId: 'visit-1',
        points: [existing],
        vehicleType: 'sedan',
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
        syncMock.mockResolvedValue({
            active: true,
            damagePoints: [withPhoto],
            vehicleType: 'sedan',
            savedAt: new Date().toISOString(),
        });
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

    it('zdjęcie z telefonu wchodzi w punkt razem z miniaturą', async () => {
        // Sedno zgłoszenia: zdjęcie szło na serwer, ale nie pokazywało się pod
        // uszkodzeniem. Identyfikatory tłumaczy serwer, okno tylko wstawia wynik.
        const user = userEvent.setup();
        const onPoints = vi.fn();
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => { await socketHandlers.onDamageUpdated?.({}); });

        expect(onPoints).toHaveBeenCalledWith([withPhoto], 'sedan');
        expect(onPoints.mock.calls[0][0][0].photos[0].thumbnailUrl).toBe('https://example.test/nowe.jpg');
    });

    it('dwa zdarzenia na jedno zdjęcie dają JEDNO uzgodnienie w locie, nie dwa równoległe', async () => {
        /*
         * To jest wyścig, który dublował zdjęcia: telefon przy dodaniu zdjęcia wysyła
         * „wysłano zdjęcie" i „zapisano punkty", a dwa równoległe uzgodnienia
         * przenosiły ten sam plik dwa razy i tworzyły dwa wiersze zdjęcia wizyty.
         */
        const user = userEvent.setup();
        let resolveFirst: (() => void) | undefined;
        syncMock.mockImplementationOnce(() => new Promise(resolve => {
            resolveFirst = () => resolve({
                active: true,
                damagePoints: [withPhoto],
                vehicleType: 'sedan',
                savedAt: new Date().toISOString(),
            });
        }));
        render(<Harness onPoints={vi.fn()} onClaimed={vi.fn()} />);
        await startSession(user);

        // Oba zdarzenia lecą, gdy pierwsze uzgodnienie jeszcze nie wróciło.
        act(() => { socketHandlers.onPhotoUploaded?.(); });
        act(() => { void socketHandlers.onDamageUpdated?.({}); });
        expect(syncMock).toHaveBeenCalledTimes(1);

        await act(async () => { resolveFirst?.(); });

        // Drugie zdarzenie nie przepadło — poszło SZEREGOWO, po pierwszym.
        await waitFor(() => expect(syncMock).toHaveBeenCalledTimes(2));
    });

    it('odświeża listę zdjęć wizyty, bo telefon mógł dorzucić nowe', async () => {
        const user = userEvent.setup();
        const onClaimed = vi.fn();
        render(<Harness onPoints={vi.fn()} onClaimed={onClaimed} />);
        await startSession(user);

        await act(async () => { await socketHandlers.onDamageUpdated?.({}); });

        expect(onClaimed).toHaveBeenCalled();
    });

    it('brak sesji po stronie serwera nie kasuje punktów w edytorze', async () => {
        const user = userEvent.setup();
        const onPoints = vi.fn();
        syncMock.mockResolvedValue({ active: false, damagePoints: [], vehicleType: null, savedAt: null });
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => { await socketHandlers.onDamageUpdated?.({}); });

        expect(onPoints).not.toHaveBeenCalled();
    });

    it('nieudane uzgodnienie nie wywraca okna ani nie czyści mapy', async () => {
        const user = userEvent.setup();
        const onPoints = vi.fn();
        syncMock.mockRejectedValue(new Error('500'));
        render(<Harness onPoints={onPoints} onClaimed={vi.fn()} />);
        await startSession(user);

        await act(async () => { await socketHandlers.onDamageUpdated?.({}); });

        expect(onPoints).not.toHaveBeenCalled();
        expect(screen.getByTestId('seen').textContent).toBe('true');
    });

    it('pierwszy sygnał z telefonu oznacza sesję jako połączoną', async () => {
        // Po tym okno zamyka wybór zdjęcia i pokazuje pasek „Połączono z telefonem".
        const user = userEvent.setup();
        render(<Harness onPoints={vi.fn()} onClaimed={vi.fn()} />);
        await startSession(user);
        expect(screen.getByTestId('seen').textContent).toBe('false');

        await act(async () => { socketHandlers.onPhotoUploaded?.(); });

        await waitFor(() => expect(screen.getByTestId('seen').textContent).toBe('true'));
    });
});
