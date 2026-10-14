// @vitest-environment jsdom
//
// Zgłoszenie biznesu: usterki i zdjęcia dodane telefonem w trakcie przyjęcia nie dawały
// się potem połączyć na komputerze. Dwie przyczyny: wiadomość „usterki zmienione" traciła
// zdjęcia przy normalizacji, a zdjęcia z telefonu nie trafiały do okna wyboru zdjęcia
// usterki. Ten test idzie przez prawdziwy useCheckinSocket - podmieniony jest tylko kanał.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { IMessage } from '@stomp/stompjs';
import type { DamagePoint, PhotoSlot } from '../types';

const socket = vi.hoisted(() => ({ handler: null as null | ((m: IMessage) => void) }));

vi.mock('@/core/socketClient', () => ({
    subscribeToTopic: (_topic: string, handler: (m: IMessage) => void) => {
        socket.handler = handler;
        return () => { socket.handler = null; };
    },
}));
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

afterEach(() => { cleanup(); socket.handler = null; });

describe('CheckinQRGenerator - zdjęcia i usterki z telefonu na komputerze', () => {
    it('usterka z telefonu przychodzi ze zdjęciem i oznaczeniem, a zdjęcia z telefonu są do wyboru', () => {
        const onDamageUpdated = vi.fn<(points: DamagePoint[], vehicleType?: string | null) => void>();
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
        const onDamageUpdated = vi.fn<(points: DamagePoint[], vehicleType?: string | null) => void>();
        render(
            <ThemeProvider theme={theme}>
                <CheckinQRGenerator appointmentId="c1" onDamageUpdated={onDamageUpdated} />
            </ThemeProvider>,
        );
        send({ type: 'CHECKIN_DAMAGE_UPDATED', checkinId: 'c1', updatedAt: '2026-10-14T10:01:00Z', damagePoints: [{ id: 2, x: 1, y: 2, note: 'rysa' }] });
        expect(last(onDamageUpdated.mock.calls)[0]).toEqual([{ id: 2, x: 1, y: 2, note: 'rysa', photos: [] }]);
    });
});
