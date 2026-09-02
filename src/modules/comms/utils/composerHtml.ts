// src/modules/comms/utils/composerHtml.ts
// HTML, który wychodzi z kompozytora wiadomości.
//
// Edytor jest zwykłym contentEditable — przeglądarka wystawia z niego to, co uzna za
// stosowne: <span style="font-weight:700"> zamiast <b>, <div> zagnieżdżone w <div>,
// wklejone z Worda klasy i style. Do serwera (i do skrzynki klienta) ma trafić jeden
// ustalony, ubogi dialekt: pogrubienie, kursywa, podkreślenie, przekreślenie, listy,
// odnośniki i podziały wierszy — nic więcej. Backend sanityzuje jeszcze raz, ale to on
// ma dostać coś już czystego, a nie zgadywać, co edytor miał na myśli.

/** Znaczniki, które przechodzą dalej tak, jak stoją. Reszta jest rozpakowywana. */
const KEEP_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ul', 'ol', 'li', 'a', 'br', 'div', 'p', 'blockquote']);

/** Znaczniki, których treść wyrzucamy w całości — nigdy nie są tym, co użytkownik chciał wysłać. */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'head', 'title', 'svg', 'img', 'video', 'audio']);

/** Style, którymi przeglądarka wyraża formatowanie zamiast znacznikiem — tłumaczymy je z powrotem. */
const STYLE_TO_TAG: { test: (style: CSSStyleDeclaration) => boolean; tag: string }[] = [
    { test: (style) => /^(bold|[6-9]00)$/.test(style.fontWeight), tag: 'b' },
    { test: (style) => style.fontStyle === 'italic', tag: 'i' },
    { test: (style) => style.textDecorationLine.includes('underline') || style.textDecoration.includes('underline'), tag: 'u' },
    { test: (style) => style.textDecorationLine.includes('line-through') || style.textDecoration.includes('line-through'), tag: 's' },
];

const parse = (html: string): Document =>
    new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

const isSafeHref = (href: string): boolean => /^(https?:|mailto:|tel:)/i.test(href.trim());

/** Zamienia element na jego dzieci — zostaje treść, znika opakowanie. */
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

        if (KEEP_TAGS.has(tag)) {
            const href = tag === 'a' ? element.getAttribute('href') ?? '' : null;
            for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
            if (tag === 'a') {
                if (href && isSafeHref(href)) element.setAttribute('href', href.trim());
                else unwrap(element);
            }
            continue;
        }

        // <span style="font-weight:bold"> → <b>; kilka cech naraz → zagnieżdżone znaczniki.
        const tags = STYLE_TO_TAG.filter(({ test }) => test(element.style)).map(({ tag: name }) => name);
        if (tags.length > 0) {
            let wrapper: Element = document.createElement(tags[0]);
            let innermost = wrapper;
            for (const name of tags.slice(1)) {
                const inner = document.createElement(name);
                innermost.appendChild(inner);
                innermost = inner;
            }
            while (element.firstChild) innermost.appendChild(element.firstChild);
            element.parentNode?.replaceChild(wrapper, element);
            wrapper = innermost;
            continue;
        }

        // Nagłówki, tabele, spany, fonty… — treść zostaje, znacznik odpada.
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

/** Czy w treści jest cokolwiek do wysłania — tekst; puste znaczniki się nie liczą. */
export function isComposerHtmlEmpty(html: string): boolean {
    if (!html) return true;
    if (typeof DOMParser === 'undefined') return html.trim().length === 0;
    const text = parse(html).body.textContent ?? '';
    return text.replace(/\u00a0/g, ' ').trim().length === 0;
}

/**
 * Tekst wiadomości bez znaczników, z zachowanymi podziałami wierszy — do porównania
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
