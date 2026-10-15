import { App } from '@capacitor/app';
import { isNativeApp } from './platform';
import { openNatively, trackObjectUrls } from './nativeFiles';

/**
 * Dopasowanie strony do aplikacji ze sklepu. Woła się raz, przed renderem.
 *
 * Kod modułów zostaje przeglądarkowy - `window.open`, `<a download>`, `a.click()`.
 * Zamiast przepisywać kilkadziesiąt miejsc, podmieniamy te trzy wejścia w jednym:
 * nowe miejsce pobierania zadziała w aplikacji samo, bez pamiętania o niej.
 */
export function installNativeShell(): void {
    if (!isNativeApp()) return;
    document.documentElement.classList.add('native-app');
    trackObjectUrls();
    interceptWindowOpen();
    interceptAnchors();
    handleBackButton();
}

const report = (error: unknown) => {
    console.warn('[native] Nie udało się otworzyć pliku lub linku', error);
};

/**
 * Część kodu otwiera kartę PRZED pobraniem (`window.open('')`), a adres wpisuje jej
 * po nim - inaczej przeglądarka zablokowałaby okno. Takiej karcie oddajemy zastępcę,
 * który dopiero po wpisaniu adresu otwiera plik.
 */
function deferredWindow(): Window {
    const stand = {
        opener: null as unknown,
        closed: false,
        close() { stand.closed = true; },
        focus() { /* nie ma czego przenieść na wierzch */ },
        location: {
            set href(value: string) { if (!stand.closed) openNatively(value).catch(report); },
            get href() { return ''; },
            assign(value: string) { if (!stand.closed) openNatively(value).catch(report); },
            replace(value: string) { if (!stand.closed) openNatively(value).catch(report); },
        },
    };
    return stand as unknown as Window;
}

function interceptWindowOpen(): void {
    window.open = (url?: string | URL) => {
        const href = url ? String(url) : '';
        if (!href || href === 'about:blank') return deferredWindow();
        openNatively(href).catch(report);
        return null;
    };
}

/** Link, który w przeglądarce pobrałby plik albo otworzył nową kartę. */
function takeOver(anchor: HTMLAnchorElement): boolean {
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
    const isFile = anchor.hasAttribute('download') || href.startsWith('blob:') || href.startsWith('data:');
    const isNewTab = anchor.target === '_blank';
    if (!isFile && !isNewTab) return false;
    openNatively(anchor.href, anchor.getAttribute('download') || undefined).catch(report);
    return true;
}

function interceptAnchors(): void {
    // Pobieranie z kodu: link tworzony w pamięci i klikany `click()` - często bez
    // dopięcia do dokumentu, więc nasłuch na dokumencie by go nie zobaczył.
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        if (!takeOver(this)) click.call(this);
    };
    // Kliknięcie palcem w link na stronie.
    document.addEventListener('click', event => {
        if (event.defaultPrevented || !(event.target instanceof Element)) return;
        const anchor = event.target.closest('a');
        if (anchor && takeOver(anchor)) event.preventDefault();
    }, true);
}

/**
 * Systemowy „Wstecz" na Androidzie. Najpierw zamyka okno na wierzchu (tak jak Escape
 * - każde okno modalne już go obsługuje), potem cofa w historii, a na pierwszym
 * ekranie chowa aplikację zamiast ją zamykać: powrót nie wymaga ponownego logowania
 * ani wczytywania.
 */
function handleBackButton(): void {
    void App.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            return;
        }
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
    });
}
