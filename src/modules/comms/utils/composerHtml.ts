// src/modules/comms/utils/composerHtml.ts
// HTML, który wychodzi z kompozytora wiadomości.
//
// Edytor jest zwykłym contentEditable - przeglądarka wystawia z niego to, co uzna za
// stosowne: <span style="font-weight:700"> zamiast <b>, <div> zagnieżdżone w <div>,
// wklejone z Worda klasy i style. Do serwera (i do skrzynki klienta) ma trafić jeden
// ustalony, ubogi dialekt: pogrubienie, kursywa, podkreślenie, przekreślenie, listy,
// odnośniki, podziały wierszy oraz TRZY cechy wyglądu - rozmiar pisma, kolor tekstu
// i kolor tła. Backend sanityzuje jeszcze raz, ale to on ma dostać coś już czystego,
// a nie zgadywać, co edytor miał na myśli.
//
// Kolory i rozmiary przechodzą PRZEZ FILTR WARTOŚCI, nie tylko przez filtr nazw
// właściwości. Powód jest podwójny. Bezpieczeństwo: `style` przyjmuje `url()`,
// `expression()` i `var()`, więc przepuszczanie dowolnego ciągu byłoby otwarciem
// kanału, którego reszta tego pliku pilnuje. I zwyczajna czytelność maila: wklejone
// z Worda `font-size: 7.5pt` czy jasnoszary tekst na białym tle wychodzą u odbiorcy
// jako coś nie do przeczytania. Zostaje piksel w rozsądnym zakresie i kolor
// sprowadzony do zapisu, który rozumie każdy program pocztowy.

/** Znaczniki, które przechodzą dalej tak, jak stoją. Reszta jest rozpakowywana. */
const KEEP_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ul', 'ol', 'li', 'a', 'br', 'div', 'p', 'blockquote']);

/** Znaczniki, których treść wyrzucamy w całości - nigdy nie są tym, co użytkownik chciał wysłać. */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'head', 'title', 'svg', 'img', 'video', 'audio']);

/** Style, którymi przeglądarka wyraża formatowanie zamiast znacznikiem - tłumaczymy je z powrotem. */
const STYLE_TO_TAG: { test: (style: CSSStyleDeclaration) => boolean; tag: string }[] = [
    { test: (style) => /^(bold|[6-9]00)$/.test(style.fontWeight), tag: 'b' },
    { test: (style) => style.fontStyle === 'italic', tag: 'i' },
    { test: (style) => style.textDecorationLine.includes('underline') || style.textDecoration.includes('underline'), tag: 'u' },
    { test: (style) => style.textDecorationLine.includes('line-through') || style.textDecoration.includes('line-through'), tag: 's' },
];

/**
 * Zakres rozmiaru pisma, jaki wolno wysłać. Dolna granica to próg czytelności na
 * telefonie, górna - moment, w którym akapit przestaje być akapitem. Wklejone spoza
 * zakresu przycinamy do najbliższej granicy zamiast odrzucać: intencja („to ma być
 * duże") jest czytelna i szkoda ją gubić.
 */
const MIN_FONT_SIZE_PX = 10;
const MAX_FONT_SIZE_PX = 40;

/** `<font size="1..7">` z wklejonego maila na piksele - skala z HTML 3.2. */
const LEGACY_FONT_SIZES: Record<string, number> = {
    '1': 10, '2': 13, '3': 14, '4': 18, '5': 24, '6': 32, '7': 40,
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i;

/**
 * Kolor sprowadzony do `#rrggbb` albo null, gdy wartość nie jest kolorem, który
 * chcemy wysłać. Przeglądarki wystawiają `rgb(...)`, wklejenia niosą `#abc`, nazwy
 * CSS i `var(--cokolwiek)` - do maila ma iść jeden zapis, bo tylko na nim można
 * polegać w starszych programach pocztowych.
 */
const toHexColor = (raw: string): string | null => {
    const value = raw.trim().toLowerCase();
    if (!value) return null;

    if (HEX_COLOR.test(value)) {
        if (value.length === 4) {
            return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
        }
        return value;
    }

    const rgb = RGB_COLOR.exec(value);
    if (!rgb) return null;
    const channels = [rgb[1], rgb[2], rgb[3]].map((part) => Number(part));
    if (channels.some((channel) => channel > 255)) return null;
    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Dozwolony fragment `style` danego elementu - pusty ciąg, gdy nie ma czego zachować.
 *
 * Białą listą są NAZWY właściwości i osobno ich WARTOŚCI; nic spoza tej trójki nie
 * przechodzi, także wtedy, gdy stoi w tym samym atrybucie co coś dozwolonego.
 */
const allowedStyle = (element: HTMLElement): string => {
    const declarations: string[] = [];

    const fontSize = element.style.fontSize;
    if (fontSize.endsWith('px')) {
        const pixels = Number.parseFloat(fontSize);
        if (Number.isFinite(pixels)) {
            const clamped = Math.round(Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, pixels)));
            declarations.push(`font-size: ${clamped}px`);
        }
    }

    const color = toHexColor(element.style.color);
    if (color) declarations.push(`color: ${color}`);

    // `transparent` to jedyne słowo kluczowe, jakiego potrzebujemy: tak zdejmuje się
    // wcześniej nałożone tło. Bez niego „bez tła" musiałoby wpisywać biel, która na
    // ciemnym motywie klienta pocztowego wygląda jak zamalowany fragment.
    const rawBackground = element.style.backgroundColor.trim().toLowerCase();
    if (rawBackground === 'transparent' || rawBackground === 'rgba(0, 0, 0, 0)') {
        declarations.push('background-color: transparent');
    } else {
        const background = toHexColor(rawBackground);
        if (background) declarations.push(`background-color: ${background}`);
    }

    return declarations.join('; ');
};

/**
 * `<font color size>` z wklejonej korespondencji na style, które rozumie [allowedStyle].
 * Sam znacznik i tak zaraz zniknie - chodzi o to, żeby nie zabrał ze sobą wyglądu.
 */
const adoptLegacyFontAttributes = (element: HTMLElement): void => {
    if (element.tagName.toLowerCase() !== 'font') return;
    const color = element.getAttribute('color');
    if (color && !element.style.color) element.style.color = color;
    const size = element.getAttribute('size');
    const pixels = size ? LEGACY_FONT_SIZES[size.trim()] : undefined;
    if (pixels && !element.style.fontSize) element.style.fontSize = `${pixels}px`;
};

const parse = (html: string): Document =>
    new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

const isSafeHref = (href: string): boolean => /^(https?:|mailto:|tel:)/i.test(href.trim());

/** Zamienia element na jego dzieci - zostaje treść, znika opakowanie. */
const unwrap = (element: Element) => {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
};

function cleanNode(node: Node, document: Document): void {
    // Kopia listy: w pętli podmieniamy węzły, a NodeList jest żywy.
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.COMMENT_NODE) {
            node.removeChild(child);
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;

        const element = child as HTMLElement;
        const tag = element.tagName.toLowerCase();

        if (DROP_TAGS.has(tag)) {
            node.removeChild(element);
            continue;
        }

        cleanNode(element, document);
        adoptLegacyFontAttributes(element);

        // Liczone PRZED zdjęciem atrybutów - potem nie ma już czego czytać.
        const style = allowedStyle(element);

        if (KEEP_TAGS.has(tag)) {
            const href = tag === 'a' ? element.getAttribute('href') ?? '' : null;
            for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
            if (style) element.setAttribute('style', style);
            if (tag === 'a') {
                if (href && isSafeHref(href)) element.setAttribute('href', href.trim());
                else unwrap(element);
            }
            continue;
        }

        // <span style="font-weight:bold"> → <b>; kilka cech naraz → zagnieżdżone znaczniki.
        //
        // Wygląd (rozmiar, kolory) nie ma swojego znacznika, więc wraca jako <span> na
        // samym wierzchu - jeden element opisuje wtedy jedną rzecz. Dlatego <span> NIE
        // stoi wśród znaczników przepuszczanych bez zmian: przechodziłby obok tego
        // tłumaczenia i pogrubienie zapisane stylem gubiłoby swoje znaczenie.
        // Span bez niczego dozwolonego wypada niżej, przy `unwrap`.
        const tags = STYLE_TO_TAG.filter(({ test }) => test(element.style)).map(({ tag: name }) => name);
        if (style) tags.unshift('span');
        if (tags.length > 0) {
            const wrapper: Element = document.createElement(tags[0]);
            if (style) wrapper.setAttribute('style', style);
            let innermost = wrapper;
            for (const name of tags.slice(1)) {
                const inner = document.createElement(name);
                innermost.appendChild(inner);
                innermost = inner;
            }
            while (element.firstChild) innermost.appendChild(element.firstChild);
            element.parentNode?.replaceChild(wrapper, element);
            continue;
        }

        // Nagłówki, tabele, spany, fonty… - treść zostaje, znacznik odpada.
        // Bloki dostają własny wiersz, żeby wklejone akapity nie zlewały się w jeden.
        if (/^(h[1-6]|tr|table|section|article|header|footer|pre)$/.test(tag)) {
            const block = document.createElement('div');
            while (element.firstChild) block.appendChild(element.firstChild);
            element.parentNode?.replaceChild(block, element);
            continue;
        }
        unwrap(element);
    }
}

const isBlankBlock = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? '').replace(/\u00a0/g, ' ').trim().length === 0;
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    const element = node as Element;
    if (element.tagName === 'BR') return true;
    return (element.textContent ?? '').replace(/\u00a0/g, ' ').trim().length === 0
        && element.querySelector('li') === null;
};

/**
 * Doprowadza HTML z edytora do ustalonego dialektu i ucina puste wiersze z obu
 * końców (kilka Enterów przed kliknięciem „Wyślij" nie ma zostawiać dziury
 * w skrzynce odbiorcy). Zwraca pusty ciąg, gdy nie ma żadnej treści.
 */
export function normalizeComposerHtml(html: string): string {
    if (!html || typeof DOMParser === 'undefined') return html ?? '';
    const document = parse(html);
    const body = document.body;
    cleanNode(body, document);

    // Puste listy i puste elementy listy to śmieci po Backspace w edytorze.
    body.querySelectorAll('li').forEach((item) => {
        if ((item.textContent ?? '').replace(/\u00a0/g, ' ').trim().length === 0) item.remove();
    });
    body.querySelectorAll('ul, ol').forEach((list) => {
        if (list.querySelector('li') === null) list.remove();
    });

    while (body.firstChild && isBlankBlock(body.firstChild)) body.removeChild(body.firstChild);
    while (body.lastChild && isBlankBlock(body.lastChild)) body.removeChild(body.lastChild);

    return isComposerHtmlEmpty(body.innerHTML) ? '' : body.innerHTML;
}

/** Czy w treści jest cokolwiek do wysłania - tekst; puste znaczniki się nie liczą. */
export function isComposerHtmlEmpty(html: string): boolean {
    if (!html) return true;
    if (typeof DOMParser === 'undefined') return html.trim().length === 0;
    const text = parse(html).body.textContent ?? '';
    return text.replace(/\u00a0/g, ' ').trim().length === 0;
}

/**
 * Tekst wiadomości bez znaczników, z zachowanymi podziałami wierszy - do porównania
 * „czy korekta coś zmieniła" i do podglądów.
 */
export function composerHtmlToText(html: string): string {
    if (!html) return '';
    if (typeof DOMParser === 'undefined') return html;
    const document = parse(html);
    document.body.querySelectorAll('br').forEach((node) => node.replaceWith(document.createTextNode('\n')));
    document.body.querySelectorAll('div, p, li, blockquote').forEach((node) => {
        node.appendChild(document.createTextNode('\n'));
    });
    return (document.body.textContent ?? '')
        .replace(/\u00a0/g, ' ')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Czysty tekst (np. wklejony) jako HTML kompozytora: jeden <div> na wiersz. */
export function textToComposerHtml(text: string): string {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    return lines.map((line) => `<div>${line ? escapeHtml(line) : '<br>'}</div>`).join('');
}
