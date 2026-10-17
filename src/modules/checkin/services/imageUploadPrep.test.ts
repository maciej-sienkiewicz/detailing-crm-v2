// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import {
    resolveFileType,
    isUploadReady,
    MAX_UPLOAD_BYTES,
    prepareImageForVin,
} from './imageUploadPrep';

const fileOf = (name: string, type: string, size = 1024): File => {
    const file = new File([new Uint8Array(1)], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
};

describe('resolveFileType', () => {
    it('uses the type reported by the browser', () => {
        expect(resolveFileType(fileOf('photo.jpg', 'image/JPEG'))).toBe('image/jpeg');
    });

    it('falls back to the extension when the picker reports no type', () => {
        // Some Android gallery providers hand over an empty `type`
        expect(resolveFileType(fileOf('IMG_0042.HEIC', ''))).toBe('image/heic');
        expect(resolveFileType(fileOf('scan.PNG', ''))).toBe('image/png');
    });

    it('returns an empty string for an unknown extension', () => {
        expect(resolveFileType(fileOf('notes.txt', ''))).toBe('');
    });
});

describe('isUploadReady', () => {
    it('accepts a small JPEG as-is', () => {
        expect(isUploadReady(fileOf('photo.jpg', 'image/jpeg', 2_000_000))).toBe(true);
    });

    it('rejects HEIC, so it gets re-encoded before upload', () => {
        expect(isUploadReady(fileOf('IMG_0042.HEIC', 'image/heic', 2_000_000))).toBe(false);
    });

    it('rejects an accepted type that exceeds the upload limit', () => {
        expect(isUploadReady(fileOf('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1))).toBe(false);
    });
});

describe('prepareImageForVin', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('sends a small accepted photo untouched', async () => {
        const small = fileOf('vin.jpg', 'image/jpeg', 300 * 1024);
        expect(await prepareImageForVin(small)).toBe(small);
    });

    it('scales a phone original down to the 2048 px the model reads', async () => {
        // 12 Mpx photo: the model reads at most 2048 px, so the rest is pure upload time.
        const close = vi.fn();
        vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
        const drawImage = vi.fn();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
        let canvasSize: [number, number] = [0, 0];
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
            canvasSize = [this.width, this.height];
            cb(new Blob([new Uint8Array(10)], { type: 'image/jpeg' }));
        });

        const result = await prepareImageForVin(fileOf('IMG_1234.jpg', 'image/jpeg', 6_000_000));

        expect(canvasSize).toEqual([2048, 1536]);
        expect(result.type).toBe('image/jpeg');
        expect(result.name).toBe('IMG_1234.jpg');
        expect(close).toHaveBeenCalled();
    });

    it('falls back to the original when the browser cannot re-encode it', async () => {
        // A slower read beats no read: the backend still accepts the original.
        vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }));
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

        const original = fileOf('IMG_1234.jpg', 'image/jpeg', 6_000_000);
        expect(await prepareImageForVin(original)).toBe(original);
    });
});
