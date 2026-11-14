// @vitest-environment jsdom
//
// Wersje robocze odpowiedzi: zgłoszenie biznesu - pracownik zaczyna odpisywać na leada,
// przechodzi do kalendarza sprawdzić terminy, wraca i wiadomości już nie ma.
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
    UNSENT_REPLY_TTL_MS,
    discardUnsentReply,
    leadUnsentReplyKey,
    loadUnsentReply,
    saveUnsentReply,
    unsentReplyKey,
    unsentReplyKeys,
    useUnsentReplyKeys,
    type UnsentReply,
} from './unsentReplies';

const reply = (overrides: Partial<UnsentReply> = {}): UnsentReply => ({
    to: null,
    subject: '',
    body: '<p>Dzień dobry, mamy wolny termin we wtorek</p>',
    galleryPhotos: [],
    signatureChoice: null,
    closeReason: null,
    aiDraft: null,
    appliedPrepared: null,
    preparedInEditor: false,
    savedAt: new Date().toISOString(),
    ...overrides,
});

describe('wersje robocze odpowiedzi', () => {
    beforeEach(() => {
        ['u-1', 'u-2'].forEach((user) => unsentReplyKeys(user).forEach((key) => discardUnsentReply(user, key)));
        window.localStorage.clear();
    });

    it('klucz rozmowy: wątek, potem pierwsza wiadomość leada, potem nowa wiadomość z konta', () => {
        expect(unsentReplyKey({ threadId: 't-1', leadId: 'l-1', accountId: 'a-1' })).toBe('thread:t-1');
        expect(unsentReplyKey({ leadId: 'l-1', accountId: 'a-1' })).toBe('lead:l-1');
        expect(unsentReplyKey({ accountId: 'a-1' })).toBe('new:a-1');
        expect(unsentReplyKey({})).toBeNull();
        // Lead na liście wskazuje to samo okno, które się otworzy.
        expect(leadUnsentReplyKey({ id: 'l-1', threadId: 't-1' })).toBe('thread:t-1');
        expect(leadUnsentReplyKey({ id: 'l-1', threadId: null })).toBe('lead:l-1');
    });

    it('zapisana odpowiedź wraca razem z plikami z dysku, a odrzucona znika', () => {
        const photo = new File(['x'], 'lakier.jpg', { type: 'image/jpeg' });
        saveUnsentReply('u-1', 'thread:t-1', reply({ subject: 'Oklejanie' }), [photo]);

        const loaded = loadUnsentReply('u-1', 'thread:t-1');
        expect(loaded?.reply).toMatchObject({ subject: 'Oklejanie', body: '<p>Dzień dobry, mamy wolny termin we wtorek</p>' });
        expect(loaded?.attachments).toEqual([photo]);

        discardUnsentReply('u-1', 'thread:t-1');
        expect(loadUnsentReply('u-1', 'thread:t-1')).toBeNull();
    });

    it('wersja robocza jednej osoby nie pokazuje się drugiej na tym samym komputerze', () => {
        saveUnsentReply('u-1', 'thread:t-1', reply(), []);

        expect(loadUnsentReply('u-2', 'thread:t-1')).toBeNull();
        expect(unsentReplyKeys('u-1')).toEqual(['thread:t-1']);
        expect(unsentReplyKeys('u-2')).toEqual([]);
    });

    it('po 14 dniach wersja robocza wygasa i znika z pamięci przeglądarki', () => {
        const savedAt = new Date('2026-11-01T10:00:00Z');
        saveUnsentReply('u-1', 'thread:t-1', reply({ savedAt: savedAt.toISOString() }), []);

        expect(loadUnsentReply('u-1', 'thread:t-1', savedAt.getTime() + UNSENT_REPLY_TTL_MS - 1000)).not.toBeNull();
        expect(loadUnsentReply('u-1', 'thread:t-1', savedAt.getTime() + UNSENT_REPLY_TTL_MS + 1000)).toBeNull();
        expect(window.localStorage.length).toBe(0);
    });

    it('po odświeżeniu strony tekst zostaje, choć plików z dysku już nie ma', () => {
        saveUnsentReply('u-1', 'lead:l-1', reply(), [new File(['x'], 'a.pdf')]);
        // Odświeżenie = pusta pamięć karty, a localStorage zostaje.
        const stored = window.localStorage.getItem('crm:unsent-reply:v1:u-1:lead:l-1');
        discardUnsentReply('u-1', 'lead:l-1');
        window.localStorage.setItem('crm:unsent-reply:v1:u-1:lead:l-1', stored!);

        expect(loadUnsentReply('u-1', 'lead:l-1')).toMatchObject({ attachments: [], reply: { body: reply().body } });
    });

    it('znacznik na listach pojawia się po zapisaniu i znika po wysłaniu', () => {
        const { result } = renderHook(() => useUnsentReplyKeys('u-1'));
        expect(result.current.has('thread:t-1')).toBe(false);

        act(() => saveUnsentReply('u-1', 'thread:t-1', reply(), []));
        expect(result.current.has('thread:t-1')).toBe(true);

        act(() => discardUnsentReply('u-1', 'thread:t-1'));
        expect(result.current.has('thread:t-1')).toBe(false);
    });
});
