// Wyskakujący panel ma się ZAWSZE mieścić w ekranie. Zgłoszenie: wybór okresu
// w statystykach uciekał na telefonie za lewą krawędź.
import { describe, expect, it } from 'vitest';
import { placeFloating } from './floatingPlacement';

const phone = { width: 390, height: 844 };
const trigger = (left: number, top: number, width = 150, height = 36) =>
    ({ left, right: left + width, top, bottom: top + height });

describe('placeFloating', () => {
    it('odtworzenie zgłoszenia: przycisk przy lewej krawędzi telefonu, panel przyklejony prawą krawędzią', () => {
        const p = placeFloating(trigger(16, 120), { width: 250, height: 400 }, phone, { align: 'right' });
        expect(p.left).toBeGreaterThanOrEqual(8);
        expect(p.left + 250).toBeLessThanOrEqual(phone.width - 8);
    });

    it('przy prawej krawędzi panel wyrównany do lewej krawędzi przycisku nie wyjeżdża w prawo', () => {
        const p = placeFloating(trigger(300, 120, 80), { width: 250, height: 200 }, phone, { align: 'left' });
        expect(p.left + 250).toBeLessThanOrEqual(phone.width - 8);
    });

    it('panel szerszy od ekranu zwęża się do ekranu minus marginesy', () => {
        const p = placeFloating(trigger(20, 100), { width: 600, height: 200 }, phone);
        expect(p.maxWidth).toBe(374);
        expect(p.left).toBe(8);
    });

    it('bez miejsca pod przyciskiem staje nad nim', () => {
        const p = placeFloating(trigger(100, 700), { width: 200, height: 300 }, phone, { bottomReserve: 88 });
        expect(p.above).toBe(true);
        expect(p.top + 300).toBeLessThanOrEqual(700 - 6);
    });

    it('nie mieści się nigdzie: większa strona i ograniczona wysokość zamiast wyjazdu za ekran', () => {
        const short = { width: 390, height: 500 };
        const p = placeFloating(trigger(100, 150), { width: 250, height: 600 }, short);
        expect(p.above).toBe(false);
        expect(p.top + p.maxHeight).toBeLessThanOrEqual(short.height - 8);
    });

    it('na szerokim ekranie zachowuje się jak dotąd: pod przyciskiem, przy jego prawej krawędzi', () => {
        const p = placeFloating(trigger(1100, 60, 200), { width: 250, height: 400 }, { width: 1440, height: 900 });
        expect(p).toMatchObject({ top: 102, left: 1050, above: false });
    });
});
