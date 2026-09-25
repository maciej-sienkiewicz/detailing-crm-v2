// src/modules/comms/utils/replyDraft.test.ts
import { describe, expect, it } from 'vitest';
import type { ReplyDraft } from '../types';
import { draftOriginLabel, pendingPlaceholders, sentMaterialHint } from './replyDraft';

const draft = (overrides: Partial<ReplyDraft> = {}): ReplyDraft => ({
    bodyText: 'Dzień dobry, zapraszam [proponowany termin].',
    useSentStyle: true,
    styleApplied: true,
    examples: [],
    placeholders: ['[proponowany termin]'],
    unverifiedAmounts: [],
    notice: null,
    ...overrides,
});

const example = { threadId: 't', subject: 'Wycena', sentAt: '2026-09-01T10:00:00Z', similarity: 0.8 };

describe('draftOriginLabel', () => {
    it('szkic w stylu studia mówi, z ilu odpowiedzi powstał - z polską odmianą', () => {
        expect(draftOriginLabel(draft({ examples: [example] }))).toBe(
            'Szkic w Twoim stylu, na podstawie 1 wysłanej odpowiedzi na podobne pytania.'
        );
        expect(draftOriginLabel(draft({ examples: [example, example, example, example] }))).toBe(
            'Szkic w Twoim stylu, na podstawie 4 wysłanych odpowiedzi na podobne pytania.'
        );
    });

    it('gdy stylu nie dało się zastosować, pokazuje wyjaśnienie serwera', () => {
        expect(
            draftOriginLabel(draft({ styleApplied: false, notice: 'Nie znaleźliśmy jeszcze wysłanych odpowiedzi.' }))
        ).toBe('Nie znaleźliśmy jeszcze wysłanych odpowiedzi.');
        expect(draftOriginLabel(draft({ useSentStyle: false, styleApplied: false }))).toBe('Propozycja asystenta.');
    });
});

describe('sentMaterialHint', () => {
    it('odmienia liczbę wysłanych wiadomości', () => {
        expect(sentMaterialHint(1)).toBe('W skrzynce jest 1 wysłana wiadomość.');
        expect(sentMaterialHint(3)).toBe('W skrzynce jest 3 wysłane wiadomości.');
        expect(sentMaterialHint(12)).toBe('W skrzynce jest 12 wysłanych wiadomości.');
    });

    it('bez wysłanych wiadomości uprzedza, że będzie propozycja asystenta', () => {
        expect(sentMaterialHint(0)).toMatch(/asystent napisze własną propozycję/);
    });
});

describe('pendingPlaceholders', () => {
    it('zostają tylko znaczniki, które wciąż stoją w treści', () => {
        const current = draft({ placeholders: ['[proponowany termin]', '[adres studia]'] });
        expect(pendingPlaceholders(current, 'Zapraszam [proponowany termin], ul. Polna 1.')).toEqual([
            '[proponowany termin]',
        ]);
        expect(pendingPlaceholders(current, 'Zapraszam we wtorek, ul. Polna 1.')).toEqual([]);
    });

    it('bez szkicu nie ma czego pilnować', () => {
        expect(pendingPlaceholders(null, 'tekst [cokolwiek]')).toEqual([]);
    });
});
