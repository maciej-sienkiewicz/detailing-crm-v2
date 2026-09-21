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

/**
 * Element będący zapowiedzią cytatu: krótki tekst z dwukropkiem, a zaraz za nim
 * kontener cytatu. Odpowiednik [isQuoteIntroLine] dla drzewa - Thunderbird trzyma
 * zapowiedź w osobnym <div>, a historię w <blockquote> pod nim, i robi to tak samo
 * po niemiecku jak po polsku.
 */
const isQuoteIntroElement = (element: Element): boolean => {
    const text = (element.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    if (!text.endsWith(':') || text.length > MAX_INTRO_LENGTH) return false;

    let sibling = element.nextElementSibling;
    while (sibling && (sibling.textContent ?? '').trim().length === 0) {
        sibling = sibling.nextElementSibling;
    }
    if (!sibling) return false;
    return sibling.matches('blockquote') || QUOTE_SELECTORS.some((selector) => sibling!.matches(selector));
};

const isQuoteMarker = (text: string): boolean => {
    const normalized = text.replace(/\u00a0/g, ' ').trim();
    if (normalized.length < 4) return false;
    return QUOTE_MARKERS.some((marker) => marker.test(normalized));
};

/**
 * Najdłuższa linia, którą uznamy za zapowiedź cytatu. Zmierzone na prawdziwych
 * klientach: 63 znaki (Thunderbird), 76 (niemiecki Outlook), 84 (Gmail z adresem
 * w nawiasach ostrych). Bez tej granicy akapit zakończony dwukropkiem stojący nad
 * cytatem przepadłby razem z nim.
 */
const MAX_INTRO_LENGTH = 160;

/**
 * Zapowiedź cytatu rozpoznana po KSZTAŁCIE, nie po słowach.
 *
 * [QUOTE_MARKERS] wymienia frazy i zna dokładnie tyle języków, ile jej wpisano -
 * „Am … schrieb:" czy „Le … a écrit :" nie pasują do żadnej z nich. Tymczasem sama
 * konwencja należy do formatu poczty, a nie do języka: krótka linia zakończona
 * dwukropkiem, a zaraz pod nią cytat. Tego trzyma się każdy klient, także taki,
 * o którym nikt tu nie pomyślał.
 *
 * Warunek „zaraz pod spodem stoi cytat" chroni przed zjedzeniem treści: zwykłe zdanie
 * kończące się dwukropkiem („Proszę o wycenę na:") zostaje treścią, dopóki nie
 * następuje po nim cytowanie.
 */
const isQuoteIntroLine = (line: string, following: string[]): boolean => {
    const normalized = line.replace(/\u00a0/g, ' ').trim();
    if (!normalized.endsWith(':') || normalized.length > MAX_INTRO_LENGTH) return false;

    const next = following.map((l) => l.trim()).find((l) => l.length > 0);
    return next !== undefined && next.startsWith('>');
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
        // To samo rozpoznane po kształcie, dla klientów spoza listy fraz.
        if (isQuoteIntroElement(element)) return element;
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
        const lines = value.split('\n');
        let offset = 0;
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const trimmed = line.trim();
            const isCut =
                trimmed.startsWith('>') ||
                isQuoteMarker(trimmed) ||
                isQuoteIntroLine(line, lines.slice(index + 1));
            /*
             * Cięcie na pozycji 0 znaczy „ta wiadomość zaczyna się cytatem", czyli
             * odpowiedź jest POD nim. Wcześniej stał tu warunek `offset > 0`, który
             * taki przypadek odrzucał - a razem z nim całe bottom-postingowe
             * rozpoznanie zatrzymywało się na zapowiedzi cytatu.
             */
            if (isCut) return offset === 0 ? node : node.splitText(offset);
            offset += line.length + 1;
        }
        node = walker.nextNode() as Text | null;
    }
    return null;
}

const visibleTextLength = (element: HTMLElement): number =>
    (element.textContent ?? '').replace(/\s+/g, ' ').trim().length;

/**
 * Czy ten węzeł jest jeszcze częścią cytatu.
 *
 * Tekst: wszystkie niepuste linie zaczynają się od „>" albo są nagłówkiem cytatu.
 * Element: blockquote, kontener cytatu albo element, którego treść zaczyna się
 * nagłówkiem. Puste węzły przechodzą jako cytat - same z siebie nic nie znaczą,
 * a stoją między cytatem a odpowiedzią.
 */
function isQuoteNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
        const lines = (node.nodeValue ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
        return lines.every((line) => line.startsWith('>') || isQuoteMarker(line));
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return true;

    const element = node as Element;
    if (element.matches('blockquote')) return true;
    if (QUOTE_SELECTORS.some((selector) => element.matches(selector))) return true;

    const text = (element.textContent ?? '').trim();
    if (text.length === 0) return element.querySelector('img, hr, table') === null;
    return text.startsWith('>') || isQuoteMarker(text) || isQuoteIntroElement(element);
}

/**
 * Węzeł tekstowy, w którym cytat kończy się, a zaczyna odpowiedź - rozcięty
 * dokładnie w tym miejscu. Zwraca ogon (odpowiedź) albo null, gdy cały węzeł
 * jest cytatem lub cały odpowiedzią.
 */
function splitAfterQuoteLines(node: Text): Text | null {
    const value = node.nodeValue ?? '';
    let offset = 0;
    let sawQuote = false;

    const lines = value.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const trimmed = line.trim();
        const isQuotePart =
            trimmed.startsWith('>') ||
            (trimmed.length > 0 && isQuoteMarker(trimmed)) ||
            isQuoteIntroLine(line, lines.slice(index + 1));
        if (isQuotePart) {
            sawQuote = true;
        } else if (trimmed.length > 0) {
            // Pierwsza linia treści. Bez wcześniejszego cytatu nie ma czego ciąć.
            return sawQuote && offset > 0 && offset < value.length ? node.splitText(offset) : null;
        }
        offset += line.length + 1;
    }
    return null;
}

/** Czy ten węzeł leży wewnątrz kontenera cytatu (blockquote, gmail_quote…). */
function insideQuoteContainer(node: Node, root: HTMLElement): boolean {
    let element = node.parentElement;
    while (element && element !== root) {
        if (element.matches('blockquote') || QUOTE_SELECTORS.some((s) => element!.matches(s))) return true;
        element = element.parentElement;
    }
    return false;
}

/**
 * Pierwszy węzeł, od którego zaczyna się odpowiedź napisana POD cytatem.
 *
 * Szukamy po WĘZŁACH TEKSTOWYCH, a nie po dzieciach korzenia, bo przy wiadomości
 * wysłanej czystym tekstem cytat i odpowiedź siedzą w jednym elemencie - cała
 * rozmowa to jeden <div style="white-space:pre-wrap">. Chodzenie po dzieciach
 * widzi wtedy jeden węzeł „cytat" i nie znajduje niczego.
 */
function findReplyStart(quoted: HTMLElement): Node | null {
    const walker = quoted.ownerDocument.createTreeWalker(quoted, NodeFilter.SHOW_TEXT);
    let sawQuote = false;
    let node = walker.nextNode() as Text | null;

    while (node) {
        // Zapamiętujemy następny ZANIM rozetniemy węzeł - splitText zmienia drzewo.
        const next = walker.nextNode() as Text | null;
        const trimmed = (node.nodeValue ?? '').trim();

        if (trimmed.length > 0) {
            /*
             * Rozcięcie próbujemy na KAŻDYM węźle, nie tylko na uznanym za cytat.
             * Wiadomość wysłana czystym tekstem to jeden węzeł tekstowy, w którym
             * cytat i odpowiedź stoją obok siebie - jako całość nie jest on ani
             * cytatem, ani treścią, więc żadna klasyfikacja go nie złapie.
             */
            const tail = splitAfterQuoteLines(node);
            if (tail) return tail;

            if (insideQuoteContainer(node, quoted) || isQuoteNode(node)) {
                sawQuote = true;
            } else if (sawQuote) {
                return promoteToBlock(node, quoted);
            }
        }
        node = next;
    }
    return null;
}

/**
 * Z węzła tekstowego w górę, dopóki jest pierwszą treścią swojego rodzica.
 * Bez tego z akapitu odpowiedzi zabralibyśmy sam tekst, zostawiając pusty <p>
 * w cytacie i gubiąc formatowanie w treści właściwej.
 */
function promoteToBlock(node: Node, root: HTMLElement): Node {
    let current = node;
    while (current.parentNode && current.parentNode !== root && current.parentNode.firstChild === current) {
        current = current.parentNode;
    }
    return current;
}

/**
 * Odpowiedź napisana POD cytatem wraca do treści właściwej.
 *
 * Cięcie „od nagłówka cytatu w dół" zakłada top-posting - odpowiedź nad cytatem,
 * historię pod nim. Przy bottom-postingu (Thunderbird, Roundcube, większość
 * webmaili) nagłówek stoi na samej górze, więc do historii trafiała także sama
 * odpowiedź, treść właściwa wychodziła pusta i funkcja oddawała oryginał w całości -
 * czyli wiadomość z pełnym cytatem, dokładnie tym, co miało zostać zwinięte.
 */
function reclaimReplyBelowQuote(quoted: HTMLElement, body: HTMLElement): void {
    const start = findReplyStart(quoted);
    if (!start) return;

    /*
     * Gdy odpowiedź jest gołym tekstem wewnątrz elementu (np. white-space:pre-wrap),
     * przenosimy ją razem z PUSTĄ KOPIĄ tego elementu. Sam tekst stracił by łamanie
     * wierszy, które niesie wyłącznie styl rodzica - odpowiedź zlałaby się w jeden akapit.
     */
    const parent = start.parentElement;
    const wrapper = parent && parent !== quoted ? (parent.cloneNode(false) as HTMLElement) : null;
    const target = wrapper ?? body;

    collectFromAnchor(start, quoted).forEach((node) => target.appendChild(node));
    if (wrapper) body.appendChild(wrapper);
}

/**
 * Dzieli treść wiadomości na część właściwą i doklejoną historię rozmowy.
 *
 * Działa dla obu zwyczajów: odpowiedzi NAD cytatem (Gmail, Outlook) i POD nim
 * (Thunderbird, Roundcube). Gdy nawet po odzyskaniu ogona treść zostaje pusta -
 * bo cała wiadomość jest cytatem, np. przekazana korespondencja - oddajemy
 * oryginał: lepiej pokazać za dużo niż nic.
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

    const hasContent = () => visibleTextLength(body) > 0 || body.querySelector('img') !== null;

    /*
     * Sam nagłówek cytatu to nie jest treść.
     *
     * Thunderbird pisze „W dniu … napisał(a):" w osobnym <div>, a historię w <blockquote>
     * pod nim. Kotwicą zostaje wtedy blockquote, więc w treści właściwej zostaje ten
     * nagłówek - niepusty, choć nie ma w nim ani słowa odpowiedzi. Bez tego sprawdzenia
     * wiadomość uchodziłaby za poprawnie podzieloną, a użytkownik widziałby zapowiedź
     * cytatu zamiast tego, co napisano.
     */
    const onlyQuoteHeader = () => {
        const children = Array.from(body.childNodes);
        // Po KAŻDYM dziecku osobno, nie po sklejonym tekście: dwa nagłówki obok siebie
        // („-------- Wiadomość oryginalna --------" i „W dniu … napisał(a):") tworzą
        // razem napis, który nie pasuje już do żadnego wzorca z osobna.
        return children.length > 0 && children.every((node) => isQuoteNode(node));
    };

    // Brak treści (albo sam nagłówek) znaczy, że cytat stał NAD odpowiedzią.
    if (!hasContent() || onlyQuoteHeader()) {
        // Nagłówek należy do historii i ma stać na jej początku, a nie nad odpowiedzią.
        // Od końca, bo każdy węzeł ląduje przed poprzednim - iteracja w przód
        // odwróciłaby kolejność nagłówka złożonego z kilku elementów.
        Array.from(body.childNodes)
            .reverse()
            .forEach((node) => quoted.insertBefore(node, quoted.firstChild));
        reclaimReplyBelowQuote(quoted, body);
    }
    if (!hasContent()) return { mainHtml: html, quotedHtml: null };
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
