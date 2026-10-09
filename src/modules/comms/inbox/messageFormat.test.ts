// @vitest-environment jsdom
//
// Podgląd załącznika z cudzej poczty: w karcie tylko PDF i obrazy rastrowe.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommAttachment } from '../types';
import { isPreviewableAttachment, previewAttachmentFile } from './messageFormat';

const attachment = (contentType: string, fileName = 'plik'): CommAttachment => ({
    id: 'a1',
    fileName,
    contentType,
    sizeBytes: 10,
    isInline: false,
});

describe('isPreviewableAttachment', () => {
    it('pokazuje PDF i obrazy rastrowe', () => {
        expect(isPreviewableAttachment(attachment('application/pdf'))).toBe(true);
        expect(isPreviewableAttachment(attachment('image/jpeg'))).toBe(true);
        expect(isPreviewableAttachment(attachment('IMAGE/PNG; name=x.png'))).toBe(true);
    });

    // SVG z cudzej poczty otwarty jako karta blob: uruchamiał skrypt nadawcy w sesji CRM-a.
    it('nie pokazuje SVG ani dokumentów HTML - te się pobiera', () => {
        expect(isPreviewableAttachment(attachment('image/svg+xml', 'faktura.svg'))).toBe(false);
        expect(isPreviewableAttachment(attachment('text/html', 'faktura.html'))).toBe(false);
        expect(isPreviewableAttachment(attachment('image/x-unknown'))).toBe(false);
    });
});

describe('previewAttachmentFile', () => {
    afterEach(() => vi.restoreAllMocks());

    it('SVG pobiera zamiast otwierać w karcie', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        URL.createObjectURL = vi.fn(() => 'blob:x');
        URL.revokeObjectURL = vi.fn();

        await previewAttachmentFile(async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }), attachment('image/svg+xml', 'a.svg'));

        expect(open).not.toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
    });

    it('typ bloba w karcie pochodzi z listy, nie z odpowiedzi serwera', async () => {
        const tab = { location: { href: '' }, opener: {} as unknown, close: vi.fn() };
        vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
        let created: Blob | undefined;
        URL.createObjectURL = vi.fn((b: Blob) => {
            created = b;
            return 'blob:y';
        });

        await previewAttachmentFile(async () => new Blob(['x'], { type: 'image/svg+xml' }), attachment('image/png', 'a.png'));

        expect(created?.type).toBe('image/png');
        expect(tab.opener).toBeNull();
        expect(tab.location.href).toBe('blob:y');
    });
});
