/**
 * @vitest-environment jsdom
 */
// Testy współdzielonej blokady scrolla. Rozszerzenie .tsx dla spójności
// z konwencją repo „testy DOM-owe to .test.tsx", JSX-a tu nie ma.
//
// Pilnują one klasy błędu z produkcji: „strona zamrożona, nie reaguje na
// scroll do odświeżenia". Zamrożenie brało się z sześciu niezależnych blokad
// zapisujących i przywracających własne migawki stylów <body>/<html> — okno
// zamykane jako ostatnie przywracało `hidden` zapamiętane przy otwieraniu nad
// innym oknem. Nie osłabiaj tych testów, żeby przepuścić zmianę.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
    acquireScrollLock,
    releaseAllScrollLocks,
    scrollLockCount,
} from './scrollLock';

const html = () => document.documentElement;
const body = () => document.body;

beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    html().removeAttribute('style');
    body().removeAttribute('style');
});

afterEach(() => {
    releaseAllScrollLocks();
    vi.unstubAllGlobals();
});

describe('acquireScrollLock', () => {
    it('zakłada blokadę na <html> i <body>, a po zwolnieniu przywraca stan dziewiczy', () => {
        const release = acquireScrollLock();

        expect(html().style.overflow).toBe('hidden');
        expect(html().style.overscrollBehavior).toBe('none');
        expect(body().style.overflow).toBe('hidden');

        release();

        expect(html().style.overflow).toBe('');
        expect(html().style.overscrollBehavior).toBe('');
        expect(body().style.overflow).toBe('');
        expect(scrollLockCount()).toBe(0);
    });

    it('zachowuje zastane style inline zamiast zerować je na ślepo', () => {
        body().style.overflow = 'scroll';
        html().style.overflow = 'auto';

        const release = acquireScrollLock();
        release();

        expect(body().style.overflow).toBe('scroll');
        expect(html().style.overflow).toBe('auto');
    });

    // Sedno błędu z produkcji: modal + otwarte nad nim potwierdzenie,
    // zamykane jednym kliknięciem. React sprząta efekty od rodzica w dół,
    // więc blokada założona PÓŹNIEJ zwalniana jest jako OSTATNIA — przy
    // migawkach stylów przywracała wtedy `hidden` i mroziła stronę.
    it('nakładające się blokady zwalniane w kolejności otwierania nie zostawiają hidden', () => {
        const releaseModal = acquireScrollLock();
        const releaseConfirmation = acquireScrollLock();

        releaseModal();
        // dopóki potwierdzenie żyje, blokada ma trwać
        expect(body().style.overflow).toBe('hidden');

        releaseConfirmation();
        expect(body().style.overflow).toBe('');
        expect(html().style.overflow).toBe('');
    });

    it('nakładające się blokady zwalniane w odwrotnej kolejności też sprzątają do zera', () => {
        const releaseModal = acquireScrollLock();
        const releaseConfirmation = acquireScrollLock();

        releaseConfirmation();
        expect(body().style.overflow).toBe('hidden');

        releaseModal();
        expect(body().style.overflow).toBe('');
    });

    it('podwójne wywołanie release jest no-opem i nie zdejmuje cudzej blokady', () => {
        const releaseFirst = acquireScrollLock();
        const releaseSecond = acquireScrollLock();

        releaseFirst();
        releaseFirst(); // nie może „zjeść" licznika drugiej blokady

        expect(body().style.overflow).toBe('hidden');
        releaseSecond();
        expect(body().style.overflow).toBe('');
    });
});

describe("acquireScrollLock('fixed')", () => {
    it('unieruchamia <body> pozycją fixed i po zwolnieniu wraca do pozycji scrolla', () => {
        Object.defineProperty(window, 'scrollY', { value: 420, configurable: true });

        const release = acquireScrollLock('fixed');

        expect(body().style.position).toBe('fixed');
        expect(body().style.top).toBe('-420px');
        expect(body().style.width).toBe('100%');
        expect(body().style.overflow).toBe('hidden');

        release();

        expect(body().style.position).toBe('');
        expect(body().style.top).toBe('');
        expect(window.scrollTo).toHaveBeenCalledWith(0, 420);
    });

    it('menu mobilne + okno modalne: zwolnienie menu nie rozbraja blokady okna', () => {
        const releaseMenu = acquireScrollLock('fixed');
        const releaseModal = acquireScrollLock();

        releaseMenu();
        // position: fixed schodzi razem z menu…
        expect(body().style.position).toBe('');
        // …ale przewijanie tła ma dalej stać, bo okno wciąż jest otwarte
        expect(body().style.overflow).toBe('hidden');
        expect(html().style.overflow).toBe('hidden');

        releaseModal();
        expect(body().style.overflow).toBe('');
    });

    it('kolejność odwrotna (okno zwolnione przed menu) też kończy się stanem dziewiczym', () => {
        const releaseMenu = acquireScrollLock('fixed');
        const releaseModal = acquireScrollLock();

        releaseModal();
        expect(body().style.position).toBe('fixed');

        releaseMenu();
        expect(body().style.position).toBe('');
        expect(body().style.overflow).toBe('');
    });
});

describe('releaseAllScrollLocks', () => {
    it('zdejmuje wszystko i unieważnia wydane funkcje zwalniające', () => {
        const releaseA = acquireScrollLock();
        const releaseB = acquireScrollLock('fixed');

        releaseAllScrollLocks();

        expect(body().style.overflow).toBe('');
        expect(body().style.position).toBe('');
        expect(scrollLockCount()).toBe(0);

        // spóźnione sprzątanie odmontowanych okien nie może ruszyć
        // blokady założonej już na następnym ekranie
        const releaseNext = acquireScrollLock();
        releaseA();
        releaseB();
        expect(body().style.overflow).toBe('hidden');
        releaseNext();
        expect(body().style.overflow).toBe('');
    });
});
