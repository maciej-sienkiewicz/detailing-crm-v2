import { describe, expect, it } from 'vitest';
import { appAssetUrl, cropGeometry, logoContentBounds, validateSignatureImageFile } from './signatureImage';

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

/** Obraz RGBA wypełniony tłem, z prostokątem „treści" w podanym miejscu. */
const pixels = (
    width: number, height: number, background: number[], content: number[],
    box: { x: number; y: number; w: number; h: number },
) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
            data.set(inside ? content : background, (y * width + x) * 4);
        }
    }
    return data;
};

describe('logoContentBounds', () => {
    it('przezroczysty margines wokół znaku jest przycinany, z odrobiną oddechu', () => {
        const data = pixels(200, 100, [0, 0, 0, 0], [20, 20, 20, 255], { x: 50, y: 30, w: 100, h: 40 });
        expect(logoContentBounds(data, 200, 100)).toEqual({ x: 48, y: 28, width: 104, height: 44 });
    });

    it('białe logo na przezroczystym tle nie znika jako „białe tło"', () => {
        const data = pixels(100, 100, [0, 0, 0, 0], [255, 255, 255, 255], { x: 10, y: 10, w: 80, h: 80 });
        expect(logoContentBounds(data, 100, 100)).toEqual({ x: 8, y: 8, width: 84, height: 84 });
    });

    it('JPEG z białym marginesem: tłem jest kolor rogu, także z szumem kompresji', () => {
        const data = pixels(120, 60, [250, 252, 255, 255], [200, 30, 40, 255], { x: 30, y: 10, w: 60, h: 40 });
        expect(logoContentBounds(data, 120, 60)).toEqual({ x: 28, y: 8, width: 64, height: 44 });
    });

    it('bez marginesu i przy obrazie z samego tła - nie ma czego ciąć', () => {
        expect(logoContentBounds(pixels(50, 50, [0, 0, 0, 0], [9, 9, 9, 255], { x: 0, y: 0, w: 50, h: 50 }), 50, 50)).toBeNull();
        expect(logoContentBounds(pixels(50, 50, [0, 0, 0, 0], [0, 0, 0, 0], { x: 0, y: 0, w: 0, h: 0 }), 50, 50)).toBeNull();
    });
});
