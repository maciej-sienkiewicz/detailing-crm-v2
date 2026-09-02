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
