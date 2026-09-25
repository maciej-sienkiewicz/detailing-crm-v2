// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    SIGNATURE_TEMPLATES,
    createSignatureDesign,
    getSignatureTemplate,
    isHexColor,
    hasImagePlaceholders,
    isSignatureDesignComplete,
    missingImages,
    renderSignature,
    scaleSignatureHtml,
    signatureScale,
    SIGNATURE_LOGO_PLACEHOLDER,
    SIGNATURE_PHOTO_PLACEHOLDER,
    withImagePlaceholders,
    toHref,
    type SignatureDesign,
} from './signatureTemplates';

const ICONS = 'https://api.example.pl/api/public/mail-signature/icons/v1';

const full: SignatureDesign = {
    template: 'klasyczna',
    fullName: 'Anna Kowalska',
    position: 'Opiekun klienta',
    company: 'Studio Blask',
    phone: '+48 600 123 456',
    email: 'anna@blask.pl',
    website: 'www.blask.pl',
    address: 'ul. Piękna 1, 00-001 Warszawa',
    photoUrl: 'https://api.example.pl/api/public/mail-signature/s/0123456789abcdef.jpg',
    logoUrl: 'https://api.example.pl/api/public/mail-signature/s/fedcba9876543210.png',
    linkedin: 'linkedin.com/in/anna',
    instagram: 'https://instagram.com/blask',
    color: '#0088b0',
    font: 'arial',
    size: 'm',
    iconStyle: 'mono',
};

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('renderSignature', () => {
    it('każdy z pięciu motywów pokazuje imię i nazwisko', () => {
        expect(SIGNATURE_TEMPLATES.map(t => t.id)).toEqual(['klasyczna', 'ze-zdjeciem', 'firmowa', 'baner-okrag', 'dwa-pasma']);
        SIGNATURE_TEMPLATES.forEach(template => {
            const html = renderSignature({ ...full, template: template.id }, ICONS);
            expect(parse(html).body.textContent).toContain('Anna Kowalska');
        });
    });

    it('układ jest na tabelach prezentacyjnych, bez <style> i bez klas', () => {
        SIGNATURE_TEMPLATES.forEach(template => {
            const html = renderSignature({ ...full, template: template.id }, ICONS);
            expect(html.startsWith('<table role="presentation"')).toBe(true);
            expect(html).not.toContain('<style');
            expect(html).not.toContain('class=');
        });
    });

    it('treść wpisana przez użytkownika jest escapowana', () => {
        const html = renderSignature({ ...full, fullName: '<img src=x onerror=alert(1)>', position: '"Szef" & spółka' }, ICONS);
        const doc = parse(html);
        expect(doc.querySelectorAll('img[onerror]')).toHaveLength(0);
        expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>');
        expect(doc.body.textContent).toContain('"Szef" & spółka');
    });

    it('telefon to link tel:, e-mail mailto:, strona dostaje https://', () => {
        const doc = parse(renderSignature(full, ICONS));
        const hrefs = Array.from(doc.querySelectorAll('a')).map(a => a.getAttribute('href'));
        expect(hrefs).toContain('tel:+48600123456');
        expect(hrefs).toContain('mailto:anna@blask.pl');
        expect(hrefs).toContain('https://www.blask.pl');
    });

    it('ikony social media idą z absolutnego katalogu backendu w wybranym stylu', () => {
        const doc = parse(renderSignature({ ...full, iconStyle: 'color-sq' }, `${ICONS}/`));
        const icons = Array.from(doc.querySelectorAll('a img')).map(img => img.getAttribute('src'));
        expect(icons).toEqual([`${ICONS}/color-sq/linkedin.png`, `${ICONS}/color-sq/instagram.png`]);
        expect(doc.querySelector('a[href="https://linkedin.com/in/anna"]')).not.toBeNull();
    });

    it('pola, których motyw nie pokazuje, nie trafiają do HTML-a', () => {
        // „Ze zdjęciem" nie ma adresu ani logo, „Klasyczna" nie ma zdjęcia, motywy z banerem nie mają social.
        const photo = renderSignature({ ...full, template: 'ze-zdjeciem' }, ICONS);
        expect(photo).not.toContain('Piękna');
        expect(photo).not.toContain('fedcba9876543210');
        expect(renderSignature(full, ICONS)).not.toContain('0123456789abcdef');
        expect(renderSignature({ ...full, template: 'dwa-pasma' }, ICONS)).not.toContain('linkedin');
    });

    it('motywy ze zdjęciem i logo osadzają oba obrazki z wymiarami w atrybutach', () => {
        ['baner-okrag', 'dwa-pasma'].forEach(id => {
            const doc = parse(renderSignature({ ...full, template: id as SignatureDesign['template'] }, ICONS));
            const photo = doc.querySelector(`img[src="${full.photoUrl}"]`);
            const logo = doc.querySelector(`img[src="${full.logoUrl}"]`);
            expect(photo?.getAttribute('width')).toBeTruthy();
            expect(photo?.getAttribute('height')).toBeTruthy();
            expect(logo?.getAttribute('width')).toBeTruthy();
        });
    });

    it('brak zdjęcia nie zostawia pustego obrazka', () => {
        ['ze-zdjeciem', 'baner-okrag', 'dwa-pasma'].forEach(id => {
            const html = renderSignature({ ...full, template: id as SignatureDesign['template'], photoUrl: null, logoUrl: '' }, ICONS);
            expect(parse(html).querySelectorAll('img[src=""]')).toHaveLength(0);
            expect(html).not.toContain('0123456789abcdef');
        });
    });

    it('kolor tła komórek jest i w atrybucie bgcolor (Outlook), i w CSS', () => {
        const html = renderSignature({ ...full, template: 'baner-okrag', color: '#123abc' }, ICONS);
        expect(html).toContain('bgcolor="#123abc"');
        expect(html).toContain('background:#123abc');
    });

    it('dopisek przy numerze pojawia się dopiero przy kilku numerach albo samym faksie', () => {
        expect(renderSignature(full, ICONS)).not.toContain('kom.');
        const many = renderSignature({ ...full, phoneLand: '22 100 20 30' }, ICONS);
        expect(many).toContain('kom.');
        expect(many).toContain('stacj.');
        const faxOnly = renderSignature({ ...full, phone: null, fax: '22 100 20 31' }, ICONS);
        expect(faxOnly).toContain('fax');
        expect(parse(faxOnly).querySelector('a[href^="tel:"]')).toBeNull();
    });

    it('rozmiar stopki zmniejsza wszystko: pismo, odstępy, szerokości i obrazki', () => {
        const normal = renderSignature({ ...full, template: 'ze-zdjeciem', scale: 100 }, ICONS);
        const small = renderSignature({ ...full, template: 'ze-zdjeciem', scale: 80 }, ICONS);
        expect(normal).toContain('font-size:17px');
        expect(small).toContain('font-size:14px');
        expect(normal).toContain('max-width:520px');
        expect(small).toContain('max-width:416px');
        // Zdjęcie: atrybuty dla Outlooka i CSS - jedno i drugie.
        const photo = parse(small).querySelector(`img[src="${full.photoUrl}"]`)!;
        expect(photo.getAttribute('width')).toBe('74');
        expect(photo.getAttribute('height')).toBe('74');
        expect(photo.getAttribute('style')).toContain('width:74px;height:74px');
        // Ikony social też maleją.
        expect(small).toContain('width="16" height="16"');
    });

    it('zmniejszanie nie rusza procentów, zer i nie schodzi z pismem poniżej 9 px', () => {
        const smallest = renderSignature({ ...full, template: 'baner-okrag', scale: 70, disclaimer: 'Poufne' }, ICONS);
        expect(smallest).toContain('border-radius:50%');
        expect(smallest).toContain('width:100%');
        expect(renderSignature({ ...full, scale: 70 }, ICONS)).toContain('font-size:0;line-height:0');
        const fonts = [...smallest.matchAll(/font-size:(\d+)px/g)].map(m => Number(m[1])).filter(px => px > 0);
        expect(Math.min(...fonts)).toBe(9);
        // Obramowanie 1 px zostaje linią, a nie znika.
        expect(smallest).toContain('border:1px solid #ececec');
    });

    it('projekt sprzed suwaka: wielkość tekstu S/M/L to rozmiar 90/100/110%', () => {
        expect(signatureScale({ size: 's' })).toBe(90);
        expect(signatureScale({ size: 'm' })).toBe(100);
        expect(signatureScale({ size: 'l' })).toBe(110);
        expect(signatureScale({ size: 'l', scale: 75 })).toBe(75);
        expect(renderSignature({ ...full, size: 'l', scale: null }, ICONS)).toContain('font-size:18px');
    });

    it('rozmiar 100% zostawia HTML bez zmian', () => {
        expect(scaleSignatureHtml('<div style="width:48px" width="10"></div>', 1)).toBe('<div style="width:48px" width="10"></div>');
    });

    it('czcionka trafia do każdego wiersza tekstu', () => {
        const html = renderSignature({ ...full, font: 'georgia' }, ICONS);
        expect(html).toContain("font-family:Georgia, 'Times New Roman', serif");
        expect(html).not.toContain('font-family:Arial');
    });

    it('stopka prawna zachowuje podział na linie', () => {
        const html = renderSignature({ ...full, disclaimer: 'Linia 1\nLinia <2>' }, ICONS);
        expect(html).toContain('Linia 1<br>Linia &lt;2&gt;');
    });

    it('stopka z pełnymi danymi mieści się w limicie backendu', () => {
        const longest = SIGNATURE_TEMPLATES.map(t =>
            renderSignature({
                ...full,
                template: t.id,
                scale: 120,
                phone2: '+48 601 000 000',
                phoneLand: '+48 22 000 00 00',
                fax: '+48 22 000 00 01',
                facebook: 'facebook.com/blask',
                youtube: 'youtube.com/@blask',
                tiktok: 'tiktok.com/@blask',
                disclaimer: 'x'.repeat(1000),
            }, ICONS).length
        );
        // MAX_DESIGNED_LENGTH w UserMailSignatureService.
        expect(Math.max(...longest)).toBeLessThan(16_000);
    });
});

describe('withImagePlaceholders', () => {
    it('wstawia zastępczy obrazek tylko w puste miejsca, które motyw przewiduje', () => {
        const empty = { ...full, photoUrl: null, logoUrl: '' };
        expect(withImagePlaceholders({ ...empty, template: 'ze-zdjeciem' })).toMatchObject({
            photoUrl: SIGNATURE_PHOTO_PLACEHOLDER,
            logoUrl: '',
        });
        expect(withImagePlaceholders({ ...empty, template: 'dwa-pasma' })).toMatchObject({
            photoUrl: SIGNATURE_PHOTO_PLACEHOLDER,
            logoUrl: SIGNATURE_LOGO_PLACEHOLDER,
        });
        expect(withImagePlaceholders({ ...empty, template: 'klasyczna' }).photoUrl).toBeNull();
        expect(hasImagePlaceholders({ ...empty, template: 'klasyczna' })).toBe(false);
        expect(hasImagePlaceholders({ ...empty, template: 'firmowa' })).toBe(true);
        expect(missingImages({ ...empty, template: 'dwa-pasma', logoUrl: 'https://x.pl/l.png' })).toEqual(['photoUrl']);
    });

    it('wgranego obrazka nie zastępuje', () => {
        expect(withImagePlaceholders({ ...full, template: 'baner-okrag' })).toMatchObject({
            photoUrl: full.photoUrl,
            logoUrl: full.logoUrl,
        });
        expect(hasImagePlaceholders({ ...full, template: 'baner-okrag' })).toBe(false);
    });
});

describe('pomocnicze', () => {
    it('toHref dopisuje https tylko tam, gdzie brakuje schematu', () => {
        expect(toHref('www.firma.pl')).toBe('https://www.firma.pl');
        expect(toHref('http://firma.pl')).toBe('http://firma.pl');
        expect(toHref('  ')).toBe('');
    });

    it('nowy projekt bierze dane z konta i studia', () => {
        const design = createSignatureDesign({ fullName: 'Jan Nowak', company: 'Studio', phone: '600' }, '#0ea5e9');
        expect(design).toMatchObject({ template: 'klasyczna', fullName: 'Jan Nowak', company: 'Studio', phone: '600', color: '#0ea5e9' });
        expect(isSignatureDesignComplete(design)).toBe(true);
        expect(isSignatureDesignComplete({ ...design, fullName: '  ' })).toBe(false);
    });

    it('nieznany motyw z bazy wraca jako Klasyczna zamiast wywrócić kreator', () => {
        expect(getSignatureTemplate('ekspert').id).toBe('klasyczna');
    });

    it('kolor musi być w postaci #RRGGBB', () => {
        expect(isHexColor('#0EA5E9')).toBe(true);
        expect(isHexColor('red')).toBe(false);
        expect(isHexColor('#abc')).toBe(false);
    });
});
