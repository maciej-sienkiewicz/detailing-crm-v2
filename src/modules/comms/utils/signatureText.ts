// src/modules/comms/utils/signatureText.ts
//
// Stopka podróżuje między dwiema postaciami: człowiek pisze ją jako TEKST
// w polu wielowierszowym, a wysyłamy ją jako HTML. Ta zamiana musi być
// przejrzysta w obie strony, bo edytor pokazuje wynik odczytu - i to on jest
// tym, co użytkownik ogląda po zapisie.
//
// Zgłoszenie z produkcji: „Mikolaj Błaszczak / CarsLab" wracało jako nazwisko,
// pusta linia i wcięty „CarsLab". Przyczyna siedziała po stronie serwera
// (sanitizer wypisywał HTML „ładnie", z wcięciami), ale odczyt też miał w tym
// udział: zamieniał znaczniki na nowe linie ZWYKŁYM podstawieniem w napisie,
// więc każdy biały znak z formatowania HTML stawał się treścią stopki.
//
// Dlatego czytamy tak, jak czyta przeglądarka: białe znaki między znacznikami
// zwijają się do jednej spacji, a nową linię robi wyłącznie <br> albo granica
// elementu blokowego. Dzięki temu poprawnie odczytujemy także stopki zapisane
// PRZED naprawą serwera - nikt nie musi ich ratować ręcznie.

/** Elementy, które w tekście oznaczają przejście do nowej linii. */
const BLOCK_TAGS = new Set([
    'DIV', 'P', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE',
]);

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Tekst z pola edycji na HTML stopki. Jedna linia tekstu = jedno `<br>`. */
export const signatureTextToHtml = (value: string): string =>
    `<div>${escapeHtml(value.trim()).replace(/\n/g, '<br>')}</div>`;

/**
 * Zapisany HTML z powrotem na tekst - stopkę edytuje się tak, jak ją napisano.
 *
 * Zwijanie białych znaków jest tu SEDNEM, nie optymalizacją: to ono odróżnia
 * treść stopki od formatowania HTML, w którym ona przyjechała.
 */
export const signatureHtmlToText = (html: string | null): string => {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const lines: string[] = [];
    let current = '';

    const flush = () => {
        lines.push(current.trim());
        current = '';
    };

    const walk = (node: Node) => {
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                // Tak jak w przeglądarce: ciąg spacji, tabów i nowych linii to
                // jedna spacja. Wcięcie dołożone przez formatowanie HTML znika,
                // a odstęp wpisany przez człowieka w środku linii zostaje.
                current += (child.textContent ?? '').replace(/\s+/g, ' ');
                return;
            }
            if (child.nodeName === 'BR') {
                flush();
                return;
            }
            if (BLOCK_TAGS.has(child.nodeName)) {
                // Blok otwiera i zamyka linię, ale pusty nie dokłada własnej:
                // inaczej opakowanie <div> wokół całej stopki dawałoby pustkę
                // na początku i na końcu.
                if (current.trim()) flush();
                walk(child);
                if (current.trim()) flush();
                return;
            }
            walk(child);
        });
    };

    walk(doc.body);
    if (current.trim()) flush();

    // Pusta linia wpisana przez człowieka zostaje (rozdziela nazwisko od firmy),
    // ale trzy i więcej z rzędu to już ślad po czyimś formatowaniu.
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
