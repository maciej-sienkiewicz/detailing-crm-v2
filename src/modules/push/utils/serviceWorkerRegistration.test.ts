import { describe, expect, it, vi } from 'vitest';
import {
    keepServiceWorkerFresh, UPDATE_CHECK_MIN_INTERVAL_MS, UPDATE_CHECK_PERIOD_MS,
} from './serviceWorkerRegistration';

/**
 * Przeglądarka sama sprawdza nową wersję workera tylko przy nawigacji, a PWA na telefonie
 * wraca z tła bez nawigacji - dlatego telefony trzymały stare workery tygodniami.
 * Te testy pilnują, że powrót na ekran NAPRAWDĘ pyta o nową wersję.
 */
function setup() {
    let time = 0;
    let visible = true;
    const docListeners = new Map<string, () => void>();
    const winListeners = new Map<string, () => void>();
    let intervalFn: (() => void) | null = null;
    const registration = { update: vi.fn(() => Promise.resolve()) };

    const stop = keepServiceWorkerFresh(registration as never, {
        now: () => time,
        isVisible: () => visible,
        target: {
            addEventListener: (type: string, fn: () => void) => docListeners.set(type, fn),
            removeEventListener: (type: string) => docListeners.delete(type),
        } as never,
        windowTarget: {
            addEventListener: (type: string, fn: () => void) => winListeners.set(type, fn),
            removeEventListener: (type: string) => winListeners.delete(type),
            setInterval: (fn: () => void) => { intervalFn = fn; return 1; },
            clearInterval: () => { intervalFn = null; },
        } as never,
    });

    return {
        registration,
        stop,
        advance: (ms: number) => { time += ms; },
        setVisible: (v: boolean) => { visible = v; },
        returnToScreen: () => docListeners.get('visibilitychange')?.(),
        goOnline: () => winListeners.get('online')?.(),
        tick: () => intervalFn?.(),
        listenerCount: () => docListeners.size + winListeners.size + (intervalFn ? 1 : 0),
    };
}

describe('keepServiceWorkerFresh', () => {
    it('powrót aplikacji z tła pyta o nową wersję workera', () => {
        const t = setup();
        t.advance(UPDATE_CHECK_MIN_INTERVAL_MS);
        t.returnToScreen();
        expect(t.registration.update).toHaveBeenCalledTimes(1);
    });

    it('częste przełączanie aplikacji nie zasypuje serwera sprawdzeniami', () => {
        const t = setup();
        t.advance(UPDATE_CHECK_MIN_INTERVAL_MS);
        t.returnToScreen();
        t.advance(10_000);
        t.returnToScreen();
        expect(t.registration.update).toHaveBeenCalledTimes(1);
    });

    it('schowanie aplikacji niczego nie sprawdza', () => {
        const t = setup();
        t.advance(UPDATE_CHECK_MIN_INTERVAL_MS);
        t.setVisible(false);
        t.returnToScreen();
        t.tick();
        expect(t.registration.update).not.toHaveBeenCalled();
    });

    it('odzyskanie sieci sprawdza od razu - pominięte sprawdzenia mogły paść offline', () => {
        const t = setup();
        t.goOnline();
        expect(t.registration.update).toHaveBeenCalledTimes(1);
    });

    it('otwarta cały dzień aplikacja sprawdza co godzinę', () => {
        const t = setup();
        t.advance(UPDATE_CHECK_PERIOD_MS);
        t.tick();
        expect(t.registration.update).toHaveBeenCalledTimes(1);
    });

    it('błąd sieci przy sprawdzeniu nie wycieka jako nieobsłużone odrzucenie', async () => {
        const t = setup();
        t.registration.update.mockImplementationOnce(() => Promise.reject(new Error('offline')));
        t.goOnline();
        await Promise.resolve();
        expect(t.registration.update).toHaveBeenCalledTimes(1);
    });

    it('sprzątanie zdejmuje wszystkie nasłuchy i timer', () => {
        const t = setup();
        t.stop();
        expect(t.listenerCount()).toBe(0);
    });
});
