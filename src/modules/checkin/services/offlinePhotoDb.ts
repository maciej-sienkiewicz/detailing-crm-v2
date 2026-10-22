// src/modules/checkin/services/offlinePhotoDb.ts
// IndexedDB wrapper for offline photo queue (no localStorage, multi-tenant safe)

import type { PendingPhoto } from '../types';

const DB_NAME = 'checkin-offline-photos';
const DB_VERSION = 1;
const STORE_NAME = 'pending-photos';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('token', 'token', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function tx(
    db: IDBDatabase,
    mode: IDBTransactionMode
): IDBObjectStore {
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export const offlinePhotoDb = {
    async add(photo: PendingPhoto): Promise<void> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = tx(db, 'readwrite');
            const req = store.add(photo);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async getByToken(token: string): Promise<PendingPhoto[]> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = tx(db, 'readonly');
            const index = store.index('token');
            const req = index.getAll(token);
            req.onsuccess = () => resolve(req.result as PendingPhoto[]);
            req.onerror = () => reject(req.error);
        });
    },

    async updateStatus(
        id: string,
        status: PendingPhoto['status'],
        extra?: Partial<Pick<PendingPhoto, 'error' | 'uploadedPhotoId'>>
    ): Promise<void> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = tx(db, 'readwrite');
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const record = getReq.result as PendingPhoto | undefined;
                if (!record) { resolve(); return; }
                const updated: PendingPhoto = { ...record, status, ...extra };
                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    /**
     * Zajmuje zdjęcie do wysyłki: odczyt i zapis statusu w JEDNEJ transakcji, więc z dwóch
     * chętnych (wybór pliku, „Ponów", kolejka co 30 s, powrót z aparatu, druga karta z tym
     * samym kodem) wygrywa dokładnie jeden. Zwraca rekord albo null, gdy zdjęcie jest już
     * wysłane albo w drodze.
     *
     * Dawniej kolejka czytała listę oczekujących raz i wysyłała ją po kolei, a wybór pliku
     * i „Ponów" wysyłały obok niej - to samo zdjęcie szło na serwer dwa razy, a serwer każde
     * wysłanie zapisuje jako nowe zdjęcie.
     *
     * `uploading` zajęte przed [orphanedBefore] należy do strony, której już nie ma (iPhone
     * przeładował ją po powrocie z aparatu) - bez przejęcia wisiało jako „Oczekujące"
     * i blokowało „Gotowe". Ponowienie takiego zdjęcia jest bezpieczne, bo serwer rozpoznaje
     * je po kluczu (Idempotency-Key) i oddaje zapisane wcześniej.
     */
    async claim(id: string, orphanedBefore: number): Promise<PendingPhoto | null> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = tx(db, 'readwrite');
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const record = getReq.result as PendingPhoto | undefined;
                const claimable = record && (
                    record.status === 'pending'
                    || record.status === 'failed'
                    || (record.status === 'uploading' && (record.claimedAt ?? 0) < orphanedBefore)
                );
                if (!record || !claimable) { resolve(null); return; }
                const claimed: PendingPhoto = { ...record, status: 'uploading', claimedAt: Date.now(), error: undefined };
                const putReq = store.put(claimed);
                putReq.onsuccess = () => resolve(claimed);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async remove(id: string): Promise<void> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = tx(db, 'readwrite');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    /** Wszystko, czego serwer jeszcze nie potwierdził. Które z nich wysłać, rozstrzyga [claim]. */
    async getPendingByToken(token: string): Promise<PendingPhoto[]> {
        const all = await this.getByToken(token);
        return all.filter(p => p.status !== 'done');
    },
};
