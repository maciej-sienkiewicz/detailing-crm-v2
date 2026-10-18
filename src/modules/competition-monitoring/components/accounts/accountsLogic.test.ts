import { describe, expect, it } from 'vitest';
import type { DmThread, GoogleReview, OwnPeriod } from '../../accountsTypes';
import {
    connectionResult,
    contactTotal,
    formatSigned,
    handleSegments,
    netFollowers,
    percentChange,
    periodCaption,
    replyDeadlineLabel,
    sinceLabel,
    sortReviews,
    sortThreads,
    splitUrgent,
    topHours,
    withoutResultParams,
} from './accountsLogic';
import {
    captionProblem,
    countHashtags,
    defaultAiSelection,
    initialSelection,
    MAX_AI_PHOTOS,
    publishSeed,
    togglePhoto,
    topicAfterVisitChange,
} from './publishLogic';

const period = (patch: Partial<OwnPeriod> = {}): OwnPeriod => ({
    reach: 1000, views: 4000, accountsEngaged: 120, totalInteractions: 300,
    follows: 40, unfollows: 12, contactTaps: { CALL: 6, DIRECTION: 3 }, ...patch,
});

describe('zmiana do poprzednich 30 dni', () => {
    it('liczy procent i zaokrągla', () => {
        expect(percentChange(1200, 1000)).toBe(20);
        expect(percentChange(900, 1000)).toBe(-10);
    });

    it('bez poprzedniego okresu albo przy zerze nie zmyśla procentu', () => {
        expect(percentChange(4, 0)).toBeNull();
        expect(percentChange(4, null)).toBeNull();
        expect(percentChange(null, 10)).toBeNull();
    });

    it('obserwujący netto to nowi minus odejścia', () => {
        expect(netFollowers(period())).toBe(28);
        expect(netFollowers(period({ unfollows: null }))).toBe(40);
        expect(netFollowers(period({ follows: null }))).toBeNull();
        expect(netFollowers(null)).toBeNull();
    });

    it('liczba netto ma znak', () => {
        expect(formatSigned(28)).toBe('+28');
        expect(formatSigned(-1200)).toBe('\u22121\u00A0200');
        expect(formatSigned(0)).toBe('0');
        expect(formatSigned(null)).toBe('—');
    });

    it('kliknięcia kontaktu sumują wszystkie przyciski', () => {
        expect(contactTotal(period())).toBe(9);
        expect(contactTotal(period({ contactTaps: {} }))).toBe(0);
        expect(contactTotal(null)).toBeNull();
    });
});

describe('godziny aktywności', () => {
    it('trzy najlepsze godziny rosnąco, remis wygrywa wcześniejsza', () => {
        const hours = Array.from({ length: 24 }, () => 0);
        hours[20] = 90; hours[19] = 80; hours[8] = 80; hours[21] = 80;
        expect(topHours(hours)).toEqual([8, 19, 20]);
    });

    it('bez danych nic nie podświetla', () => {
        expect(topHours(Array.from({ length: 24 }, () => 0))).toEqual([]);
        expect(topHours([])).toEqual([]);
    });
});

describe('kolejność list', () => {
    const thread = (id: string, awaitingReply: boolean, lastMessageAt: string): DmThread => ({
        id, username: id, displayName: null, leadId: null, leadStatus: null, lastMessageAt,
        lastSnippet: null, awaitingReply, unreadCount: 0, replyDeadline: null,
    });

    it('rozmowy czekające na odpowiedź idą pierwsze', () => {
        const sorted = sortThreads([
            thread('a', false, '2026-10-16T10:00:00Z'),
            thread('b', true, '2026-10-15T10:00:00Z'),
            thread('c', true, '2026-10-16T09:00:00Z'),
        ]);
        expect(sorted.map(t => t.id)).toEqual(['c', 'b', 'a']);
    });

    it('opinie bez odpowiedzi idą pierwsze', () => {
        const review = (id: string, replied: boolean, createdAt: string): GoogleReview => ({
            id, reviewerName: null, starRating: 5, comment: null, createdAt,
            replyComment: replied ? 'Dziękujemy' : null, replyAt: null,
        });
        const sorted = sortReviews([
            review('a', true, '2026-10-16T10:00:00Z'),
            review('b', false, '2026-10-01T10:00:00Z'),
        ]);
        expect(sorted.map(r => r.id)).toEqual(['b', 'a']);
    });

    it('termin odpowiedzi tego samego dnia to sama godzina', () => {
        const now = new Date(2026, 9, 16, 9, 0);
        expect(replyDeadlineLabel(new Date(2026, 9, 16, 14, 30).toISOString(), now)).toBe('odpisz do 14:30');
        expect(replyDeadlineLabel(new Date(2026, 9, 17, 9, 5).toISOString(), now)).toMatch(/^odpisz do 17 paź.*, 09:05$/);
    });
});

describe('kiedy odświeżono', () => {
    it('mówi po ludzku, bez pełnej daty dla dzisiejszych', () => {
        const now = new Date(2026, 9, 16, 12, 0);
        expect(sinceLabel(new Date(2026, 9, 16, 11, 59).toISOString(), now)).toBe('przed chwilą');
        expect(sinceLabel(new Date(2026, 9, 16, 11, 45).toISOString(), now)).toBe('15 min temu');
        expect(sinceLabel(new Date(2026, 9, 16, 7, 10).toISOString(), now)).toBe('4 godz. temu');
        expect(sinceLabel(new Date(2026, 9, 15, 7, 10).toISOString(), now)).toBe('wczoraj');
        expect(sinceLabel(null, now)).toBeNull();
    });
});

describe('powrót z logowania', () => {
    it('każdy wynik ma zdanie dla właściciela', () => {
        expect(connectionResult(new URLSearchParams('polaczenie=ok'))?.tone).toBe('ok');
        expect(connectionResult(new URLSearchParams('polaczenie=wybierz'))?.tone).toBe('info');
        expect(connectionResult(new URLSearchParams('polaczenie=blad&powod=brak-konta'))?.text)
            .toContain('firmowym kontem Instagram');
        expect(connectionResult(new URLSearchParams('google=blad&powod=brak-zgody'))?.text).toContain('zgody');
        expect(connectionResult(new URLSearchParams('google=blad&powod=cos-nowego'))?.tone).toBe('danger');
        expect(connectionResult(new URLSearchParams('widok=moj'))).toBeNull();
    });

    it('po pokazaniu komunikatu zostaje tylko widok', () => {
        const cleaned = withoutResultParams(new URLSearchParams('widok=moj&polaczenie=blad&powod=wygaslo'));
        expect(cleaned.toString()).toBe('widok=moj');
    });
});

describe('publikacja', () => {
    it('podpis ponad limit znaków albo hashtagów nie przejdzie', () => {
        expect(captionProblem('Ceramika na BMW #detailing #ceramika')).toBeNull();
        expect(captionProblem('a'.repeat(2201))).toContain('2200');
        expect(captionProblem(Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' '))).toContain('30');
        expect(countHashtags('#PPF i #zółć, ale nie # samo')).toBe(2);
    });

    it('kolejność zaznaczenia to kolejność karuzeli, jedenaste się nie dokłada', () => {
        expect(togglePhoto(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
        expect(togglePhoto(['a'], 'd')).toEqual(['a', 'd']);
        const full = Array.from({ length: 10 }, (_, i) => `p${i}`);
        expect(togglePhoto(full, 'x')).toBe(full);
    });

    it('generator otwarty z wizyty zaznacza jej zdjęcia', () => {
        const visits = [{
            visitId: 'v1', visitNumber: 'W/1', vehicle: 'Volvo XC60', date: '2026-10-14T10:00:00Z',
            photos: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, thumbnailUrl: 'u' })),
        }];
        expect(initialSelection(visits, 'v1')).toHaveLength(10);
        expect(initialSelection(visits, 'v2')).toEqual([]);
        expect(initialSelection(visits, undefined)).toEqual([]);
    });
});

describe('zdjęcia dla generatora', () => {
    const visit = (id: string, vehicle: string, photos: number) => ({
        visitId: id, visitNumber: null, vehicle, date: '2026-10-15T10:00:00Z',
        photos: Array.from({ length: photos }, (_, i) => ({ id: `${id}-${i}`, thumbnailUrl: '' })),
    });

    it('domyślnie pierwsze cztery zdjęcia, limit sześciu przy zaznaczaniu', () => {
        expect(defaultAiSelection(visit('v1', 'BMW X5', 8))).toEqual(['v1-0', 'v1-1', 'v1-2', 'v1-3']);
        expect(defaultAiSelection(visit('v2', 'Audi', 2))).toEqual(['v2-0', 'v2-1']);
        expect(defaultAiSelection(undefined)).toEqual([]);
        const six = ['a', 'b', 'c', 'd', 'e', 'f'];
        expect(togglePhoto(six, 'g', MAX_AI_PHOTOS)).toEqual(six);
    });

    it('temat automatyczny idzie za autem, własny zostaje', () => {
        const x5 = visit('v1', 'BMW X5', 1);
        const a4 = visit('v2', 'Audi A4', 1);
        expect(topicAfterVisitChange('Realizacja: BMW X5', a4)).toBe('Realizacja: Audi A4');
        expect(topicAfterVisitChange('', x5)).toBe('Realizacja: BMW X5');
        expect(topicAfterVisitChange('Promocja na zimę', a4)).toBe('Promocja na zimę');
        expect(topicAfterVisitChange('Realizacja: BMW X5', undefined)).toBe('');
    });

    it('publikacja startuje od zdjęć, które widział model', () => {
        const visits = [visit('v1', 'BMW X5', 3)];
        expect(publishSeed(['v1-2', 'v1-0'], visits, 'v1')).toEqual(['v1-2', 'v1-0']);
        expect(publishSeed([], visits, 'v1')).toEqual(['v1-0', 'v1-1', 'v1-2']);
    });
});

describe('telefon', () => {
    const urgent = (n: number) => n % 2 === 0;

    it('pilne widać od razu, reszta czeka za „Pokaż"', () => {
        expect(splitUrgent([2, 4, 1, 3], urgent, 3)).toEqual({ shown: [2, 4], hidden: [1, 3] });
    });

    it('gdy nic nie czeka, widać kilka pierwszych, a nie pusty panel', () => {
        expect(splitUrgent([1, 3, 5, 7], urgent, 2)).toEqual({ shown: [1, 3], hidden: [5, 7] });
        expect(splitUrgent([1], urgent, 2)).toEqual({ shown: [1], hidden: [] });
        expect(splitUrgent([], urgent, 2)).toEqual({ shown: [], hidden: [] });
    });

    it('uchwyt łamie się za „_" i „.", nie w środku słowa', () => {
        expect(handleSegments('@detailing_studio_mokotow')).toEqual(['@detailing_', 'studio_', 'mokotow']);
        expect(handleSegments('@kasia.lis')).toEqual(['@kasia.', 'lis']);
        expect(handleSegments('@studio')).toEqual(['@studio']);
        expect(handleSegments('@detailing_studio_mokotow').join('')).toBe('@detailing_studio_mokotow');
    });

    it('podpis okresu mówi o porównaniu tylko, gdy jest z czym porównać', () => {
        expect(periodCaption(true)).toBe('Ostatnie 30 dni, zmiana do poprzednich 30');
        expect(periodCaption(false)).toBe('Ostatnie 30 dni');
    });
});
