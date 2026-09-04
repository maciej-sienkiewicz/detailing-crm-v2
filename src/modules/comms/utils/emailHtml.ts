// src/modules/comms/utils/emailHtml.ts
// Analiza HTML wiadomości po stronie klienta - dwie rzeczy, które psuły czytanie
// korespondencji w CRM:
//
//  1. Cytowana historia. Klient odpisuje, jego program pocztowy dokleja całą
//     dotychczasową rozmowę, a my pokazujemy ją drugi, trzeci i czwarty raz -
//     mimo że mamy własną oś wątku. Tniemy treść w miejscu, w którym zaczyna się
//     cytat, i chowamy resztę pod przełącznikiem (nic nie znika, tylko przestaje
//     zaśmiecać widok). Backend robi to samo dla snippetów (EmailTextCleaner),
//     ale bodyHtml celowo trzymamy w całości - dlatego cięcie żyje tu, w warstwie
//     prezentacji, i działa też dla wiadomości zassanych dawno temu.
//
//  2. Wiadomości graficzne. Newsletter to zwykle jeden wielki obrazek albo tabela
//     bannerów; wciśnięty w „chmurkę" rozmowy jest nieczytelny i rozpycha widok.
//     Rozpoznajemy je po proporcji obrazków do tekstu i podmieniamy na przycisk
//     otwierający pełny podgląd.

export interface SplitQuoteResult {
    /** Treść właściwa - to, co nadawca faktycznie napisał teraz. */
    mainHtml: string;
    /** Doklejona historia rozmowy albo null, gdy nic nie znaleziono. */
    quotedHtml: string | null;
}

/** Kontenery cytatu używane przez główne programy pocztowe. */
const QUOTE_SELECTORS = [
    'div.gmail_quote',
    'blockquote.gmail_quote',
    'blockquote[type="cite"]',
    'div#divRplyFwdMsg',
    'div#appendonsend',
    'div#mail-editor-reference-message-container',
    'div.moz-cite-prefix',
    'div.yahoo_quoted',
    'div#yahoo_quoted',
    'div.protonmail_quote',
    'blockquote.protonmail_quote',
    'div.OutlookMessageHeader',
    'hr#stopSpelling',
    'div[name="quote"]',
];

/**
 * Nagłówki cytatu w treści. Dopasowujemy od początku tekstu elementu - element,
 * który zaczyna się takim zdaniem, jest albo samym nagłówkiem, albo opakowaniem
 * całego cytatu; w obu przypadkach cięcie w tym miejscu jest poprawne.
 */
const QUOTE_MARKERS: RegExp[] = [
    /^W dniu[\s\S]{0,240}(napisa[łl](\(?a\)?)?|pisze)\s*:/i,
    /^Dnia[\s\S]{0,240}(napisa[łl](\(?a\)?)?|pisze)\s*:/i,
    /^(pon|wt|śr|sr|czw|pt|sob|niedz)[a-ząćęłńóśźż]*\.?,?\s[\s\S]{0,240}(napisa[łl](\(?a\)?)?|pisze)\s*:/i,
    /^[\s\S]{0,120}użytkownik[\s\S]{0,200}napisa[łl](\(?a\)?)?\s*:/i,
    /^On[\s\S]{0,240}wrote\s*:/i,
    /^-{2,}\s*(Original Message|Wiadomość oryginalna|Forwarded message|Wiadomość przekazana)/i,
    /^_{5,}\s*$/,
    /^(Od|From)\s*:[\s\S]{0,400}(Wysłano|Sent|Do|To)\s*:/i,
    /^(Begin forwarded message|Początek przekazanej wiadomości)\s*:/i,
];

const BLOCK_TAGS = 'div,p,span,td,blockquote,font,pre,hr,table';

const isQuoteMarker = (text: string): boolean => {
    const normalized = text.replace(/\u00a0/g, ' ').trim();
    if (normalized.length < 4) return false;
    return QUOTE_MARKERS.some((marker) => marker.test(normalized));
};

/** Pierwszy element, od którego treść jest już tylko historią rozmowy. */
function findQuoteAnchor(body: HTMLElement): Element | null {
    for (const selector of QUOTE_SELECTORS) {
        const element = body.querySelector(selector);
        if (element) return element;
    }
    for (const element of Array.from(body.querySelectorAll(BLOCK_TAGS))) {
        // Kontener, którego cała treść zaczyna się nagłówkiem cytatu - tniemy przed nim.
        if (isQuoteMarker(element.textContent ?? '')) return element;
    }
    return null;
}

/** Węzeł zakotwiczenia i wszystko, co po nim następuje (także u przodków). */
function collectFromAnchor(anchor: Node, body: HTMLElement): Node[] {
    const collected: Node[] = [];
    let node: Node | null = anchor;
    // Sam kotwiczący element wchodzi do cytatu; jego przodkowie zostają
    // (niosą treść sprzed cytatu) - z nich bierzemy tylko dalsze rodzeństwo.
    let includeSelf = true;
    while (node && node !== body) {
        let sibling: Node | null = includeSelf ? node : node.nextSibling;
        while (sibling) {
            collected.push(sibling);
            sibling = sibling.nextSibling;
        }
        node = node.parentNode;
        includeSelf = false;
    }
    return collected;
}

/**
 * Cytat w czystym tekście: część klientów (np. Thunderbird) wysyła całą rozmowę
 * jako jeden węzeł tekstowy w <div style="white-space:pre-wrap">, gdzie historia
 * zaczyna się nagłówkiem „W dniu … pisze:" i liniami z „>". Znajdujemy pierwszą
 * taką linię i dzielimy węzeł tekstowy dokładnie w tym miejscu.
 */
function findTextQuoteCut(body: HTMLElement): Text | null {
    const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
        const value = node.nodeValue ?? '';
        let offset = 0;
        for (const line of value.split('\n')) {
            const trimmed = line.trim();
            if (offset > 0 && (trimmed.startsWith('>') || isQuoteMarker(trimmed))) {
                return offset === 0 ? node : node.splitText(offset);
            }
            offset += line.length + 1;
        }
        node = walker.nextNode() as Text | null;
    }
    return null;
}

const visibleTextLength = (element: HTMLElement): number =>
    (element.textContent ?? '').replace(/\s+/g, ' ').trim().length;

/**
 * Dzieli treść wiadomości na część właściwą i doklejoną historię rozmowy.
 * Gdy cięcie zostawiłoby pustą treść (cała wiadomość jest cytatem - np. przekazana
 * korespondencja), oddajemy oryginał: lepiej pokazać za dużo niż nic.
 */
export function splitQuotedHistory(html: string): SplitQuoteResult {
    if (!html || typeof DOMParser === 'undefined') return { mainHtml: html, quotedHtml: null };

    let document: Document;
    try {
        document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    } catch {
        return { mainHtml: html, quotedHtml: null };
    }

    const body = document.body;
    // Najpierw kontener/nagłówek w strukturze, potem cytat ukryty w czystym tekście.
    const anchor: Node | null = findQuoteAnchor(body) ?? findTextQuoteCut(body);
    if (!anchor || anchor === body) return { mainHtml: html, quotedHtml: null };

    const quoted = document.createElement('div');
    // appendChild przenosi węzły, więc lista musi powstać przed modyfikacją drzewa.
    collectFromAnchor(anchor, body).forEach((node) => quoted.appendChild(node));

    const mainHasContent =
        visibleTextLength(body) > 0 || body.querySelector('img') !== null;
    if (!mainHasContent) return { mainHtml: html, quotedHtml: null };
    // Kilka słów to nie „historia rozmowy" - nie zawracamy nią użytkownikowi głowy.
    if (visibleTextLength(quoted) < 40) return { mainHtml: html, quotedHtml: null };

    return { mainHtml: body.innerHTML, quotedHtml: quoted.innerHTML };
}

export interface HtmlShape {
    textLength: number;
    imageCount: number;
    /** Treść niesiona obrazkami - w „chmurce" rozmowy nie da się jej sensownie pokazać. */
    isGraphical: boolean;
}

/** Ocena, czy wiadomość jest tekstem, czy grafiką (newsletter, oferta, banner). */
export function describeHtml(html: string): HtmlShape {
    if (!html || typeof DOMParser === 'undefined') {
        return { textLength: html?.length ?? 0, imageCount: 0, isGraphical: false };
    }

    let document: Document;
    try {
        document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    } catch {
        return { textLength: html.length, imageCount: 0, isGraphical: false };
    }

    document.body.querySelectorAll('style, script').forEach((node) => node.remove());
    const textLength = visibleTextLength(document.body);
    // Obrazek bez źródła to pozostałość po wyciętym załączniku inline - nie niesie treści.
    const imageCount = Array.from(document.body.querySelectorAll('img')).filter(
        (image) => (image.getAttribute('src') ?? '').trim().length > 0
    ).length;

    // Wiadomość „graficzna" to taka, w której obrazki NIOSĄ treść (newsletter, oferta).
    // Kilka zdań tekstu ze zdjęciem w załączniku to nadal zwykła wiadomość.
    const isGraphical = imageCount >= 1 && textLength < 60;

    return { textLength, imageCount, isGraphical };
}

/**
 * Czy wiadomość wymaga izolowanej ramki?
 *
 * Zwykła korespondencja biznesowa to akapity, listy i linki - taki HTML renderujemy
 * wprost w naszej typografii: jedna czcionka, jeden rytm, żadnego mierzenia wysokości
 * (a więc i żadnego ucinania treści). Iframe zostawiamy dla maili PROJEKTOWANYCH -
 * newsletterów opartych o tabele, własne style i tła - bo tylko tam własny układ
 * wiadomości jest treścią, którą trzeba pokazać wiernie i odizolować od naszego CSS.
 */
export function isRichHtml(html: string): boolean {
    if (!html || typeof DOMParser === 'undefined') return false;

    let document: Document;
    try {
        document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    } catch {
        return true;
    }

    const body = document.body;
    if (body.querySelector('table, style, center, font, [bgcolor], [background]')) return true;

    const styled = Array.from(body.querySelectorAll('[style]')).filter((element) => {
        const style = (element.getAttribute('style') ?? '').toLowerCase();
        // Kolory, tła i wymuszone szerokości to znak, że ktoś projektował układ.
        return /background|font-family|font-size|width\s*:|color\s*:/.test(style);
    });
    if (styled.length > 3) return true;

    const images = Array.from(body.querySelectorAll('img')).filter(
        (image) => (image.getAttribute('src') ?? '').trim().length > 0
    );
    return images.length > 2;
}

/** Pierwsze zdania treści - do zwiniętego wiersza wiadomości w wątku. */
export function plainPreview(html: string, maxLength = 140): string {
    if (!html || typeof DOMParser === 'undefined') return '';
    try {
        const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
        document.body.querySelectorAll('style, script').forEach((node) => node.remove());
        // Bez tego textContent skleja sąsiednie bloki („Dzień dobry,Proszę o wycenę”).
        document.body.querySelectorAll('br, p, div, li, tr, td, blockquote').forEach((node) => {
            node.parentNode?.insertBefore(document.createTextNode(' '), node);
        });
        const text = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
        return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
    } catch {
        return '';
    }
}

/**
 * Sprząta ogon wiadomości: obrazki bez źródła (pozostałości po wyciętych
 * załącznikach inline) oraz puste akapity i <br> na końcu treści. Bez tego
 * krótka wiadomość potrafi ciągnąć za sobą kilkaset pikseli pustki - a pustka
 * w widoku czatu wygląda jak zgubiona treść.
 */
export function trimEmptyEdges(html: string): string {
    if (!html || typeof DOMParser === 'undefined') return html;

    let document: Document;
    try {
        document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    } catch {
        return html;
    }

    const body = document.body;
    body.querySelectorAll('img').forEach((image) => {
        if ((image.getAttribute('src') ?? '').trim().length === 0) image.remove();
    });

    const isBlank = (node: Node): boolean => {
        if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? '').trim().length === 0;
        if (node.nodeType !== Node.ELEMENT_NODE) return true;
        const element = node as Element;
        if (element.querySelector('img, hr, table')) return false;
        return (element.textContent ?? '').trim().length === 0;
    };

    // Puste bloki obcinamy z obu końców - w środku bywają celową interlinią.
    // Schodzimy przy tym po ostatnich dzieciach, bo klienci pocztowe pakują treść
    // w kilka warstw <div>, a pustka siedzi na samym dole tej struktury.
    const trimTail = (element: Element) => {
        while (element.lastChild && isBlank(element.lastChild)) element.removeChild(element.lastChild);
        const last = element.lastElementChild;
        if (last) trimTail(last);
    };
    trimTail(body);
    while (body.firstChild && isBlank(body.firstChild)) body.removeChild(body.firstChild);

    return body.innerHTML;
}
