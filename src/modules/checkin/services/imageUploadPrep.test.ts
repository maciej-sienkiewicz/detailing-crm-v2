import { describe, it, expect } from 'vitest';
import {
    resolveFileType,
    isUploadReady,
    MAX_UPLOAD_BYTES,
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
