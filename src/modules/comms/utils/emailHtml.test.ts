// src/modules/comms/utils/emailHtml.test.ts
// Przypadki pochodzą z prawdziwej skrzynki CRM - każdy z nich potrafił wcześniej
// zepsuć widok wątku (ucięta treść, powtórzona historia, tekst ukryty pod
// przyciskiem „wiadomość graficzna").
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { describeHtml, isRichHtml, plainPreview, splitQuotedHistory, trimEmptyEdges } from './emailHtml';

const textOf = (html: string): string =>
    (new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();

describe('splitQuotedHistory', () => {
    it('odcina kontener cytatu Gmaila', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div>Dzień dobry, potwierdzam termin.</div>' +
            '<div class="gmail_quote"><blockquote>Wcześniejsza rozmowa o terminie wizyty i cenniku detailingu.</blockquote></div>'
        );
        expect(textOf(mainHtml)).toContain('potwierdzam termin');
        expect(textOf(mainHtml)).not.toContain('cenniku');
        expect(textOf(quotedHtml ?? '')).toContain('cenniku');
    });

    it('odcina nagłówek „W dniu … napisał:”', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div>Tak, poproszę o wycenę.</div>' +
            '<div>W dniu 2 sierpnia 2026 Jan Kowalski &lt;jan@example.com&gt; napisał:</div>' +
            '<div>Przesyłam ofertę na korektę lakieru wraz z cennikiem i terminami.</div>'
        );
        expect(textOf(mainHtml).trim()).toBe('Tak, poproszę o wycenę.');
        expect(textOf(quotedHtml ?? '')).toContain('Przesyłam ofertę');
    });

    it('odcina wariant „W dniu … pisze:” (Thunderbird)', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<p>Witam ponownie :)</p><p>Jakub Bartłomiejczak</p>' +
            '<div>W dniu 18.08.2026 o&nbsp;03:38, M.Henkel pisze:<br></div>' +
            '<blockquote><div>Bardzo dziękuję za wycenę, proszę jeszcze o opcję oklejenia dachu.</div></blockquote>'
        );
        expect(textOf(mainHtml)).not.toContain('dziękuję za wycenę');
        expect(textOf(quotedHtml ?? '')).toContain('dziękuję za wycenę');
    });

    it('odcina cytat Gmaila mobile („… użytkownik … napisał:”)', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div dir="auto">Auto ma szybę panoramiczną.</div><br>' +
            '<div><div dir="ltr">wt., 18 sie 2026, 15:35 użytkownik Biuro CarsLab &lt;biuro@carslab.pl&gt; napisał:<br></div>' +
            '<blockquote>Prośba tylko o informację czy jest szyberdach czy cały dach w kolorze.</blockquote></div>'
        );
        expect(textOf(mainHtml)).toBe('Auto ma szybę panoramiczną.');
        expect(textOf(quotedHtml ?? '')).toContain('szyberdach');
    });

    it('odcina cytat w czystym tekście (linie z „>” w pre-wrap)', () => {
        const { mainHtml, quotedHtml } = splitQuotedHistory(
            '<div style="white-space:pre-wrap">Dzień dobry :)\n\nWidełki to 16 000 - 19 000 zł netto.\n\n' +
            'Pozdrawiam\nJakub\n\nW dniu 15.08.2026 o&nbsp;20:57, M.Henkel pisze:\n' +
            '&gt; Dzień dobry,\n&gt; Chciałbym okleić swoje auto folią i zmienić kolor.\n&gt;\n</div>'
        );
        expect(textOf(mainHtml)).toContain('Widełki to 16 000');
        expect(textOf(mainHtml)).not.toContain('Chciałbym okleić');
        expect(textOf(quotedHtml ?? '')).toContain('Chciałbym okleić');
    });

    it('nie tnie, gdy cytat jest całą treścią (przekazana korespondencja)', () => {
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
    it('rozpoznaje wiadomość niosącą treść w obrazkach', () => {
        const shape = describeHtml('<div><img src="/banner.png"><img src="/stopka.png">Zobacz</div>');
        expect(shape.isGraphical).toBe(true);
    });

    it('nie uznaje zwykłego maila ze zdjęciem za graficzny', () => {
        // Realny przypadek: kilka zdań treści plus zdjęcie od klienta.
        const shape = describeHtml(
            '<div>Witam, auto ma szybę panoramiczną. Wygląda to mniej więcej tak jak na zdjęciu.' +
            ' Pozdrawiam<img src="/api/v1/comms/attachments/1/inline"></div>'
        );
        expect(shape.isGraphical).toBe(false);
    });

    it('pomija obrazki bez źródła', () => {
        const shape = describeHtml('<div>Krótko.<img style="max-width:100%"></div>');
        expect(shape.imageCount).toBe(0);
        expect(shape.isGraphical).toBe(false);
    });
});

describe('isRichHtml', () => {
    it('kieruje newsletter na tabelach do izolowanej ramki', () => {
        expect(isRichHtml('<table bgcolor="#0f172a"><tr><td>Promocja</td></tr></table>')).toBe(true);
    });

    it('zwykłą korespondencję renderuje wprost', () => {
        expect(isRichHtml('<div dir="auto">Dzień dobry,<div>Proszę o wycenę.</div></div>')).toBe(false);
        expect(isRichHtml('<div style="white-space:pre-wrap">Dzień dobry :)</div>')).toBe(false);
    });
});

describe('trimEmptyEdges', () => {
    it('usuwa obrazki bez źródła i pustkę na końcu', () => {
        const cleaned = trimEmptyEdges(
            '<div dir="auto">Pozdrawiam<div><br><img style="max-width:100%"><br><br></div><div><br></div></div>'
        );
        expect(cleaned).not.toContain('<img');
        expect(textOf(cleaned)).toBe('Pozdrawiam');
    });

    it('zachowuje odstępy w środku treści', () => {
        const cleaned = trimEmptyEdges('<div>Pierwszy</div><div><br></div><div>Drugi</div>');
        expect(cleaned).toContain('<br>');
    });
});

describe('plainPreview', () => {
    it('składa jednolinijkowy podgląd do zwiniętego wiersza', () => {
        expect(plainPreview('<div>Dzień dobry,</div><div>Proszę o wycenę oklejenia.</div>'))
            .toBe('Dzień dobry, Proszę o wycenę oklejenia.');
    });

    it('skraca długą treść', () => {
        expect(plainPreview('<p>' + 'słowo '.repeat(60) + '</p>', 40)).toHaveLength(41);
    });
});
