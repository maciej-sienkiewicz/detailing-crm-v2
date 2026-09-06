import { describe, expect, it } from 'vitest';
import { describeReplyState, leadReplyTone } from './leadReply';

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Znacznik czasu sprzed `ms` milisekund - „czeka od tylu". */
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('describeReplyState - ruch po naszej stronie', () => {
    it('świeże zapytanie klienta woła o kontakt i jest czerwone', () => {
        const marker = describeReplyState('AWAITING_OUR_REPLY', ago(2 * HOUR));

        expect(marker.label).toBe('Wymagany kontakt');
        // Czerwień od pierwszej minuty: „klient napisał ostatni" to zawsze zadanie
        // dla nas, a nie stan neutralny, który czytelnik ma sam ocenić.
        expect(marker.tone).toBe('due');
    });

    it('po dobie etykieta nazywa zwłokę, kolor się nie zmienia', () => {
        const marker = describeReplyState('AWAITING_OUR_REPLY', ago(3 * DAY));

        expect(marker.label).toBe('Czeka 3 dni');
        expect(marker.tone).toBe('due');
        expect(marker.title).toBe('Klient czeka na odpowiedź od 3 dni');
    });
});

describe('describeReplyState - ruch po stronie klienta', () => {
    it('normalny rytm rozmowy zostaje szary', () => {
        const marker = describeReplyState('AWAITING_CLIENT_REPLY', ago(2 * DAY));

        expect(marker.label).toBe('U klienta');
        expect(marker.tone).toBe('neutral');
    });

    it('cisza klienta ostrzega, ale nie oskarża - pomarańczowy, nie czerwony', () => {
        const marker = describeReplyState('AWAITING_CLIENT_REPLY', ago(6 * DAY));

        expect(marker.label).toBe('Cisza 6 dni');
        expect(marker.tone).toBe('stale');
    });
});

describe('leadReplyTone', () => {
    it('lead zamknięty i lead bez rozmowy nie mają czyjego ruchu', () => {
        expect(leadReplyTone('AWAITING_OUR_REPLY', ago(3 * DAY), true)).toBe('neutral');
        expect(leadReplyTone('NO_CONVERSATION', ago(3 * DAY))).toBe('neutral');
        expect(leadReplyTone('AWAITING_OUR_REPLY', null)).toBe('neutral');
    });

    it('daje ten sam ton co znacznik - pasek wiersza i etykieta nie mogą się rozjechać', () => {
        const waiting = ago(2 * HOUR);
        expect(leadReplyTone('AWAITING_OUR_REPLY', waiting))
            .toBe(describeReplyState('AWAITING_OUR_REPLY', waiting).tone);
    });
});
