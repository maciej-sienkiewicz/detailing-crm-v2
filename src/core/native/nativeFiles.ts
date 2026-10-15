import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Pliki i linki w aplikacji ze sklepu.
 *
 * Widok strony w aplikacji (WKWebView, Android WebView) nie ma menedżera pobrań ani
 * kart: `<a download>` nic nie robi, a `window.open` albo nie robi nic, albo podmienia
 * całą aplikację na otwierany adres i nie ma z niego powrotu. Dlatego plik zapisujemy
 * w pamięci podręcznej aplikacji i oddajemy systemowemu „Udostępnij" (zapis w Plikach,
 * wydruk, mail, WhatsApp), a obce strony otwieramy w przeglądarce wewnątrz aplikacji.
 */

/**
 * Bloby, na które wskazują adresy `blob:`. Kod pobierania robi zwykle `click()`
 * i od razu `revokeObjectURL` - zanim zdążymy plik odczytać, adres już nie istnieje.
 * Trzymamy więc sam Blob, a adres sprzątamy z opóźnieniem.
 */
const blobsByUrl = new Map<string, Blob>();
const BLOB_GRACE_MS = 60_000;

export function trackObjectUrls(): void {
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
        const url = create(object);
        if (object instanceof Blob) blobsByUrl.set(url, object);
        return url;
    };
    URL.revokeObjectURL = (url: string) => {
        revoke(url);
        window.setTimeout(() => blobsByUrl.delete(url), BLOB_GRACE_MS);
    };
}

const EXTENSIONS: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'text/csv': 'csv',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

const fallbackName = (type: string): string => {
    const ext = EXTENSIONS[type.split(';')[0].trim()];
    return ext ? `dokument.${ext}` : 'plik';
};

/** Nazwa z nagłówka Content-Disposition (filename* ma pierwszeństwo - niesie polskie znaki). */
export function fileNameFromDisposition(header: string | null): string | undefined {
    if (!header) return undefined;
    const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)?.[1];
    if (encoded) {
        try { return decodeURIComponent(encoded.trim().replace(/^"|"$/g, '')); } catch { /* niżej zwykłe filename */ }
    }
    return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim();
}

const safeFileName = (name: string): string =>
    name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'plik';

const toBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

/** Zapisuje plik w pamięci podręcznej aplikacji i otwiera systemowe „Udostępnij". */
export async function shareFile(blob: Blob, fileName?: string): Promise<void> {
    const name = safeFileName(fileName || fallbackName(blob.type));
    // Osobny katalog na każde udostępnienie: dwa pliki o tej samej nazwie (dwa protokoły
    // „protokol.pdf") nie nadpisują się, zanim system skończy pierwszy.
    const { uri } = await Filesystem.writeFile({
        path: `udostepnione/${Date.now()}/${name}`,
        data: await toBase64(blob),
        directory: Directory.Cache,
        recursive: true,
    });
    try {
        await Share.share({ title: name, files: [uri] });
    } catch (error) {
        // Zamknięcie arkusza bez wyboru to nie błąd.
        if (!/cancel/i.test(String((error as Error)?.message ?? error))) throw error;
    }
}

async function blobFrom(href: string): Promise<{ blob: Blob; name?: string }> {
    const tracked = blobsByUrl.get(href);
    if (tracked) return { blob: tracked };
    const response = await fetch(href, { credentials: 'include' });
    if (!response.ok) throw new Error(`Nie udało się pobrać pliku (${response.status})`);
    return { blob: await response.blob(), name: fileNameFromDisposition(response.headers.get('content-disposition')) };
}

/**
 * Wszystko, co w przeglądarce otworzyłoby się w nowej karcie albo pobrało na dysk:
 *  - plik z pamięci (`blob:`, `data:`) albo z naszego API - do „Udostępnij";
 *  - inna strona naszej aplikacji - w tym samym oknie (nowa karta nie istnieje);
 *  - obca strona i pliki z magazynu zdjęć - w przeglądarce wewnątrz aplikacji;
 *  - tel:, mailto:, sms: - systemowi.
 */
export async function openNatively(href: string, fileName?: string): Promise<void> {
    const url = new URL(href, window.location.href);
    const sameOrigin = url.origin === window.location.origin;

    if (url.protocol === 'blob:' || url.protocol === 'data:' || (sameOrigin && url.pathname.startsWith('/api/'))) {
        const { blob, name } = await blobFrom(url.href);
        await shareFile(blob, fileName || name);
        return;
    }
    if (sameOrigin) {
        window.location.assign(url.href);
        return;
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
        await Browser.open({ url: url.href });
        return;
    }
    window.location.href = url.href;
}
