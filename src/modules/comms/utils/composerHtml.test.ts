// src/modules/comms/utils/composerHtml.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    composerHtmlToText,
    isComposerHtmlEmpty,
    normalizeComposerHtml,
    textToComposerHtml,
} from './composerHtml';

describe('normalizeComposerHtml', () => {
    it('zostawia proste formatowanie z edytora', () => {
        const html = '<div>Koszt: <b>990 zł</b> <i>brutto</i> <u>do potwierdzenia</u> <s>1200</s></div><ul><li>korekta</li></ul>';
        expect(normalizeComposerHtml(html)).toBe(html);
    });

    it('tłumaczy style przeglądarki na znaczniki', () => {
        const out = normalizeComposerHtml(
            '<div><span style="font-weight: bold;">Ważne</span> i <span style="font-style: italic; text-decoration: underline;">to</span></div>'
        );
        expect(out).toBe('<div><b>Ważne</b> i <i><u>to</u></i></div>');
    });

    it('wyrzuca obce style, klasy, skrypty i obrazki po wklejeniu', () => {
        const out = normalizeComposerHtml(
            '<div class="MsoNormal" style="color:red"><font face="Arial">Dzień dobry</font>' +
            '<script>alert(1)</script><img src="x.png"></div>'
        );
        expect(out).toBe('<div>Dzień dobry</div>');
    });

    it('zostawia tylko bezpieczne odnośniki', () => {
        const out = normalizeComposerHtml(
            '<div><a href="https://carslab.pl" target="_blank" onclick="x()">cennik</a> ' +
            '<a href="javascript:alert(1)">zły</a></div>'
        );
        expect(out).toBe('<div><a href="https://carslab.pl">cennik</a> zły</div>');
    });

    it('ucina puste wiersze z obu końców i puste listy', () => {
        const out = normalizeComposerHtml(
            '<div><br></div><div>Treść</div><div><br></div><ul><li><br></li></ul><div>&nbsp;</div>'
        );
        expect(out).toBe('<div>Treść</div>');
    });

    it('zwraca pusty ciąg, gdy nie ma treści', () => {
        expect(normalizeComposerHtml('<div><br></div><div></div>')).toBe('');
        expect(isComposerHtmlEmpty('<div><b></b><br></div>')).toBe(true);
        expect(isComposerHtmlEmpty('<div>a</div>')).toBe(false);
    });

    it('nagłówki i tabele z wklejki stają się zwykłymi wierszami', () => {
        expect(normalizeComposerHtml('<h2>Tytuł</h2><p>Akapit</p>')).toBe('<div>Tytuł</div><p>Akapit</p>');
    });
});

describe('composerHtmlToText', () => {
    it('zachowuje podziały wierszy i pozycje list', () => {
        expect(composerHtmlToText('<div>Dzień dobry,</div><div><br></div><ul><li>korekta</li><li>powłoka</li></ul>'))
            .toBe('Dzień dobry,\n\nkorekta\npowłoka');
    });
});

describe('textToComposerHtml', () => {
    it('każdy wiersz w osobnym bloku, puste jako <br>', () => {
        expect(textToComposerHtml('a <b>\r\n\nc')).toBe('<div>a &lt;b&gt;</div><div><br></div><div>c</div>');
    });
});

describe('wygląd: rozmiar pisma i kolory', () => {
    // Trzy cechy wyglądu przechodzą przez normalizację, reszta nie. Gdyby przechodziło
    // wszystko, `style` stałby się kanałem na `url()` i `expression()`; gdyby nie
    // przechodziło nic, przyciski w pasku formatowania byłyby atrapą — kolor widać
    // w edytorze, a wysłany mail wychodzi czarno-biały.

    it('zachowuje rozmiar pisma, kolor tekstu i kolor tła', () => {
        const out = normalizeComposerHtml(
            '<div><span style="font-size: 18px; color: #dc2626; background-color: #fef08a">Uwaga</span></div>'
        );
        expect(out).toContain('font-size: 18px');
        expect(out).toContain('color: #dc2626');
        expect(out).toContain('background-color: #fef08a');
    });

    it('sprowadza kolor z rgb() do zapisu szesnastkowego', () => {
        // Przeglądarki wystawiają rgb(), a starsze programy pocztowe rozumieją hex.
        const out = normalizeComposerHtml('<div><span style="color: rgb(220, 38, 38)">x</span></div>');
        expect(out).toContain('color: #dc2626');
    });

    it('skraca zapis trzyznakowy do pełnego', () => {
        const out = normalizeComposerHtml('<div><span style="color: #f00">x</span></div>');
        expect(out).toContain('color: #ff0000');
    });

    it('przycina rozmiar spoza dopuszczalnego zakresu zamiast go gubić', () => {
        // Intencja („to ma być duże") jest czytelna; 96 px w mailu już nie.
        expect(normalizeComposerHtml('<div><span style="font-size: 96px">x</span></div>'))
            .toContain('font-size: 40px');
        expect(normalizeComposerHtml('<div><span style="font-size: 4px">x</span></div>'))
            .toContain('font-size: 10px');
    });

    it('odrzuca wszystko, co nie jest tą trójką', () => {
        const out = normalizeComposerHtml(
            '<div><span style="color: #dc2626; position: fixed; width: 900px; font-family: Comic Sans">x</span></div>'
        );
        expect(out).toContain('color: #dc2626');
        expect(out).not.toContain('position');
        expect(out).not.toContain('width');
        expect(out).not.toContain('font-family');
    });

    it('odrzuca wartości koloru, które nie są kolorem', () => {
        // `style` przyjmuje url() i var() — filtr nazw właściwości sam by ich nie zatrzymał.
        const out = normalizeComposerHtml(
            '<div><span style="color: var(--x); background-color: url(javascript:alert(1))">x</span></div>'
        );
        expect(out).not.toContain('var(');
        expect(out).not.toContain('url(');
        expect(out).toBe('<div>x</div>');
    });

    it('pogrubienie zapisane stylem nadal wraca jako znacznik, nawet z kolorem obok', () => {
        // Regresja: dopuszczenie <span> do znaczników przepuszczanych bez zmian
        // sprawiło, że <span style="font-weight:bold"> przestawał być pogrubieniem.
        const out = normalizeComposerHtml(
            '<div><span style="font-weight: bold; color: #dc2626">Ważne</span></div>'
        );
        expect(out).toBe('<div><span style="color: #dc2626"><b>Ważne</b></span></div>');
    });

    it('span bez dozwolonego wyglądu znika razem z opakowaniem', () => {
        expect(normalizeComposerHtml('<div><span class="x">tekst</span></div>')).toBe('<div>tekst</div>');
    });

    it('przejmuje wygląd ze starego <font> z wklejonej korespondencji', () => {
        const out = normalizeComposerHtml('<div><font color="#16a34a" size="5">z maila</font></div>');
        expect(out).toContain('color: #16a34a');
        expect(out).toContain('font-size: 24px');
    });

    it('zdejmowanie tła jest zapisywane wprost, nie bielą', () => {
        // Biel zostawia plamę na ciemnym motywie klienta pocztowego.
        const out = normalizeComposerHtml('<div><span style="background-color: transparent">x</span></div>');
        expect(out).toContain('background-color: transparent');
    });
});
