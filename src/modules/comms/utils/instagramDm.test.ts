// Rozmowa z Instagrama w sprawie: Meta przyjmuje odpowiedź z CRM tylko w 24 godziny
// od ostatniej wiadomości klienta. Termin musi być widoczny, zanim ktoś zacznie pisać,
// a po nim pole odpowiedzi ma odesłać do aplikacji, a nie obiecywać wysyłkę.
import { describe, expect, it } from 'vitest';
import { describeAttachments, instagramChatUrl, isInstagramEntry, replyDeadlineLabel } from './instagramDm';

const at = (iso: string) => new Date(iso);

describe('replyDeadlineLabel', () => {
    const now = at('2026-10-16T10:00:00');

    it('podaje godzinę, gdy termin mija dziś', () => {
        expect(replyDeadlineLabel('2026-10-16T14:05:00', now)).toBe('Z CRM odpiszesz do 14:05');
    });

    it('mówi „do jutra", gdy termin mija jutro', () => {
        expect(replyDeadlineLabel('2026-10-17T09:12:00', now)).toBe('Z CRM odpiszesz do jutra, 09:12');
    });

    it('w ostatniej godzinie liczy minuty, bo liczy się ile, a nie do której', () => {
        expect(replyDeadlineLabel('2026-10-16T10:25:30', now)).toBe('Z CRM odpiszesz jeszcze przez 25 min');
        expect(replyDeadlineLabel('2026-10-16T10:00:20', now)).toBe('Z CRM odpiszesz jeszcze przez 1 min');
    });

    it('po terminie i bez terminu nie obiecuje odpowiedzi', () => {
        expect(replyDeadlineLabel('2026-10-16T09:59:00', now)).toBeNull();
        expect(replyDeadlineLabel(null, now)).toBeNull();
        expect(replyDeadlineLabel('nie-data', now)).toBeNull();
    });
});

describe('instagramChatUrl', () => {
    it('prowadzi do rozmowy z tą osobą, nie do jej profilu', () => {
        expect(instagramChatUrl('jan.k', 'https://www.instagram.com/jan.k/')).toBe('https://ig.me/m/jan.k');
        expect(instagramChatUrl('@jan.k', null)).toBe('https://ig.me/m/jan.k');
    });

    it('bez loginu zostaje profil od serwera albo nic', () => {
        expect(instagramChatUrl(null, 'https://www.instagram.com/x/')).toBe('https://www.instagram.com/x/');
        expect(instagramChatUrl('  ', null)).toBeNull();
    });
});

describe('describeAttachments', () => {
    it('nazywa to, co klient przysłał bez tekstu - tym samym słownikiem co serwer', () => {
        expect(describeAttachments([{ type: 'image', url: null }])).toBe('Zdjęcie');
        expect(describeAttachments([{ type: 'image', url: null }, { type: 'image', url: null }])).toBe('Zdjęcia (2)');
        expect(describeAttachments([{ type: 'ig_reel', url: null }])).toBe('Nagranie');
        expect(describeAttachments([{ type: 'share', url: null }])).toBe('Udostępniony post');
        expect(describeAttachments([{ type: 'story_mention', url: null }])).toBe('Wzmianka w relacji');
        expect(describeAttachments([])).toBe('Wiadomość bez treści');
    });
});

describe('isInstagramEntry', () => {
    it('rozpoznaje wiadomość z Instagrama po prefiksie nadanym przez serwer', () => {
        expect(isInstagramEntry({ id: 'instagram-5b0c' })).toBe(true);
        expect(isInstagramEntry({ id: '5b0c' })).toBe(false);
    });
});
