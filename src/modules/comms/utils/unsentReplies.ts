// src/modules/comms/utils/unsentReplies.ts
//
// Wersje robocze odpowiedzi: to, co ktoś zaczął pisać do klienta i jeszcze nie wysłał.
//
// Zgłoszenie biznesu: pracownik zaczyna odpisywać na leada, przechodzi do kalendarza
// sprawdzić wolne terminy, wraca - i cała wiadomość znika. Okno odpowiedzi trzymało
// treść tylko w swoim stanie, a przejście do innego widoku je odmontowuje. Teraz każda
// zmiana trafia tutaj i okno przy powrocie zaczyna od tego, co zostało.
//
// Dwie warstwy, bo nie wszystko da się zapisać tak samo:
//  - localStorage - tekst, temat, adresat, zdjęcia z galerii i stan szkicu AI. Przeżywa
//    odświeżenie strony, a na telefonie także zamknięcie aplikacji przez system, gdy
//    ktoś przełączy się na chwilę do innej.
//  - pamięć karty - pliki dołączone z dysku. Pliku nie da się zapisać w localStorage,
//    ale przejście do kalendarza i z powrotem nie zamyka karty, więc w tej sytuacji
//    załączniki też wracają. Po odświeżeniu strony trzeba je dodać ponownie.
//
// Klucz zawiera id osoby: na wspólnym komputerze kilku pracowników przełącza się PIN-em,
// a wersja robocza jednej osoby nie może się pokazać drugiej - wysłałaby ją pod swoim
// nazwiskiem.
import { useMemo, useSyncExternalStore } from 'react';
import type { GalleryPhoto } from '@/modules/gallery/types';
import type { ReplyDraft } from '../types';

/** Ile wersja robocza czeka. Starsza dotyczy rozmowy, która dawno poszła dalej. */
export const UNSENT_REPLY_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const PREFIX = 'crm:unsent-reply:v1:';

export interface UnsentReply {
    /** Adresat wpisany ręcznie; null - ten, którego okno podstawia samo. */
    to: string | null;
    subject: string;
    /** Surowy HTML edytora, tak jak trzyma go okno odpowiedzi. */
    body: string;
    galleryPhotos: GalleryPhoto[];
    signatureChoice: boolean | null;
    /** Gotowa odmowa zamyka zapytanie po wysłaniu - decyzja nie może zniknąć po drodze. */
    closeReason: string | null;
    /** Szkic AI: jego znaczniki „[…]" blokują wysyłkę, dopóki ich nie uzupełniono. */
    aiDraft: ReplyDraft | null;
    appliedPrepared: string | null;
    preparedInEditor: boolean;
    savedAt: string;
}

export interface StoredUnsentReply {
    reply: UnsentReply;
    /** Pliki z dysku - tylko dopóki karta jest otwarta. */
    attachments: File[];
}

/** Rozmowa, do której pisze okno: wątek, pierwsza wiadomość leada albo nowa wiadomość z konta. */
export function unsentReplyKey(target: { threadId?: string | null; leadId?: string | null; accountId?: string | null }): string | null {
    if (target.threadId) return `thread:${target.threadId}`;
    if (target.leadId) return `lead:${target.leadId}`;
    if (target.accountId) return `new:${target.accountId}`;
    return null;
}

/** Klucz wersji roboczej leada na liście i tablicy - ten sam, którego użyje jego okno odpowiedzi. */
export const leadUnsentReplyKey = (lead: { id: string; threadId: string | null }): string =>
    lead.threadId ? `thread:${lead.threadId}` : `lead:${lead.id}`;

const storageKey = (userId: string, key: string) => `${PREFIX}${userId}:${key}`;

const memory = new Map<string, File[]>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
    version += 1;
    listeners.forEach((listener) => listener());
}

function readStorage(name: string): string | null {
    try {
        return window.localStorage.getItem(name);
    } catch {
        return null;
    }
}

function removeStorage(name: string) {
    try {
        window.localStorage.removeItem(name);
    } catch {
        // Zablokowany localStorage: nie ma czego usuwać.
    }
}

function parse(raw: string | null, now: number): UnsentReply | null {
    if (!raw) return null;
    try {
        const reply = JSON.parse(raw) as UnsentReply;
        const savedAt = Date.parse(reply.savedAt);
        if (!Number.isFinite(savedAt) || now - savedAt > UNSENT_REPLY_TTL_MS) return null;
        return typeof reply.body === 'string' ? reply : null;
    } catch {
        return null;
    }
}

export function loadUnsentReply(userId: string, key: string, now = Date.now()): StoredUnsentReply | null {
    const name = storageKey(userId, key);
    const reply = parse(readStorage(name), now);
    if (!reply) {
        // Przeterminowana albo uszkodzona - nie ma po co jej trzymać.
        removeStorage(name);
        memory.delete(name);
        return null;
    }
    return { reply, attachments: memory.get(name) ?? [] };
}

export function saveUnsentReply(userId: string, key: string, reply: UnsentReply, attachments: File[]) {
    const name = storageKey(userId, key);
    const hadDraft = readStorage(name) !== null || memory.has(name);
    try {
        window.localStorage.setItem(name, JSON.stringify(reply));
    } catch {
        // Pełny albo zablokowany localStorage: zostaje przynajmniej pamięć karty.
    }
    memory.set(name, attachments);
    // Znacznik na listach zmienia się tylko przy pojawieniu się wersji - nie przy każdym znaku.
    if (!hadDraft) notify();
}

export function discardUnsentReply(userId: string, key: string) {
    const name = storageKey(userId, key);
    const hadDraft = readStorage(name) !== null || memory.has(name);
    removeStorage(name);
    memory.delete(name);
    if (hadDraft) notify();
}

/** Klucze rozmów z wersją roboczą tej osoby (bez przeterminowanych). */
export function unsentReplyKeys(userId: string, now = Date.now()): string[] {
    const own = `${PREFIX}${userId}:`;
    const keys: string[] = [];
    try {
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const name = window.localStorage.key(index);
            if (name?.startsWith(own) && parse(readStorage(name), now)) keys.push(name.slice(own.length));
        }
    } catch {
        // Zablokowany localStorage - zostają same wpisy z pamięci karty.
    }
    memory.forEach((_files, name) => {
        if (name.startsWith(own) && !keys.includes(name.slice(own.length))) keys.push(name.slice(own.length));
    });
    return keys.sort();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Druga karta zapisała albo wysłała wersję - znacznik ma się zgadzać i tutaj.
    const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key.startsWith(PREFIX)) notify();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

// Lista i tablica renderują się często (przeciąganie kart), a odczyt przegląda localStorage -
// liczymy go raz na zmianę, nie raz na render.
let cached: { userId: string; version: number; value: string } | null = null;

function keysSnapshot(userId: string): string {
    if (cached?.userId !== userId || cached.version !== version) {
        cached = { userId, version, value: unsentReplyKeys(userId).join('\n') };
    }
    return cached.value;
}

/** Rozmowy z wersją roboczą - do znacznika „Wersja robocza" na listach. */
export function useUnsentReplyKeys(userId: string | null | undefined): Set<string> {
    const snapshot = useSyncExternalStore(subscribe, () => (userId ? keysSnapshot(userId) : ''));
    return useMemo(() => new Set(snapshot ? snapshot.split('\n') : []), [snapshot]);
}
