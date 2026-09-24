// src/modules/comms/utils/signatureTemplates.ts
// Renderer motywów stopki e-mail.
//
// JEDYNY renderer: rysuje podgląd na żywo w kreatorze i ten sam HTML idzie do backendu
// jako treść stopki (backend tylko go czyści sanitizerem i dokleja przy wysyłce). Drugi
// renderer po stronie serwera prędzej czy później pokazałby w podglądzie co innego niż
// u odbiorcy - dlatego serwer przechowuje projekt wyłącznie do ponownej edycji.
//
// Wynik to HTML „pocztowy", nie webowy, i każda decyzja poniżej wynika z klientów poczty:
//  - układ na tabelach z role="presentation": Outlook (silnik Worda) nie zna flexa,
//    grida ani float, a divom z szerokością nie ufa,
//  - style wyłącznie inline: Gmail wycina <style> z treści wiadomości,
//  - kolor tła dwa razy (bgcolor + background): Outlook czyta atrybut, reszta CSS,
//  - obrazki z width/height w atrybutach: bez nich Outlook rysuje je w naturalnym rozmiarze,
//  - zdjęcie jest kwadratem przyciętym po stronie serwera, bo object-fit nie działa
//    w Outlooku, a border-radius:50% tylko je zaokrągla tam, gdzie to wspierane,
//  - czcionki tylko systemowe: webfontów nie ładuje większość klientów,
//  - ikony jako PNG spod absolutnego adresu backendu: SVG w poczcie nie działa.

export type SignatureTemplateId = 'klasyczna' | 'ze-zdjeciem' | 'firmowa' | 'baner-okrag' | 'dwa-pasma';
export type SignatureFontId = 'arial' | 'helvetica' | 'verdana' | 'trebuchet' | 'tahoma' | 'georgia' | 'times';
export type SignatureSizeId = 's' | 'm' | 'l';
export type SignatureIconStyle = 'mono' | 'color' | 'color-sq';
export type SignatureSocialKey = 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok';
export type SignatureImageKey = 'photoUrl' | 'logoUrl';
export type SignatureTextKey =
    | 'fullName' | 'position' | 'company'
    | 'phone' | 'phone2' | 'phoneLand' | 'fax'
    | 'email' | 'website' | 'address' | 'disclaimer';

/**
 * Projekt stopki - ten sam kształt, który backend zapisuje jako JSON
 * (MailSignatureDesign). Puste pole = wiersz nie pojawia się w stopce.
 */
export interface SignatureDesign extends Partial<Record<SignatureTextKey | SignatureImageKey | SignatureSocialKey, string | null>> {
    template: SignatureTemplateId;
    color: string;
    font: SignatureFontId;
    size: SignatureSizeId;
    iconStyle: SignatureIconStyle;
}

export interface SignatureFieldDef {
    label: string;
    placeholder?: string;
    type: 'text' | 'tel' | 'email' | 'url' | 'textarea';
    required?: boolean;
    autoComplete?: string;
}

export const SIGNATURE_TEXT_FIELDS: Record<SignatureTextKey, SignatureFieldDef> = {
    fullName: { label: 'Imię i nazwisko', type: 'text', required: true, placeholder: 'Anna Kowalska', autoComplete: 'name' },
    position: { label: 'Stanowisko', type: 'text', placeholder: 'Opiekun klienta' },
    company: { label: 'Firma', type: 'text', placeholder: 'Studio Detailingu' },
    phone: { label: 'Telefon komórkowy', type: 'tel', placeholder: '+48 600 000 000', autoComplete: 'tel' },
    phone2: { label: 'Drugi telefon komórkowy', type: 'tel', placeholder: '+48 601 000 000' },
    phoneLand: { label: 'Telefon stacjonarny', type: 'tel', placeholder: '+48 22 000 00 00' },
    fax: { label: 'Fax', type: 'tel', placeholder: '+48 22 000 00 01' },
    email: { label: 'Adres e-mail', type: 'email', placeholder: 'anna@studio.pl', autoComplete: 'email' },
    website: { label: 'Strona WWW', type: 'url', placeholder: 'www.studio.pl' },
    address: { label: 'Adres firmy', type: 'text', placeholder: 'ul. Piękna 1, 00-001 Warszawa' },
    disclaimer: { label: 'Stopka prawna (opcjonalnie)', type: 'textarea', placeholder: 'Ta wiadomość może zawierać informacje poufne…' },
};

export const SIGNATURE_SOCIAL_FIELDS: Record<SignatureSocialKey, SignatureFieldDef> = {
    linkedin: { label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/…' },
    facebook: { label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
    instagram: { label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
    youtube: { label: 'YouTube', type: 'url', placeholder: 'https://youtube.com/@…' },
    tiktok: { label: 'TikTok', type: 'url', placeholder: 'https://tiktok.com/@…' },
};

export const SIGNATURE_SOCIAL_KEYS = Object.keys(SIGNATURE_SOCIAL_FIELDS) as SignatureSocialKey[];

export const SIGNATURE_FONTS: { id: SignatureFontId; label: string; stack: string }[] = [
    { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
    { id: 'helvetica', label: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
    { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
    { id: 'trebuchet', label: 'Trebuchet MS', stack: "'Trebuchet MS', Helvetica, sans-serif" },
    { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
    { id: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
    { id: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
];

export const SIGNATURE_SIZES: { id: SignatureSizeId; label: string; scale: number }[] = [
    { id: 's', label: 'Mała', scale: 0.9 },
    { id: 'm', label: 'Średnia', scale: 1 },
    { id: 'l', label: 'Duża', scale: 1.12 },
];

export const SIGNATURE_ICON_STYLES: { id: SignatureIconStyle; label: string }[] = [
    { id: 'mono', label: 'Jednokolorowe' },
    { id: 'color', label: 'Kolorowe koła' },
    { id: 'color-sq', label: 'Kolorowe kwadraty' },
];

/** Palety podpowiedzi - wybór własnego koloru zostaje zawsze pod ręką. */
export const SIGNATURE_SWATCHES = [
    '#c0272d', '#1a1a1a', '#0088b0', '#2107ec', '#0a66c2',
    '#0f9d58', '#e67e22', '#8e44ad', '#edbb00', '#6b6866',
];

export const DEFAULT_SIGNATURE_COLOR = '#c0272d';

// ── Pomocnicze ───────────────────────────────────────────────────────────────

const esc = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const clean = (value: string | null | undefined): string => (value ?? '').trim();

/** Link wpisany jako „www.firma.pl" dostaje https:// - inaczej klient poczty potraktuje go jak ścieżkę względną. */
export const toHref = (value: string | null | undefined): string => {
    const trimmed = clean(value);
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** Adres strony w treści stopki: bez schematu i ukośnika na końcu, tak jak się go mówi. */
const displayUrl = (value: string | null | undefined): string =>
    clean(value).replace(/^https?:\/\//i, '').replace(/\/$/, '');

const telHref = (value: string): string => `tel:${value.replace(/[^\d+]/g, '')}`;

const link = (href: string, text: string, color: string, extra = ''): string =>
    `<a href="${esc(href)}" style="color:${color};text-decoration:none;${extra}">${esc(text)}</a>`;

const block = (html: string, style: string): string => (html ? `<div style="${style}">${html}</div>` : '');

const image = (src: string, width: number, height: number | null, alt: string, style: string): string =>
    `<img src="${esc(src)}" width="${width}"${height ? ` height="${height}"` : ''} alt="${esc(alt)}" ` +
    `style="display:block;border:0;outline:none;${style}">`;

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

/** Zewnętrzna rama każdej stopki - ogranicza szerokość w szerokich oknach poczty. */
const frame = (inner: string, maxWidth = 520): string =>
    `<table ${TABLE} style="border-collapse:collapse;max-width:${maxWidth}px;"><tr><td style="padding:0;">${inner}</td></tr></table>`;

interface PhoneLine { number: string; suffix: string; dial: boolean }

/**
 * Telefony w kolejności: komórka, druga komórka, stacjonarny, fax. Dopisek („kom.",
 * „stacj.", „fax") pojawia się dopiero, gdy numerów jest więcej niż jeden albo jedyny
 * jest faxem - pojedynczy numer komórki bez dopisku czyta się naturalniej.
 */
const phoneLines = (d: SignatureDesign): PhoneLine[] => {
    const raw = [
        { number: clean(d.phone), tag: 'kom.', dial: true },
        { number: clean(d.phone2), tag: 'kom.', dial: true },
        { number: clean(d.phoneLand), tag: 'stacj.', dial: true },
        { number: clean(d.fax), tag: 'fax', dial: false },
    ].filter(line => line.number);
    const tagged = raw.length > 1 || (raw.length === 1 && !raw[0].dial);
    return raw.map(line => ({
        number: line.number,
        dial: line.dial,
        suffix: tagged ? `<span style="color:#999999;font-size:.85em;">&nbsp;${line.tag}</span>` : '',
    }));
};

interface ContactStyle { font: string; accent: string; color: string; size: number; lh: number; labels: boolean }

/** Kontakt jako linie tekstu, opcjonalnie z literą w kolorze motywu (T:, F:, E:, W:). */
const contactLines = (d: SignatureDesign, s: ContactStyle): string => {
    const lineStyle = `font-family:${s.font};font-size:${s.size}px;line-height:${s.lh}px;color:${s.color};`;
    const label = (letter: string) => (s.labels ? `<span style="color:${s.accent};">${letter}:</span> ` : '');
    const lines: string[] = phoneLines(d).map(p =>
        label(p.dial ? 'T' : 'F') + (p.dial ? link(telHref(p.number), p.number, s.color) : esc(p.number)) + p.suffix
    );
    const email = clean(d.email);
    if (email) lines.push(label('E') + link(`mailto:${email}`, email, s.color));
    if (clean(d.website)) lines.push(label('W') + link(toHref(d.website), displayUrl(d.website), s.color));
    return lines.map(line => `<div style="${lineStyle}">${line}</div>`).join('');
};

/** Kontakt z ikonami (telefon, koperta, glob, pinezka) - motyw „Baner z kołem". */
const contactIconLines = (d: SignatureDesign, font: string, iconsBaseUrl: string, color: string): string => {
    const lineStyle = `font-family:${font};font-size:12px;line-height:21px;color:${color};`;
    const icon = (name: string) =>
        `<img src="${esc(`${iconsBaseUrl}/contact/${name}.png`)}" width="14" height="14" alt="" ` +
        'style="display:inline-block;vertical-align:middle;border:0;width:14px;height:14px;margin-right:7px;">';
    const lines: string[] = phoneLines(d).map(p =>
        icon('phone') + (p.dial ? link(telHref(p.number), p.number, color) : esc(p.number)) + p.suffix
    );
    const email = clean(d.email);
    if (email) lines.push(icon('mail') + link(`mailto:${email}`, email, color));
    if (clean(d.website)) lines.push(icon('web') + link(toHref(d.website), displayUrl(d.website), color));
    if (clean(d.address)) lines.push(icon('pin') + esc(clean(d.address)));
    return lines.map(line => `<div style="${lineStyle}">${line}</div>`).join('');
};

const hasSocial = (d: SignatureDesign): boolean => SIGNATURE_SOCIAL_KEYS.some(key => clean(d[key]));

const socialIcons = (d: SignatureDesign, iconsBaseUrl: string, size = 20): string =>
    SIGNATURE_SOCIAL_KEYS
        .filter(key => clean(d[key]))
        .map(key =>
            `<a href="${esc(toHref(d[key]))}" target="_blank" style="text-decoration:none;display:inline-block;margin-right:6px;">` +
            `<img src="${esc(`${iconsBaseUrl}/${d.iconStyle}/${key}.png`)}" width="${size}" height="${size}" ` +
            `alt="${esc(SIGNATURE_SOCIAL_FIELDS[key].label)}" style="display:block;border:0;width:${size}px;height:${size}px;"></a>`
        )
        .join('');

/** Stopka prawna: drobny szary tekst pod kartą, z zachowaniem podziału na linie. */
const disclaimer = (d: SignatureDesign, font: string, maxWidth = 480): string => {
    const text = clean(d.disclaimer);
    if (!text) return '';
    return `<div style="font-family:${font};font-size:10px;line-height:14px;color:#999999;margin-top:12px;max-width:${maxWidth}px;">` +
        `${esc(text).replace(/\r?\n/g, '<br>')}</div>`;
};

// ── Motywy ───────────────────────────────────────────────────────────────────

interface RenderContext { font: string; iconsBaseUrl: string }

export interface SignatureTemplate {
    id: SignatureTemplateId;
    name: string;
    description: string;
    /** Pola danych, które motyw pokazuje - kreator nie pyta o resztę. */
    fields: SignatureTextKey[];
    images: SignatureImageKey[];
    /** Czy motyw rysuje ikony social media. */
    social: boolean;
    render: (d: SignatureDesign, ctx: RenderContext) => string;
}

const CONTACT_FIELDS: SignatureTextKey[] = ['phone', 'phone2', 'phoneLand', 'fax', 'email', 'website'];

const classic: SignatureTemplate = {
    id: 'klasyczna',
    name: 'Klasyczna',
    description: 'Czysta i uniwersalna. Bez zdjęcia, działa wszędzie.',
    fields: ['fullName', 'position', 'company', ...CONTACT_FIELDS, 'address', 'disclaimer'],
    images: [],
    social: true,
    render: (d, { font, iconsBaseUrl }) => {
        const accent = d.color;
        const subtitle = [clean(d.position), clean(d.company)].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ');
        const inner =
            `<div style="font-family:${font};font-size:16px;line-height:22px;font-weight:bold;color:#222222;">${esc(clean(d.fullName))}</div>` +
            block(subtitle, `font-family:${font};font-size:13px;line-height:20px;color:#555555;`) +
            `<div style="height:2px;width:48px;background:${accent};margin:8px 0 10px 0;font-size:0;line-height:0;">&nbsp;</div>` +
            contactLines(d, { font, accent, color: '#333333', size: 13, lh: 20, labels: true }) +
            block(esc(clean(d.address)), `font-family:${font};font-size:12px;line-height:18px;color:#888888;margin-top:4px;`) +
            (hasSocial(d) ? `<div style="margin-top:10px;">${socialIcons(d, iconsBaseUrl)}</div>` : '') +
            disclaimer(d, font);
        return frame(inner);
    },
};

const withPhoto: SignatureTemplate = {
    id: 'ze-zdjeciem',
    name: 'Ze zdjęciem',
    description: 'Okrągłe zdjęcie po lewej, kolorowa linia, dane po prawej.',
    fields: ['fullName', 'position', 'company', ...CONTACT_FIELDS, 'disclaimer'],
    images: ['photoUrl'],
    social: true,
    render: (d, { font, iconsBaseUrl }) => {
        const accent = d.color;
        const photo = clean(d.photoUrl);
        const inner =
            `<table ${TABLE} style="border-collapse:collapse;"><tr>` +
            (photo
                ? `<td valign="top" style="padding:0 16px 0 0;">${image(photo, 92, 92, clean(d.fullName), 'border-radius:50%;width:92px;height:92px;')}</td>`
                : '') +
            `<td valign="top" style="padding:0 0 0 16px;border-left:3px solid ${accent};">` +
            `<div style="font-family:${font};font-size:17px;line-height:22px;font-weight:bold;color:${accent};">${esc(clean(d.fullName))}</div>` +
            block(esc(clean(d.position)), `font-family:${font};font-size:13px;line-height:18px;color:#444444;`) +
            block(esc(clean(d.company)), `font-family:${font};font-size:13px;line-height:18px;color:#444444;font-weight:bold;margin-bottom:6px;`) +
            contactLines(d, { font, accent, color: '#333333', size: 13, lh: 20, labels: false }) +
            (hasSocial(d) ? `<div style="margin-top:8px;">${socialIcons(d, iconsBaseUrl)}</div>` : '') +
            '</td></tr></table>' +
            disclaimer(d, font);
        return frame(inner);
    },
};

const companyLogo: SignatureTemplate = {
    id: 'firmowa',
    name: 'Firmowa z logo',
    description: 'Logo firmy, pasek koloru, pełne dane kontaktowe i adres.',
    fields: ['fullName', 'position', 'company', ...CONTACT_FIELDS, 'address', 'disclaimer'],
    images: ['logoUrl'],
    social: true,
    render: (d, { font, iconsBaseUrl }) => {
        const accent = d.color;
        const logo = clean(d.logoUrl);
        const inner =
            `<table ${TABLE} style="border-collapse:collapse;"><tr>` +
            (logo
                ? `<td valign="middle" style="padding:0 18px 0 0;border-right:1px solid #dddddd;">${image(logo, 120, null, clean(d.company), 'width:120px;height:auto;max-height:70px;')}</td>`
                : '') +
            `<td valign="middle" style="padding:0 0 0 ${logo ? 18 : 0}px;">` +
            `<div style="font-family:${font};font-size:16px;line-height:22px;font-weight:bold;color:#222222;">${esc(clean(d.fullName))}</div>` +
            block(esc(clean(d.position)), `font-family:${font};font-size:13px;line-height:18px;color:#666666;`) +
            block(esc(clean(d.company)), `font-family:${font};font-size:13px;line-height:18px;color:${accent};font-weight:bold;margin-bottom:6px;`) +
            contactLines(d, { font, accent, color: '#333333', size: 13, lh: 20, labels: true }) +
            block(esc(clean(d.address)), `font-family:${font};font-size:12px;line-height:18px;color:#888888;`) +
            '</td></tr></table>' +
            `<table ${TABLE} style="border-collapse:collapse;margin-top:12px;width:100%;"><tr>` +
            `<td bgcolor="${accent}" style="height:3px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr></table>` +
            (hasSocial(d) ? `<div style="margin-top:8px;">${socialIcons(d, iconsBaseUrl)}</div>` : '') +
            disclaimer(d, font);
        return frame(inner, 560);
    },
};

const circleBanner: SignatureTemplate = {
    id: 'baner-okrag',
    name: 'Baner z kołem',
    description: 'Kolorowa kolumna z okrągłym zdjęciem, logo i duże nazwisko po prawej.',
    fields: ['fullName', 'position', 'company', ...CONTACT_FIELDS, 'address', 'disclaimer'],
    images: ['photoUrl', 'logoUrl'],
    social: false,
    render: (d, { font, iconsBaseUrl }) => {
        const accent = d.color;
        const photo = clean(d.photoUrl);
        const logo = clean(d.logoUrl);
        // Bez zdjęcia kolumna koloru zostaje jako wąski pasek - motyw nie traci charakteru.
        const side = photo
            ? `<td valign="middle" align="center" bgcolor="${accent}" style="background:${accent};padding:22px 18px;width:140px;">` +
              image(photo, 110, 110, clean(d.fullName), 'border-radius:50%;width:110px;height:110px;border:4px solid #ffffff;margin:0 auto;') +
              '</td>'
            : `<td bgcolor="${accent}" style="background:${accent};width:26px;font-size:0;line-height:0;">&nbsp;</td>`;
        const brand = logo
            ? `<div style="margin-bottom:8px;">${image(logo, 96, null, clean(d.company), 'width:96px;height:auto;max-height:34px;')}</div>`
            : block(esc(clean(d.company)),
                `font-family:${font};font-size:12px;line-height:17px;font-weight:bold;color:#222222;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;`);
        const inner =
            `<table ${TABLE} bgcolor="#ffffff" style="border-collapse:collapse;background:#ffffff;width:100%;max-width:560px;border:1px solid #ececec;"><tr>` +
            side +
            '<td valign="middle" style="padding:20px 24px;">' +
            brand +
            `<div style="font-family:${font};font-size:22px;line-height:26px;font-weight:bold;color:${accent};">${esc(clean(d.fullName))}</div>` +
            block(esc(clean(d.position)), `font-family:${font};font-size:13px;line-height:19px;font-style:italic;color:${accent};margin:2px 0 10px;`) +
            contactIconLines(d, font, iconsBaseUrl, '#333333') +
            '</td></tr></table>' +
            disclaimer(d, font);
        return frame(inner, 560);
    },
};

const twoBands: SignatureTemplate = {
    id: 'dwa-pasma',
    name: 'Dwa pasma',
    description: 'Jasne pasmo z nazwiskiem i zdjęciem, pod nim ciemne pasmo z kontaktem i logo.',
    fields: ['fullName', 'position', 'company', ...CONTACT_FIELDS, 'address', 'disclaimer'],
    images: ['photoUrl', 'logoUrl'],
    social: false,
    render: (d, { font }) => {
        const accent = d.color;
        const photo = clean(d.photoUrl);
        const logo = clean(d.logoUrl);
        const address = clean(d.address);
        const top =
            `<table ${TABLE} width="100%" style="border-collapse:collapse;width:100%;"><tr>` +
            '<td valign="middle" style="padding:16px 0 16px 24px;">' +
            `<div style="font-family:${font};font-size:21px;line-height:26px;font-weight:bold;color:#1a1a1a;text-transform:uppercase;letter-spacing:.5px;">${esc(clean(d.fullName))}</div>` +
            block(esc(clean(d.position)), `font-family:${font};font-size:12px;line-height:18px;font-weight:bold;color:${accent};margin-top:2px;`) +
            block(esc(clean(d.company)), `font-family:${font};font-size:12px;line-height:18px;color:#555555;`) +
            `<div style="font-family:${font};font-size:15px;line-height:15px;color:${accent};letter-spacing:4px;margin-top:6px;">&bull;&bull;&bull;</div>` +
            '</td>' +
            (photo
                ? `<td valign="middle" align="right" style="padding:16px 24px 16px 0;">${image(photo, 92, 92, clean(d.fullName), `border-radius:50%;width:92px;height:92px;border:3px solid ${accent};`)}</td>`
                : '') +
            '</tr></table>';
        const bottom =
            `<table ${TABLE} width="100%" style="border-collapse:collapse;width:100%;"><tr><td valign="middle">` +
            contactLines(d, { font, accent, color: '#eeeeee', size: 12, lh: 19, labels: false }) +
            block(esc(address), `font-family:${font};font-size:12px;line-height:19px;color:#aaaaaa;`) +
            '</td>' +
            // Logo leży na ciemnym paśmie, a typowe logo to ciemny znak na przezroczystym
            // tle - bez jasnej podkładki znika (ta sama lekcja co logo w menu CRM).
            (logo
                ? '<td valign="middle" align="right" style="padding-left:16px;">' +
                  `<table ${TABLE} style="border-collapse:separate;"><tr>` +
                  '<td bgcolor="#ffffff" style="background:#ffffff;padding:6px 8px;border-radius:4px;">' +
                  image(logo, 90, null, clean(d.company), 'width:90px;height:auto;max-height:40px;') +
                  '</td></tr></table></td>'
                : '') +
            '</tr></table>';
        const inner =
            `<table ${TABLE} style="border-collapse:collapse;width:100%;max-width:560px;border:1px solid #ececec;">` +
            `<tr><td bgcolor="#ffffff" style="padding:0;background:#ffffff;">${top}</td></tr>` +
            `<tr><td bgcolor="#1c1c1e" style="background:#1c1c1e;padding:14px 24px;">${bottom}</td></tr>` +
            '</table>' +
            disclaimer(d, font);
        return frame(inner, 560);
    },
};

export const SIGNATURE_TEMPLATES: SignatureTemplate[] = [classic, withPhoto, companyLogo, circleBanner, twoBands];

export const getSignatureTemplate = (id: string | null | undefined): SignatureTemplate =>
    SIGNATURE_TEMPLATES.find(template => template.id === id) ?? classic;

/**
 * HTML stopki gotowy do zapisu i wysyłki. Pola, których motyw nie pokazuje, nie trafiają
 * do wyniku nawet wtedy, gdy są w projekcie (np. adres przy „Ze zdjęciem") - dzięki temu
 * przełączanie motywów w kreatorze niczego nie kasuje, a stopka pokazuje tylko to,
 * co widać w podglądzie.
 */
export function renderSignature(design: SignatureDesign, iconsBaseUrl: string): string {
    const template = getSignatureTemplate(design.template);
    const font = (SIGNATURE_FONTS.find(f => f.id === design.font) ?? SIGNATURE_FONTS[0]).stack;
    const visible: SignatureDesign = { ...design };
    (Object.keys(SIGNATURE_TEXT_FIELDS) as SignatureTextKey[])
        .filter(key => !template.fields.includes(key))
        .forEach(key => { visible[key] = null; });
    (['photoUrl', 'logoUrl'] as SignatureImageKey[])
        .filter(key => !template.images.includes(key))
        .forEach(key => { visible[key] = null; });
    if (!template.social) SIGNATURE_SOCIAL_KEYS.forEach(key => { visible[key] = null; });

    const html = template.render(visible, { font, iconsBaseUrl: iconsBaseUrl.replace(/\/+$/, '') });
    const scale = SIGNATURE_SIZES.find(s => s.id === design.size)?.scale ?? 1;
    if (scale === 1) return html;
    // Skalujemy tekst, nie układ: szerokości kolumn i obrazków zostają, rośnie tylko pismo.
    return html.replace(/(font-size|line-height):(\d+)px/g, (_, prop: string, px: string) =>
        `${prop}:${Math.round(Number(px) * scale)}px`);
}

/** Nowy projekt: dane z konta i studia, motyw i kolor startowy. */
export function createSignatureDesign(
    defaults: Partial<Record<SignatureTextKey, string | null>>,
    color = DEFAULT_SIGNATURE_COLOR,
    template: SignatureTemplateId = 'klasyczna'
): SignatureDesign {
    return {
        template,
        fullName: defaults.fullName ?? null,
        company: defaults.company ?? null,
        phone: defaults.phone ?? null,
        email: defaults.email ?? null,
        website: defaults.website ?? null,
        address: defaults.address ?? null,
        color,
        font: 'arial',
        size: 'm',
        iconStyle: 'mono',
    };
}

/**
 * Czy da się już zapisać. Imię i nazwisko jest nagłówkiem każdego motywu - bez niego
 * stopka to same dane kontaktowe bez właściciela.
 */
export const isSignatureDesignComplete = (design: SignatureDesign): boolean => Boolean(clean(design.fullName));

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const isHexColor = (value: string): boolean => HEX_COLOR.test(value.trim());
