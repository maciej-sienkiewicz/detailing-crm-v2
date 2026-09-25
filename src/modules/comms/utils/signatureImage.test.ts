import { describe, expect, it } from 'vitest';
import { appAssetUrl, cropGeometry, validateSignatureImageFile } from './signatureImage';

describe('cropGeometry', () => {
    it('bez przesunięcia i powiększenia tnie środek krótszego boku', () => {
        const { crop, width, height } = cropGeometry(1200, 800, 280, 1, 0, 0);
        expect(height).toBeCloseTo(280);
        expect(width).toBeCloseTo(420);
        expect(crop.size).toBeCloseTo(800);
        expect(crop.x).toBeCloseTo(200);
        expect(crop.y).toBeCloseTo(0);
    });

    it('przesunięcie jest ograniczone - obraz nie odsłania pustego rogu', () => {
        const { crop, offsetX } = cropGeometry(1200, 800, 280, 1, 10_000, 0);
        expect(offsetX).toBeCloseTo(70);
        expect(crop.x).toBeCloseTo(0);
    });

    it('powiększenie zmniejsza wycinany kwadrat', () => {
        const { crop } = cropGeometry(800, 800, 280, 2, 0, 0);
        expect(crop.size).toBeCloseTo(400);
        expect(crop.x).toBeCloseTo(200);
        expect(crop.y).toBeCloseTo(200);
    });

    it('przesunięcie obrazu w dół pokazuje jego górę', () => {
        const { crop } = cropGeometry(800, 1200, 280, 1, 0, 1000);
        expect(crop.y).toBeCloseTo(0);
    });
});

describe('validateSignatureImageFile', () => {
    it('przyjmuje JPG, PNG i WebP, odrzuca resztę i zbyt duże pliki', () => {
        expect(validateSignatureImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
        expect(validateSignatureImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).not.toBeNull();
        expect(validateSignatureImageFile(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).not.toBeNull();
        const big = new File([new Uint8Array(21 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' });
        expect(validateSignatureImageFile(big)).not.toBeNull();
    });
});

describe('appAssetUrl', () => {
    it('składa adres obrazka z domeny aplikacji', () => {
        expect(appAssetUrl('/api/public/mail-signature/s/0123456789abcdef.jpg', 'https://app.studio.pl'))
            .toBe('https://app.studio.pl/api/public/mail-signature/s/0123456789abcdef.jpg');
        expect(appAssetUrl('/api/public/mail-signature/icons/v1', 'http://localhost:5173'))
            .toBe('http://localhost:5173/api/public/mail-signature/icons/v1');
    });
});
