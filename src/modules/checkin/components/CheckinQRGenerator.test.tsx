// @vitest-environment jsdom
//
// Zgłoszenie biznesu: usterki i zdjęcia dodane telefonem w trakcie przyjęcia nie dawały
// się potem połączyć na komputerze. Dwie przyczyny: wiadomość „usterki zmienione" traciła
// zdjęcia przy normalizacji, a zdjęcia z telefonu nie trafiały do okna wyboru zdjęcia
// usterki. Ten test idzie przez prawdziwy useCheckinSocket - podmieniony jest tylko kanał.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { IMessage } from '@stomp/stompjs';
import type { DamagePoint, MobileDamagePointsResponse, PhotoSlot } from '../types';

const socket = vi.hoisted(() => ({
    handler: null as null | ((m: IMessage) => void),
    connectListener: null as null | ((ctx: { isReconnect: boolean }) => void),
}));
const api = vi.hoisted(() => ({
    getAppointmentMobileDamagePoints: vi.fn<(checkinId: string) => Promise<MobileDamagePointsResponse | null>>(async () => null),
    deleteCheckinPhoto: vi.fn(async () => undefined),
}));
const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));

vi.mock('@/core/socketClient', () => ({
    subscribeToTopic: (_topic: string, handler: (m: IMessage) => void) => {
        socket.handler = handler;
        return () => { socket.handler = null; };
    },
    onSocketConnect: (listener: (ctx: { isReconnect: boolean }) => void) => {
        socket.connectListener = listener;
        return () => { socket.connectListener = null; };
    },
}));
vi.mock('../api/checkinApi', () => ({ checkinApi: api }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => toast }));
vi.mock('@/core', () => ({ useAuth: () => ({ isAuthenticated: true, user: { studioId: 's1' } }) }));
vi.mock('../hooks/useCheckinQRToken', () => ({
    useCheckinQRToken: () => ({
        tokenData: { checkinId: 'c1', token: 't' }, qrUrl: 'https://x/t', secondsLeft: 600,
        isExpired: false, isLoading: false, error: null, refresh: vi.fn(), rotate: vi.fn(),
    }),
}));

import { CheckinQRGenerator } from './CheckinQRGenerator';

const last = <T,>(calls: T[]): T => calls[calls.length - 1];
const send = (body: object) => act(() => { socket.handler?.({ body: JSON.stringify(body) } as IMessage); });

beforeEach(() => {
    api.getAppointmentMobileDamagePoints.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); socket.handler = null; socket.connectListener = null; });

type DamageCallback = (points: DamagePoint[], vehicleType?: string | null, savedAt?: string) => void;
const renderGenerator = (onDamageUpdated: DamageCallback = vi.fn()) => render(
    <ThemeProvider theme={theme}>
        <CheckinQRGenerator appointmentId="c1" onDamageUpdated={onDamageUpdated} />
    </ThemeProvider>,
);

describe('CheckinQRGenerator - zdjęcia i usterki z telefonu na komputerze', () => {
    it('usterka z telefonu przychodzi ze zdjęciem i oznaczeniem, a zdjęcia z telefonu są do wyboru', () => {
        const onDamageUpdated = vi.fn<DamageCallback>();
        const onPhotosChange = vi.fn<(photos: PhotoSlot[]) => void>();
        render(
            <ThemeProvider theme={theme}>
                <CheckinQRGenerator appointmentId="c1" onDamageUpdated={onDamageUpdated} onPhotosChange={onPhotosChange} />
            </ThemeProvider>,
        );

        send({ type: 'CHECKIN_PHOTO_UPLOADED', checkinId: 'c1', photoId: 'p-tyl', fileName: 'tyl.jpg', timestamp: '2026-10-14T10:00:00Z', thumbnailUrl: 'https://s3/tyl' });
        expect(onPhotosChange).toHaveBeenLastCalledWith([
            { id: 'p-tyl', fileName: 'tyl.jpg', uploadedAt: '2026-10-14T10:00:00Z', thumbnailUrl: 'https://s3/tyl' },
        ]);

        const stroke = { color: '#EF4444', width: 0.8, points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
        send({
            type: 'CHECKIN_DAMAGE_UPDATED', checkinId: 'c1', vehicleType: 'sedan', updatedAt: '2026-10-14T10:01:00Z',
            damagePoints: [{ id: 1, x: 40, y: 50, note: null, photos: [{ photoId: 'p-rysa', thumbnailUrl: 'https://s3/rysa', strokes: [stroke] }] }],
        });

        const [points] = last(onDamageUpdated.mock.calls);
        expect(points).toEqual([{
            id: 1, x: 40, y: 50, note: '',
            photos: [{ photoId: 'p-rysa', thumbnailUrl: 'https://s3/rysa', strokes: [stroke] }],
        }]);
        // Zdjęcie zrobione przy usterce też jest do wyboru (np. do drugiej usterki).
        expect(last(onPhotosChange.mock.calls)[0].map((p: PhotoSlot) => p.id)).toEqual(['p-rysa', 'p-tyl']);
    });

    it('usterka bez zdjęć z serwera ma pustą listę zdjęć, nie undefined', () => {
        const onDamageUpdated = vi.fn<DamageCallback>();
        render(
            <ThemeProvider theme={theme}>
                <CheckinQRGenerator appointmentId="c1" onDamageUpdated={onDamageUpdated} />
            </ThemeProvider>,
        );
        send({ type: 'CHECKIN_DAMAGE_UPDATED', checkinId: 'c1', updatedAt: '2026-10-14T10:01:00Z', damagePoints: [{ id: 2, x: 1, y: 2, note: 'rysa' }] });
        expect(last(onDamageUpdated.mock.calls)[0]).toEqual([{ id: 2, x: 1, y: 2, note: 'rysa', photos: [] }]);
    });

    /*
     * Zgłoszenie: uszkodzenia zaznaczone telefonem nie trafiały do wizyty, gdy komputer
     * przegapił zdarzenie (krok zdjęć otwarty po zapisie na telefonie, zerwane połączenie).
     * Kreator wysyłał wtedy pustą listę, a serwer dokleja zdjęcia z telefonu tylko do
     * przysłanych punktów.
     */
    it('przy wejściu w krok dociąga uszkodzenia zapisane wcześniej telefonem', async () => {
        api.getAppointmentMobileDamagePoints.mockResolvedValue({
            checkinId: 'c1', vehicleType: 'suv', savedAt: '2026-10-14T09:00:00Z',
            damagePoints: [{ id: 1, x: 40, y: 50, note: 'rysa', photos: [] }],
        });
        const onDamageUpdated = vi.fn<DamageCallback>();
        renderGenerator(onDamageUpdated);

        await waitFor(() => expect(onDamageUpdated).toHaveBeenCalledWith(
            [{ id: 1, x: 40, y: 50, note: 'rysa', photos: [] }], 'suv', '2026-10-14T09:00:00Z',
        ));
        expect(api.getAppointmentMobileDamagePoints).toHaveBeenCalledWith('c1');
    });

    it('po odzyskaniu połączenia dociąga stan jeszcze raz, a stan już znany nie wchodzi drugi raz', async () => {
        const onDamageUpdated = vi.fn<DamageCallback>();
        renderGenerator(onDamageUpdated);
        await waitFor(() => expect(api.getAppointmentMobileDamagePoints).toHaveBeenCalledTimes(1));

        const snapshot = {
            checkinId: 'c1', vehicleType: null, savedAt: '2026-10-14T10:05:00Z',
            damagePoints: [{ id: 3, x: 1, y: 2, note: 'z przerwy', photos: [] }],
        };
        api.getAppointmentMobileDamagePoints.mockResolvedValue(snapshot);
        await act(async () => { socket.connectListener?.({ isReconnect: true }); });

        await waitFor(() => expect(onDamageUpdated).toHaveBeenCalledTimes(1));
        expect(onDamageUpdated.mock.calls[0][0][0].note).toBe('z przerwy');

        // To samo zdarzenie spóźnione po odczycie - nic nowego.
        send({ type: 'CHECKIN_DAMAGE_UPDATED', checkinId: 'c1', updatedAt: snapshot.savedAt, damagePoints: snapshot.damagePoints });
        expect(onDamageUpdated).toHaveBeenCalledTimes(1);
    });

    it('nieudane usunięcie zdjęcia z telefonu mówi o tym, zamiast milczeć', async () => {
        api.deleteCheckinPhoto.mockRejectedValueOnce(new Error('404'));
        renderGenerator();
        send({ type: 'CHECKIN_PHOTO_UPLOADED', checkinId: 'c1', photoId: 'p-1', fileName: 'przod.jpg', timestamp: '2026-10-14T10:00:00Z' });

        fireEvent.click(screen.getByTitle('Usuń zdjęcie'));

        await waitFor(() => expect(toast.showError).toHaveBeenCalledWith(
            'Nie udało się usunąć zdjęcia z telefonu',
            expect.stringContaining('trafi do wizyty'),
        ));
        expect(screen.getByText('przod.jpg')).toBeInTheDocument();
    });
});
