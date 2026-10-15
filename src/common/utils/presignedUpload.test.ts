import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresignedUploadError, photoUploadContentType, putToPresignedUrl } from './presignedUpload';

describe('photoUploadContentType', () => {
    // Musi liczyć to samo co PhotoSessionService.contentTypeFromFileName - inaczej S3
    // odrzuca podpis, a rekord zdjęcia zostaje bez pliku.
    it.each([
        ['IMG_1.JPG', 'image/jpeg'],
        ['a.jpeg', 'image/jpeg'],
        ['a.png', 'image/png'],
        ['a.WebP', 'image/webp'],
        ['a.heic', 'image/jpeg'],
        ['a.gif', 'image/jpeg'],
        ['bez-rozszerzenia', 'image/jpeg'],
    ])('%s -> %s', (name, type) => {
        expect(photoUploadContentType(name)).toBe(type);
    });
});

describe('putToPresignedUrl', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('sends exactly the signed Content-Type', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', fetchMock);
        await putToPresignedUrl('https://s3/put', new Blob(['x'], { type: 'image/heic' }), 'image/jpeg');
        expect(fetchMock).toHaveBeenCalledWith('https://s3/put', expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
        }));
    });

    it('throws when S3 rejects the upload (fetch itself does not)', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
        await expect(putToPresignedUrl('https://s3/put', new Blob(['x']), 'image/jpeg'))
            .rejects.toBeInstanceOf(PresignedUploadError);
    });

    it('throws a readable error when the network fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(putToPresignedUrl('https://s3/put', new Blob(['x']), 'image/jpeg'))
            .rejects.toThrow(/połączenie/);
    });
});
