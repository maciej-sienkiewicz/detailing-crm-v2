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

// ── Odpowiedź napisana POD cytatem ──────────────────────────────────────────
//
// Thunderbird, Roundcube i większość webmaili wstawiają nagłówek „W dniu …
// napisał(a):" na samą górę, pod nim cytat, a odpowiedź dopiero pod nim. Cięcie
// „od nagłówka w dół" wrzucało wtedy do historii także samą odpowiedź, treść
// właściwa wychodziła pusta i splitter oddawał oryginał - czyli wiadomość
// z pełnym cytatem, dokładnie tym, co miało zostać zwinięte.
describe('splitQuotedHistory - odpowiedź pod cytatem', () => {
    it('odzyskuje odpowiedź z czystego tekstu pod cytatem', () => {
        const html =
            '<div style="white-space:pre-wrap">W dniu 2026-09-21 11:17, klient@example.com napisał(a):\n' +
            '&gt; Dzień dobry, proszę o wycenę renowacji lamp.\n' +
            '&gt;\n' +
            '&gt; Pozdrawiam,\n' +
            '&gt; Piotr Franaszek\n' +
            '\n' +
            'Koszt usługi to 500,00 zł brutto za parę reflektorów.\n' +
            'Najbliższy termin to piątek 25.09.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('500,00 zł brutto');
        expect(mainHtml).toContain('piątek 25.09');
        expect(mainHtml).not.toContain('Piotr Franaszek');
        expect(quotedHtml).toContain('Piotr Franaszek');
    });

    it('odzyskuje odpowiedź spod cytatu w blockquote', () => {
        const html =
            '<div class="moz-cite-prefix">W dniu 2026-09-21 11:17, klient napisał(a):</div>' +
            '<blockquote type="cite"><p>Dzień dobry, proszę o wycenę renowacji lamp przednich.</p>' +
            '<p>Pozdrawiam, Piotr Franaszek</p></blockquote>' +
            '<p>Koszt usługi to 500,00 zł brutto za parę reflektorów.</p>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('500,00 zł brutto');
        expect(mainHtml).not.toContain('Piotr Franaszek');
        expect(quotedHtml).toContain('Piotr Franaszek');
    });

    it('zagnieżdżony cytat w całości zostaje historią', () => {
        const html =
            '<div style="white-space:pre-wrap">W dniu 2026-09-21 12:27, klient napisał(a):\n' +
            '&gt; Dziękuję, prosiłbym o zapisanie na piątek.\n' +
            '&gt;&gt; Wiadomość napisana przez biuro@carslab.pl:\n' +
            '&gt;&gt;&gt; Koszt usługi to 500 zł za parę reflektorów, termin piątek.\n' +
            '\n' +
            'Oczywiście, wizyta wpisana. Zapraszamy między 9:00 a 10:00.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('wizyta wpisana');
        expect(mainHtml).not.toContain('&gt;');
        expect(mainHtml).not.toContain('Dziękuję, prosiłbym');
        expect(quotedHtml).toContain('Dziękuję, prosiłbym');
    });

    it('odpowiedź nad cytatem działa jak dotąd', () => {
        // Kolejność prób nie jest dowolna: odzyskiwanie ogona rusza dopiero wtedy,
        // gdy cięcie zostawiło pustkę. Przy top-postingu nie ma prawa się odezwać.
        const html =
            '<p>Poproszę o wycenę powłoki ceramicznej na cały samochód.</p>' +
            '<div class="gmail_quote"><p>Dzień dobry, w czym możemy pomóc? Pozdrawiam, Studio Detailingu</p></div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('powłoki ceramicznej');
        expect(mainHtml).not.toContain('w czym możemy pomóc');
        expect(quotedHtml).toContain('w czym możemy pomóc');
    });

    it('wieloczęściowy nagłówek trafia do historii w swojej kolejności', () => {
        // Nagłówki wędrują na początek historii pojedynczo, więc przenoszenie ich
        // w przód odwracałoby kolejność - cytat czytałby się od tyłu.
        const html =
            '<div class="moz-cite-prefix">-------- Wiadomość oryginalna --------</div>' +
            '<div class="moz-cite-prefix">W dniu 2026-09-21 11:17, klient napisał(a):</div>' +
            '<blockquote type="cite"><p>Dzień dobry, proszę o wycenę renowacji lamp przednich.</p></blockquote>' +
            '<p>Koszt usługi to 500,00 zł brutto za parę reflektorów.</p>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('500,00 zł brutto');
        expect(quotedHtml?.indexOf('Wiadomość oryginalna')).toBeLessThan(
            quotedHtml?.indexOf('W dniu 2026-09-21') ?? -1
        );
    });

    it('wiadomość złożona wyłącznie z cytatu zostaje pokazana w całości', () => {
        // Przekazana korespondencja nie ma własnej treści. Zwinięcie wszystkiego
        // zostawiłoby pustą chmurkę, więc lepiej pokazać za dużo niż nic.
        const html =
            '<div style="white-space:pre-wrap">W dniu 2026-09-21 11:17, klient napisał(a):\n' +
            '&gt; Dzień dobry, proszę o wycenę renowacji lamp przednich w Passacie.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(quotedHtml).toBeNull();
        expect(mainHtml).toBe(html);
    });
});

// ── Rozpoznanie niezależne od języka ────────────────────────────────────────
//
// Lista fraz zna tyle języków, ile jej wpisano. Obok niej stoi reguła kształtu:
// krótka linia z dwukropkiem, a zaraz pod nią cytat - konwencja formatu poczty,
// nie języka. Poniższe wiadomości nie zawierają ani jednego słowa z listy.
describe('splitQuotedHistory - klienci spoza listy fraz', () => {
    it('niemiecka zapowiedź cytatu w czystym tekście', () => {
        const html =
            '<div style="white-space:pre-wrap">Am 21.09.2026 um 11:17 schrieb Piotr Franaszek:\n' +
            '&gt; Dzień dobry, proszę o wycenę renowacji lamp przednich.\n' +
            '\n' +
            'Koszt usługi to 500,00 zł brutto za parę reflektorów.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('500,00 zł brutto');
        expect(mainHtml).not.toContain('Am 21.09.2026');
        expect(quotedHtml).toContain('proszę o wycenę');
    });

    it('francuska zapowiedź cytatu nad blockquote', () => {
        const html =
            '<div>Le 21/09/2026 à 11:17, Piotr Franaszek a écrit :</div>' +
            '<blockquote><p>Dzień dobry, proszę o wycenę renowacji lamp przednich w Passacie.</p></blockquote>' +
            '<p>Koszt usługi to 500,00 zł brutto za parę reflektorów.</p>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('500,00 zł brutto');
        expect(mainHtml).not.toContain('a écrit');
        expect(quotedHtml).toContain('a écrit');
    });

    it('niemiecka zapowiedź nad cytatem, odpowiedź na górze', () => {
        const html =
            '<div style="white-space:pre-wrap">Poproszę o termin na przyszły tydzień.\n' +
            '\n' +
            'Am 21.09.2026 um 11:17 schrieb Studio:\n' +
            '&gt; Dzień dobry, w załączeniu wycena renowacji lamp przednich.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(mainHtml).toContain('przyszły tydzień');
        expect(mainHtml).not.toContain('Am 21.09.2026');
        expect(quotedHtml).toContain('w załączeniu wycena');
    });

    it('zdanie z dwukropkiem bez cytatu pod spodem zostaje treścią', () => {
        // Reguła kształtu nie może zjadać treści - trzyma ją warunek „zaraz pod
        // spodem stoi cytat". Bez cytatu dwukropek jest po prostu dwukropkiem.
        const html =
            '<div style="white-space:pre-wrap">Dzień dobry, proszę o wycenę na:\n' +
            'renowację lamp oraz polerowanie maski.</div>';

        const { mainHtml, quotedHtml } = splitQuotedHistory(html);

        expect(quotedHtml).toBeNull();
        expect(mainHtml).toContain('proszę o wycenę na:');
        expect(mainHtml).toContain('polerowanie maski');
    });
});
