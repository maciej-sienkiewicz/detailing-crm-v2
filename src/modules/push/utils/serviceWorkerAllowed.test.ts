// @vitest-environment jsdom
//
// Worker CRM nie rejestruje się na stronach z linku z tokenem - karta wizyty i podpis
// klienta, zdjęcia i skan z telefonu. W przeglądarce klienta tylko zostawałby na stałe.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/native/platform', () => ({ isNativeApp: () => false }));

import { isServiceWorkerAllowedHere } from './serviceWorkerRegistration';

const at = (path: string) => window.history.replaceState(null, '', path);

afterEach(() => at('/'));

describe('isServiceWorkerAllowedHere', () => {
    it('aplikacja pracownika i logowanie - tak', () => {
        Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
        at('/calendar');
        expect(isServiceWorkerAllowedHere()).toBe(true);
        at('/login');
        expect(isServiceWorkerAllowedHere()).toBe(true);
    });

    it('karta wizyty, podpis klienta i strony z telefonu - nie', () => {
        Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
        for (const path of ['/vc/abc', '/sign/xyz', '/m/sig/123', '/m/upload', '/m/scan']) {
            at(path);
            expect(isServiceWorkerAllowedHere(), path).toBe(false);
        }
    });
});
