// src/common/utils/safeUrl.ts
//
// Adresy z odpowiedzi API (pliki z S3, przekierowanie do płatności, logowanie OAuth,
// linki w podpowiedziach Tablicy) trafiają do window.open i window.location. React
// odrzuca `javascript:` wyłącznie w atrybutach renderowanych przez JSX - tu go nic nie
// zatrzymuje. W przeglądarce ratował nas `noopener` (adres `javascript:` w nowej karcie
// bez openera nie dotyka strony CRM), ale powłoka aplikacji ze sklepu podmienia
// window.open i tej flagi nie widzi: taki adres wykonałby się w originie CRM razem
// z mostem Capacitora. Dlatego schemat sprawdzamy sami, zanim adres gdziekolwiek pójdzie.

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'sms:']);

/** Adres rozwiązany względem bieżącej strony albo `null`, gdy jego schemat jest niedozwolony. */
export function toSafeUrl(href: string): URL | null {
    let url: URL;
    try {
        url = new URL(href.trim(), window.location.href);
    } catch {
        return null;
    }
    if (SAFE_PROTOCOLS.has(url.protocol)) return url;
    // blob: tylko własny - powstaje z URL.createObjectURL na tej stronie.
    if (url.protocol === 'blob:' && url.origin === window.location.origin) return url;
    return null;
}

/** window.location.assign dla adresu z serwera. `false`, gdy adres odrzucono. */
export function assignSafeUrl(href: string): boolean {
    const url = toSafeUrl(href);
    if (!url) return false;
    window.location.assign(url.href);
    return true;
}

/**
 * Nowa karta bez `window.opener`. Plik z S3 ma typ, który przy wgrywaniu podał
 * klient - wgrany HTML otwarty z openerem mógłby przekierować kartę CRM na stronę
 * podszywającą się pod logowanie (reverse tabnabbing).
 */
export function openInNewTab(href: string): void {
    const url = toSafeUrl(href);
    if (url) window.open(url.href, '_blank', 'noopener,noreferrer');
}
