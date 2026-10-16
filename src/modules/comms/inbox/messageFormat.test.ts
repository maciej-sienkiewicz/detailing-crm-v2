// @vitest-environment jsdom
//
// Podgląd załącznika z cudzej poczty: w CRM-ie tylko PDF, obrazy rastrowe i tekst.
import { describe, expect, it } from 'vitest';
import type { CommAttachment } from '../types';
import { attachmentPreviewKind, isPreviewableAttachment, previewContentType } from './messageFormat';

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
