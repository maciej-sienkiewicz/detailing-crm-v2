// src/modules/comms/utils/emailHtml.test.ts
// Cięcie cytatów pracuje na DOM-ie przeglądarki, stąd jawne środowisko jsdom
// (domyślnym dla plików .test.ts jest node).
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { describeHtml, splitQuotedHistory } from './emailHtml';

const textOf = (html: string): string =>
    new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body.textContent ?? '';

describe('splitQuotedHistory', () => {
    it('odcina cytat Gmaila', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div>Dzień dobry, potwierdzam termin.</div>' +
            '<div class="gmail_quote"><blockquote>Wcześniejsza rozmowa o terminie wizyty i cenniku detailingu.</blockquote></div>'
        );
        expect(textOf(mainHtml)).toContain('potwierdzam termin');
        expect(textOf(mainHtml)).not.toContain('cenniku');
        expect(textOf(quotedHtml ?? '')).toContain('cenniku');
    });

    it('odcina polski nagłówek „W dniu … napisał:”', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div>Tak, poproszę o wycenę.</div>' +
            '<div>W dniu 2 sierpnia 2026 Jan Kowalski &lt;jan@example.com&gt; napisał:</div>' +
            '<div>Przesyłam ofertę na korektę lakieru wraz z cennikiem i terminami.</div>'
        );
        expect(textOf(mainHtml).trim()).toBe('Tak, poproszę o wycenę.');
        expect(textOf(quotedHtml ?? '')).toContain('Przesyłam ofertę');
    });

    it('odcina blok Outlooka „Od: … Wysłano: …”', () => {
        const { quotedHtml } = splitQuotedHistory(
            '<p>Dziękuję za informację.</p>' +
            '<div>Od: Anna Nowak Wysłano: poniedziałek, 3 sierpnia 2026 Do: biuro@studio.pl ' +
            'Temat: Wycena — w załączeniu przesyłam szczegóły zamówienia.</div>'
        );
        expect(quotedHtml).not.toBeNull();
        expect(textOf(quotedHtml ?? '')).toContain('Anna Nowak');
    });

    it('nie tnie wiadomości, w której cytat jest całą treścią', () => {
        const html =
            '<div class="gmail_quote">Cała treść jest przekazaną korespondencją o długości ponad czterdziestu znaków.</div>';
        expect(splitQuotedHistory(html)).toEqual({ mainHtml: html, quotedHtml: null });
    });

    it('nie tnie zwykłej wiadomości', () => {
        const html = '<p>Dzień dobry, czy jest wolny termin w piątek?</p>';
        expect(splitQuotedHistory(html)).toEqual({ mainHtml: html, quotedHtml: null });
    });

    it('ignoruje szczątkowy cytat', () => {
        const html = '<div>Potwierdzam.</div><div class="gmail_quote">ok</div>';
        expect(splitQuotedHistory(html).quotedHtml).toBeNull();
    });
});

describe('describeHtml', () => {
    it('rozpoznaje wiadomość graficzną', () => {
        const shape = describeHtml('<div><img src="/banner.png"><img src="/stopka.png">Zobacz ofertę</div>');
        expect(shape.isGraphical).toBe(true);
        expect(shape.imageCount).toBe(2);
    });

    it('nie uznaje maila z logotypem za graficzny', () => {
        const shape = describeHtml(
            `<div><img src="/logo.png"><p>${'Dzień dobry, w załączeniu przesyłam szczegóły. '.repeat(6)}</p></div>`
        );
        expect(shape.isGraphical).toBe(false);
    });
});
