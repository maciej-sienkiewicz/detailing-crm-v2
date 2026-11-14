// @vitest-environment jsdom
//
// Podgląd załącznika z cudzej poczty: w CRM-ie tylko PDF, obrazy rastrowe i tekst.
import { describe, expect, it } from 'vitest';
import type { CommAttachment, CommMessage } from '../types';
import { attachmentPreviewKind, isPreviewableAttachment, mailTopic, previewContentType, topicChanges } from './messageFormat';

const attachment = (contentType: string, fileName = 'plik'): CommAttachment => ({
    id: 'a1',
    fileName,
    contentType,
    sizeBytes: 10,
    isInline: false,
});

describe('isPreviewableAttachment', () => {
    it('pokazuje PDF, obrazy rastrowe i tekst', () => {
        expect(isPreviewableAttachment(attachment('application/pdf'))).toBe(true);
        expect(isPreviewableAttachment(attachment('image/jpeg'))).toBe(true);
        expect(isPreviewableAttachment(attachment('IMAGE/PNG; name=x.png'))).toBe(true);
        expect(isPreviewableAttachment(attachment('text/plain; charset=utf-8'))).toBe(true);
    });

    // SVG z cudzej poczty otwarty jako karta blob: uruchamiał skrypt nadawcy w sesji CRM-a.
    it('nie pokazuje SVG ani dokumentów HTML - te się pobiera', () => {
        expect(isPreviewableAttachment(attachment('image/svg+xml', 'faktura.svg'))).toBe(false);
        expect(isPreviewableAttachment(attachment('text/html', 'faktura.html'))).toBe(false);
        expect(isPreviewableAttachment(attachment('image/x-unknown'))).toBe(false);
    });

    it('podany typ wygrywa z rozszerzeniem: SVG nazwany .png zostaje do pobrania', () => {
        expect(isPreviewableAttachment(attachment('image/svg+xml', 'zdjecie.png'))).toBe(false);
        expect(isPreviewableAttachment(attachment('text/html', 'faktura.pdf'))).toBe(false);
    });

    // Starsze programy do faktur wysyłają PDF jako „jakieś bajty".
    it('plik bez typu rozpoznaje po rozszerzeniu z zamkniętej listy', () => {
        expect(attachmentPreviewKind(attachment('application/octet-stream', 'FV 12-2026.PDF'))).toBe('pdf');
        expect(attachmentPreviewKind(attachment('', 'rysa.jpg'))).toBe('image');
        expect(previewContentType(attachment('application/octet-stream', 'rysa.jpg'))).toBe('image/jpeg');
        expect(isPreviewableAttachment(attachment('application/octet-stream', 'grafika.svg'))).toBe(false);
        expect(isPreviewableAttachment(attachment('application/octet-stream', 'strona.html'))).toBe(false);
    });
});

// Klient podał auto tylko w temacie, a w odpowiedzi napisał „tak jak w tytule". CRM tematu
// nie pokazywał, więc studio dopytało o rzecz, którą klient już podał.
describe('mailTopic - temat bez przedrostków odpowiedzi', () => {
    it('zdejmuje Re:, Odp:, Fwd:, PD: także powtórzone i w dowolnej wielkości liter', () => {
        expect(mailTopic('Oklejanie folią Audi Q5')).toBe('Oklejanie folią Audi Q5');
        expect(mailTopic('Re: Oklejanie folią Audi Q5')).toBe('Oklejanie folią Audi Q5');
        expect(mailTopic('ODP: RE: Fwd: Oklejanie')).toBe('Oklejanie');
        expect(mailTopic('Odp.: PD: Fw: Oklejanie')).toBe('Oklejanie');
        expect(mailTopic('Re[2]: Oklejanie')).toBe('Oklejanie');
    });

    it('pusty albo sam przedrostek to brak tematu', () => {
        expect(mailTopic(null)).toBeNull();
        expect(mailTopic('   ')).toBeNull();
        expect(mailTopic('Re:')).toBeNull();
    });

    it('nie tnie słów, które tylko zaczynają się jak przedrostek', () => {
        expect(mailTopic('Remont lakieru')).toBe('Remont lakieru');
        expect(mailTopic('Pdr - wgniecenie')).toBe('Pdr - wgniecenie');
    });
});

describe('topicChanges - temat przy wiadomości, gdy się zmienił', () => {
    const msg = (id: string, subject: string | null) => ({ id, subject }) as CommMessage;

    it('odpowiedzi z „Re:" nie powtarzają tematu z nagłówka', () => {
        const changes = topicChanges([msg('m1', 'Oklejanie Audi Q5'), msg('m2', 'Re: Oklejanie Audi Q5'), msg('m3', 'RE: oklejanie audi q5')], 'Oklejanie Audi Q5');
        expect([...changes]).toEqual([]);
    });

    it('nowy temat w środku rozmowy stoi przy wiadomości, która go wprowadziła', () => {
        const changes = topicChanges([msg('m1', 'Oklejanie Audi Q5'), msg('m2', 'Re: Oklejanie Audi Q5'), msg('m3', 'Termin na piątek?'), msg('m4', 'Re: Termin na piątek?')], 'Oklejanie Audi Q5');
        expect([...changes]).toEqual([['m3', 'Termin na piątek?']]);
    });

    it('bez tematu wątku pierwsza wiadomość pokazuje swój, wiadomość bez tematu niczego nie zmienia', () => {
        const changes = topicChanges([msg('m1', 'Oklejanie'), msg('m2', null), msg('m3', 'Re: Oklejanie')], null);
        expect([...changes]).toEqual([['m1', 'Oklejanie']]);
    });
});
