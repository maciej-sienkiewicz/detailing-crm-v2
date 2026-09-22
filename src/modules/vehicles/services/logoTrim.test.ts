import { describe, expect, it } from 'vitest';
import { findTrimBox } from './logoTrim';

type Rgba = [number, number, number, number];
const CLEAR: Rgba = [0, 0, 0, 0];
const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];
const INK: Rgba = [200, 20, 40, 255];

/** Obraz w×h wypełniony tłem, z prostokątem „tuszu" od (x0, y0) do (x1, y1) włącznie. */
const image = (w: number, h: number, bg: Rgba, ink?: { x0: number; y0: number; x1: number; y1: number; color?: Rgba }) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const inside = ink && x >= ink.x0 && x <= ink.x1 && y >= ink.y0 && y <= ink.y1;
            data.set(inside ? ink.color ?? INK : bg, (y * w + x) * 4);
        }
    }
    return data;
};

describe('findTrimBox - obrzeże logotypu marki', () => {
    it('przezroczyste tło przycina co do piksela', () => {
        expect(findTrimBox(image(100, 60, CLEAR, { x0: 20, y0: 10, x1: 79, y1: 49 }), 100, 60))
            .toEqual({ x: 20, y: 10, width: 60, height: 40 });
    });

    it('białe tło też przycina do zera - na jasnym awatarze go nie widać', () => {
        expect(findTrimBox(image(100, 60, WHITE, { x0: 30, y0: 5, x1: 69, y1: 54 }), 100, 60))
            .toEqual({ x: 30, y: 5, width: 40, height: 50 });
    });

    it('śmieci pod alfą 0 nadal są tłem', () => {
        const data = image(50, 50, CLEAR, { x0: 10, y0: 10, x1: 39, y1: 39 });
        data.set([255, 0, 0, 0], 0); // czerwony, ale w pełni przezroczysty narożnik
        expect(findTrimBox(data, 50, 50)).toEqual({ x: 10, y: 10, width: 30, height: 30 });
    });

    it('widoczna płyta w kolorze zostaje z marginesem 6% krótszego boku znaku', () => {
        // znak 100×50 → margines round(50 × 0,06) = 3
        expect(findTrimBox(image(200, 150, BLACK, { x0: 50, y0: 50, x1: 149, y1: 99 }), 200, 150))
            .toEqual({ x: 47, y: 47, width: 106, height: 56 });
    });

    it('margines nie wychodzi poza obraz - nic nie dorysowujemy', () => {
        expect(findTrimBox(image(100, 100, BLACK, { x0: 1, y0: 1, x1: 50, y1: 50 }), 100, 100))
            .toEqual({ x: 0, y: 0, width: 54, height: 54 });
    });

    it('różne narożniki - nie wiadomo, co jest marginesem, zostaje oryginał', () => {
        const data = image(40, 40, CLEAR, { x0: 10, y0: 10, x1: 29, y1: 29 });
        data.set(WHITE, 0);
        expect(findTrimBox(data, 40, 40)).toBeNull();
    });

    it('zysk poniżej 2% - nie ma po co podmieniać obrazu', () => {
        // Wolny tylko jeden rząd pikseli na 100: zysk 1%.
        expect(findTrimBox(image(100, 100, CLEAR, { x0: 0, y0: 0, x1: 99, y1: 98 }), 100, 100)).toBeNull();
    });

    it('pusty obraz - zostaje oryginał', () => {
        expect(findTrimBox(image(20, 20, CLEAR), 20, 20)).toBeNull();
    });

    it('szum kompresji w tle mieści się w tolerancji', () => {
        const data = image(60, 60, WHITE, { x0: 20, y0: 20, x1: 39, y1: 39 });
        data.set([251, 252, 250, 255], (5 * 60 + 5) * 4);
        expect(findTrimBox(data, 60, 60)).toEqual({ x: 20, y: 20, width: 20, height: 20 });
    });
});
