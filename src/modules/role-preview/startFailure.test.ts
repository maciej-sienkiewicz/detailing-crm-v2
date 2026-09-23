// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { sendStartFailed, watchStartFailure } from './startFailure';

/** Osobne okno (ramka) - w roli okna studia albo obcej strony. */
function anotherWindow(): Window {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    return frame.contentWindow!;
}

const deliver = (data: unknown, source: Window) =>
    window.dispatchEvent(new MessageEvent('message', { data, source }));

describe('sygnał „podgląd nie powstał"', () => {
    it('okno podglądu zamyka się na wiadomość od okna, które je otworzyło', () => {
        const opener = anotherWindow();
        const close = vi.fn();
        const watch = watchStartFailure(opener, close);

        deliver({ type: 'role-preview:start-failed', reason: 'W tym studiu jest już otwartych 5 podglądów roli.' }, opener);

        expect(close).toHaveBeenCalledTimes(1);
        expect(watch.reason()).toBe('W tym studiu jest już otwartych 5 podglądów roli.');
    });

    it('bez komunikatu serwera podaje ogólny powód', () => {
        const opener = anotherWindow();
        const watch = watchStartFailure(opener, vi.fn());

        deliver({ type: 'role-preview:start-failed', reason: '' }, opener);

        expect(watch.reason()).toBe('Nie udało się przygotować podglądu.');
    });

    it('ignoruje wiadomości od innych okien i wiadomości innego rodzaju', () => {
        const opener = anotherWindow();
        const close = vi.fn();
        const watch = watchStartFailure(opener, close);

        deliver({ type: 'role-preview:start-failed', reason: 'obca strona' }, anotherWindow());
        deliver({ type: 'role-preview:inna' }, opener);
        deliver('role-preview:start-failed', opener);

        expect(close).not.toHaveBeenCalled();
        expect(watch.reason()).toBeNull();
    });

    it('okno otwarte bez okna studia niczego nie nasłuchuje', () => {
        const close = vi.fn();
        const watch = watchStartFailure(null, close);

        deliver({ type: 'role-preview:start-failed', reason: 'x' }, window);

        expect(close).not.toHaveBeenCalled();
        expect(watch.reason()).toBeNull();
    });

    it('okno studia wysyła wiadomość wyłącznie pod adres podglądu', () => {
        const previewWindow = { postMessage: vi.fn() } as unknown as Window;

        sendStartFailed(previewWindow, 'https://podglad.detailboost.pl/', 'Powód.');

        expect(previewWindow.postMessage).toHaveBeenCalledWith(
            { type: 'role-preview:start-failed', reason: 'Powód.' },
            'https://podglad.detailboost.pl',
        );
    });

    it('zamknięte okno podglądu nie wywraca obsługi błędu', () => {
        const previewWindow = { postMessage: vi.fn(() => { throw new Error('closed'); }) } as unknown as Window;

        expect(() => sendStartFailed(previewWindow, 'https://podglad.detailboost.pl', 'x')).not.toThrow();
    });
});
