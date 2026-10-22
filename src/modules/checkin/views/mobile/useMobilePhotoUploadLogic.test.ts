// @vitest-environment jsdom
//
// Zgłoszenie: zdjęcia wrzucane telefonem przez kod QR dublowały się na komputerze.
// Serwer każde wysłanie zapisuje jako nowe zdjęcie, a telefon potrafił wysłać to samo
// dwa razy: kolejka czytała listę oczekujących raz i szła po niej po kolei, a „Ponów"
// i wybór pliku wysyłały obok niej. Teraz każda droga najpierw zajmuje zdjęcie
// (offlinePhotoDb.claim) i wysyła je z kluczem, po którym serwer rozpoznaje powtórkę.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PendingPhoto } from '../../types';

const store = new Map<string, PendingPhoto>();

// Ta sama umowa co w IndexedDB: odczyt i zapis zajęcia są jednym krokiem.
vi.mock('../../services/offlinePhotoDb', () => ({
    offlinePhotoDb: {
        add: vi.fn(async (photo: PendingPhoto) => { store.set(photo.id, photo); }),
        getByToken: vi.fn(async (token: string) => [...store.values()].filter(p => p.token === token)),
        getPendingByToken: vi.fn(async (token: string) =>
            [...store.values()].filter(p => p.token === token && p.status !== 'done')),
        updateStatus: vi.fn(async (id: string, status: PendingPhoto['status'], extra?: Partial<PendingPhoto>) => {
            const record = store.get(id);
            if (record) store.set(id, { ...record, status, ...extra });
        }),
        claim: vi.fn(async (id: string, orphanedBefore: number) => {
            const record = store.get(id);
            const claimable = record && (record.status === 'pending' || record.status === 'failed'
                || (record.status === 'uploading' && (record.claimedAt ?? 0) < orphanedBefore));
            if (!record || !claimable) return null;
            const claimed = { ...record, status: 'uploading' as const, claimedAt: Date.now() };
            store.set(id, claimed);
            return claimed;
        }),
        remove: vi.fn(async (id: string) => { store.delete(id); }),
    },
}));

vi.mock('../../api/checkinApi', () => ({
    checkinApi: {
        getMobileCheckinContext: vi.fn(),
        getMobileStatus: vi.fn(),
        uploadMobilePhoto: vi.fn(),
        markMobileDone: vi.fn(),
        undoMobileDone: vi.fn(),
    },
}));

import { checkinApi } from '../../api/checkinApi';
import { useMobilePhotoUploadLogic } from './useMobilePhotoUploadLogic';

const api = vi.mocked(checkinApi);

const queued = (id: string, over: Partial<PendingPhoto> = {}): PendingPhoto => ({
    id,
    token: 'tok',
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    fileData: new ArrayBuffer(8),
    queuedAt: 1,
    status: 'pending',
    ...over,
});

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    return { promise, resolve };
};

/** Klucze, z którymi zdjęcia poszły na serwer - po jednym na wysłanie. */
const sentKeys = () => api.uploadMobilePhoto.mock.calls.map(call => call[3]);
/** Pliki, które poszły na serwer - po jednym na wysłanie. */
const sentFiles = () => api.uploadMobilePhoto.mock.calls.map(call => call[1]);

beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
    globalThis.URL.revokeObjectURL = vi.fn();
    api.getMobileCheckinContext.mockResolvedValue({ checkinId: 'c', tenantId: 't', purpose: 'CHECKIN' });
    api.getMobileStatus.mockResolvedValue({
        sessionActive: true, visitCreated: false, userDone: false, endReason: null, paused: false,
    });
});

describe('useMobilePhotoUploadLogic - jedno zdjęcie, jedno wysłanie', () => {
    it('„Ponów" w trakcie kolejki nie wysyła zdjęcia drugi raz', async () => {
        store.set('a', queued('a', { status: 'failed' }));
        store.set('b', queued('b', { status: 'failed' }));
        const slowA = deferred();
        api.uploadMobilePhoto.mockImplementation(async (_blob, fileName) => {
            if (fileName === 'a.jpg') await slowA.promise;
            return { photoId: `srv-${fileName}`, fileName, checkinId: 'c', uploadedAt: '' };
        });

        const { result } = renderHook(() => useMobilePhotoUploadLogic('tok'));
        await waitFor(() => expect(result.current.sessionState).toBe('active'));
        // Powrót z aparatu rusza kolejkę, która utyka na wolnym „a".
        await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
        await waitFor(() => expect(sentFiles()).toEqual(['a.jpg']));

        await act(async () => { result.current.handleRetry('b'); });
        await waitFor(() => expect(sentFiles()).toEqual(['a.jpg', 'b.jpg']));

        await act(async () => { slowA.resolve(); });
        await waitFor(() => expect(result.current.doneCount).toBe(2));

        expect(sentFiles()).toEqual(['a.jpg', 'b.jpg']);
        expect(sentKeys()).toEqual(['a', 'b']);
    });

    it('zdjęcie, które zostało „w drodze" na przeładowanej stronie, idzie raz, z tym samym kluczem', async () => {
        store.set('orphan', queued('orphan', { status: 'uploading', claimedAt: Date.now() - 60_000 }));
        api.uploadMobilePhoto.mockResolvedValue({ photoId: 'srv-1', fileName: 'orphan.jpg', checkinId: 'c', uploadedAt: '' });

        const { result } = renderHook(() => useMobilePhotoUploadLogic('tok'));

        await waitFor(() => expect(result.current.doneCount).toBe(1));
        expect(sentKeys()).toEqual(['orphan']);
        expect(result.current.hasPending).toBe(false);
    });

    it('zdjęcie w drodze na TEJ stronie nie jest przejmowane przez kolejkę', async () => {
        const slow = deferred();
        api.uploadMobilePhoto.mockImplementation(async (_blob, fileName) => {
            await slow.promise;
            return { photoId: 'srv', fileName, checkinId: 'c', uploadedAt: '' };
        });
        const { result } = renderHook(() => useMobilePhotoUploadLogic('tok'));
        await waitFor(() => expect(result.current.sessionState).toBe('active'));

        store.set('x', queued('x'));
        await act(async () => { result.current.handleRetry('x'); });
        await waitFor(() => expect(sentKeys()).toEqual(['x']));

        // Powrót z aparatu: strona sprawdza sesję i rusza kolejkę.
        await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
        await waitFor(() => expect(api.getMobileStatus).toHaveBeenCalled());
        await act(async () => { slow.resolve(); });

        expect(sentKeys()).toEqual(['x']);
    });
});
