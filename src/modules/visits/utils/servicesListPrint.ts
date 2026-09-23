/**
 * „Drukuj wykaz" — wykaz usług wizyty do wydruku (A4), w tym samym systemie
 * wizualnym co systemowe protokoły przyjęcia i wydania pojazdu
 * (backend: templates/protokol_przyjecia_pojazdu.html): granatowe belki,
 * szare pola, slot logo 200 x 56 pt w lewym górnym rogu, wymiary w pt.
 *
 * Wykaz celowo NIE zawiera cen - to kartka dla warsztatu i klienta z zakresem
 * prac, nie dokument rozliczeniowy. Dlatego builder w ogóle nie dostaje kwot.
 *
 * W odróżnieniu od protokołów (jedna sztywna strona) wykaz ma zmienną długość,
 * więc treść płynie przez kolejne strony A4 zamiast być ucinana.
 */

import interLatinUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import interLatinExtUrl from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url';
import type { ServiceLineItem, Visit } from '../types';

export interface ServicesListPrintData {
    visitNumber: string;
    /** Data przyjęcia pojazdu (początek wizyty). */
    receivedAt: string | null;
    /** Faktyczne wydanie pojazdu; gdy go jeszcze nie było - planowane zakończenie. */
    releasedAt: string | null;
    releaseIsPlanned: boolean;
    brand: string;
    model: string;
    licensePlate: string;
    company: {
        name: string | null;
        street: string | null;
        postalCode: string | null;
        city: string | null;
        logoUrl: string | null;
    } | null;
    services: ServiceLineItem[];
}

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Komentarz wieloliniowy: zachowujemy łamanie wierszy wpisane przez pracownika. */
const multiline = (value: string): string => escapeHtml(value).replace(/\r?\n/g, '<br>');

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

const pendingLabel = (service: ServiceLineItem): string | null => {
    const isPending = service.hasPendingChange ?? service.status === 'PENDING';
    if (!isPending) return null;
    if (service.pendingOperation === 'DELETE') return 'oczekuje na usunięcie';
    if (service.pendingOperation === 'ADD') return 'oczekuje na akceptację klienta';
    return null;
};

/** Pozycje odrzucone przez klienta nie należą do zakresu prac. */
export const printableServices = (services: ServiceLineItem[]): ServiceLineItem[] =>
    services.filter(s => s.status !== 'REJECTED');

const renderService = (service: ServiceLineItem): string => {
    const items = service.isPackage && service.packageItems
        ? [...service.packageItems].sort((a, b) => a.position - b.position)
        : [];
    const pending = pendingLabel(service);
    const note = service.note?.trim();

    return `
    <li class="service">
      <div class="service-name">
        <span>${escapeHtml(service.serviceName)}</span>
        ${service.isPackage ? '<span class="badge">PAKIET</span>' : ''}
        ${pending ? `<span class="pending">(${escapeHtml(pending)})</span>` : ''}
      </div>
      ${items.length > 0 ? `
      <div class="package-caption">W skład pakietu wchodzi:</div>
      <ul class="package-items">
        ${items.map(item => `<li>${escapeHtml(item.serviceName)}</li>`).join('')}
      </ul>` : ''}
      ${note ? `
      <div class="note"><span class="note-label">Komentarz:</span> ${multiline(note)}</div>` : ''}
    </li>`;
};

export const buildServicesListHtml = (data: ServicesListPrintData, fontUrls?: { latin: string; latinExt: string }): string => {
    const services = printableServices(data.services);
    const company = data.company;
    const providerLines = company
        ? [company.name, company.street, [company.postalCode, company.city].filter(Boolean).join(' ')]
            .map(v => v?.trim())
            .filter((v): v is string => !!v)
        : [];
    const logo = company?.logoUrl
        ? `<img src="${escapeHtml(company.logoUrl)}" alt="">`
        : '';
    const fontFaces = fontUrls ? `
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    src: url('${fontUrls.latin}') format('woff2-variations');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  }
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    src: url('${fontUrls.latinExt}') format('woff2-variations');
    unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
  }` : '';

    return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Wykaz usług ${escapeHtml(data.visitNumber)}</title>
<style>${fontFaces}
  :root {
    --navy:  #111729; /* granatowe belki nagłówków */
    --gray:  #EDEEEE; /* szare pola formularza */
    --ink:   #080606; /* kolor tekstu */
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body {
    font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
    color: var(--ink);
    background: #fff;
  }

  /* Protokoły mają margines 0 i jedną sztywną stronę; wykaz płynie przez
     kolejne strony, więc górny/dolny margines daje oddech stronom 2+. */
  @page { size: A4; margin: 12pt 0 24pt 0; }

  .page {
    position: relative;
    width: 595.44pt;
    padding: 0 29.76pt 0 30.24pt;
    background: #fff;
  }

  .tab {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 13.92pt;
    background: var(--navy);
    color: #fff;
    font-size: 9pt;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .box {
    background: var(--gray);
    font-family: 'Liberation Sans', Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #000;
  }

  /* ============ Nagłówek: logo + USŁUGODAWCA (jak w protokołach) ============ */
  .header { position: relative; height: 56.65pt; }
  .company-logo {
    position: absolute;
    left: -0.94pt;
    top: 2.42pt;
    width: 200pt;
    height: 56pt;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }
  .company-logo img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: left center;
  }
  .header .provider {
    position: absolute;
    right: 0;
    top: 10.32pt;
    width: 160pt;
  }
  .header .provider .box {
    margin-top: 2.28pt;
    min-height: 30.13pt;
    padding: 3pt 4pt;
    font-size: 7pt;
    line-height: 1.2832;
  }

  /* ============ Tytuł dokumentu ============ */
  .title-row {
    display: flex;
    align-items: center;
    margin: 9.39pt 0 0 -30.24pt;
    height: 18.15pt;
  }
  .title-row .accent {
    width: 30.48pt;
    height: 13.92pt;
    background: var(--navy);
  }
  .title-row h1 {
    margin-left: 5.52pt;
    font-size: 15pt;
    font-weight: 600;
    color: var(--navy);
    line-height: 1;
    white-space: nowrap;
  }

  /* ============ Nr wizyty / daty ============ */
  .meta-row {
    display: flex;
    justify-content: space-between;
    margin-top: 23.57pt;
  }
  .meta-col .box {
    display: flex;
    align-items: center;
    margin-top: 2.55pt;
    height: 18.42pt;
    padding: 0 4pt;
    white-space: nowrap;
  }
  .meta-col.c1 { width: 128.16pt; }
  .meta-col.c2 { width: 183.12pt; }
  .meta-col.c3 { width: 189.60pt; }

  /* ============ POJAZD ============ */
  .vehicle { margin-top: 15.85pt; }
  .vehicle .tab { width: 48.72pt; }
  .vehicle-fields {
    display: flex;
    justify-content: space-between;
    margin-top: 4.71pt;
  }
  .field-row { display: flex; align-items: center; }
  .field-row label {
    font-size: 8pt;
    line-height: 1.21;
    white-space: nowrap;
    margin-right: 6.87pt;
  }
  .field-row .box {
    display: flex;
    align-items: center;
    height: 18.42pt;
    padding: 0 4pt;
    white-space: nowrap;
    overflow: hidden;
  }
  .field-row.brand .box { width: 150pt; }
  .field-row.model .box { width: 150pt; }
  .field-row.plate .box { width: 90pt; }

  /* ============ ZAKRES USŁUG ============ */
  .scope { margin-top: 15.85pt; }
  .scope .tab { width: 83.76pt; }

  ol.services {
    margin-top: 6pt;
    list-style: none;
    counter-reset: service;
  }
  ol.services > li.service {
    position: relative;
    counter-increment: service;
    padding: 5pt 6pt 5pt 24pt;
    border-bottom: 0.75pt solid var(--gray);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  ol.services > li.service::before {
    content: counter(service) ".";
    position: absolute;
    left: 6pt;
    top: 5pt;
    font-size: 9pt;
    font-weight: 600;
    color: var(--navy);
    line-height: 1.3;
  }
  .service-name {
    font-size: 9pt;
    font-weight: 600;
    line-height: 1.3;
  }
  .badge {
    display: inline-block;
    margin-left: 5pt;
    padding: 1pt 4pt;
    background: var(--navy);
    color: #fff;
    font-size: 6.5pt;
    font-weight: 500;
    letter-spacing: 0.4pt;
    vertical-align: 1pt;
  }
  .pending {
    margin-left: 4pt;
    font-size: 7.5pt;
    font-weight: 400;
    font-style: italic;
  }
  .package-caption {
    margin-top: 3pt;
    font-size: 7.5pt;
    line-height: 1.21;
  }
  ul.package-items {
    margin-top: 2pt;
    list-style: none;
    font-size: 8pt;
    line-height: 1.35;
  }
  ul.package-items li {
    position: relative;
    padding-left: 12pt;
  }
  ul.package-items li::before {
    content: "";
    position: absolute;
    left: 3pt;
    top: 0.52em;
    width: 3pt;
    height: 3pt;
    background: var(--navy);
  }
  .note {
    margin-top: 4pt;
    padding: 3pt 4pt;
    background: var(--gray);
    font-family: 'Liberation Sans', Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    line-height: 1.2832;
  }
  .note-label { font-weight: 700; }
  .empty {
    margin-top: 6pt;
    padding: 6pt;
    background: var(--gray);
    font-size: 8pt;
  }

  .footer {
    margin-top: 12pt;
    font-size: 7pt;
    color: #555;
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="company-logo">${logo}</div>
    ${providerLines.length > 0 ? `
    <div class="provider">
      <div class="tab">USŁUGODAWCA</div>
      <div class="box">${providerLines.map(escapeHtml).join('<br>')}</div>
    </div>` : ''}
  </div>

  <div class="title-row">
    <div class="accent"></div>
    <h1>WYKAZ USŁUG</h1>
  </div>

  <div class="meta-row">
    <div class="meta-col c1">
      <div class="tab">NR WIZYTY</div>
      <div class="box">${escapeHtml(data.visitNumber || '—')}</div>
    </div>
    <div class="meta-col c2">
      <div class="tab">DATA PRZYJĘCIA POJAZDU</div>
      <div class="box">${escapeHtml(formatDateTime(data.receivedAt))}</div>
    </div>
    <div class="meta-col c3">
      <div class="tab">${data.releaseIsPlanned ? 'PLANOWANA DATA WYDANIA POJAZDU' : 'DATA WYDANIA POJAZDU'}</div>
      <div class="box">${escapeHtml(formatDateTime(data.releasedAt))}</div>
    </div>
  </div>

  <div class="vehicle">
    <div class="tab">POJAZD</div>
    <div class="vehicle-fields">
      <div class="field-row brand"><label>Marka</label><div class="box">${escapeHtml(data.brand || '—')}</div></div>
      <div class="field-row model"><label>Model</label><div class="box">${escapeHtml(data.model || '—')}</div></div>
      <div class="field-row plate"><label>Nr rej.</label><div class="box">${escapeHtml(data.licensePlate || '—')}</div></div>
    </div>
  </div>

  <div class="scope">
    <div class="tab">ZAKRES USŁUG</div>
    ${services.length > 0
        ? `<ol class="services">${services.map(renderService).join('')}</ol>`
        : '<div class="empty">Brak usług w wizycie.</div>'}
  </div>

  <div class="footer">Wydrukowano ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>

</div>
</body>
</html>`;
};

/** Dane studia do nagłówka wydruku (ustawienia firmy; logo tylko gdy wgrane). */
export const companyForPrint = (company: {
    name: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    logoUrl: string | null;
} | null | undefined): ServicesListPrintData['company'] =>
    company
        ? {
            name: company.name,
            street: company.street,
            postalCode: company.postalCode,
            city: company.city,
            logoUrl: company.logoUrl?.trim() || null,
        }
        : null;

export const servicesListPrintData = (
    visit: Pick<Visit, 'visitNumber' | 'scheduledDate' | 'estimatedCompletionDate' | 'pickupDate' | 'vehicle'>,
    services: ServiceLineItem[],
    company: ServicesListPrintData['company'],
): ServicesListPrintData => ({
    visitNumber: visit.visitNumber,
    receivedAt: visit.scheduledDate ?? null,
    releasedAt: visit.pickupDate ?? visit.estimatedCompletionDate ?? null,
    releaseIsPlanned: !visit.pickupDate,
    brand: visit.vehicle?.brand ?? '',
    model: visit.vehicle?.model ?? '',
    licensePlate: visit.vehicle?.licensePlate ?? '',
    company,
    services,
});

/**
 * Drukuje dokument w ukrytym iframe - bez nowej karty i bez blokady wyskakujących
 * okien. Czeka na fonty i logo, bo `print()` wywołane wcześniej drukuje pustą
 * ramkę na logo i font zastępczy.
 */
export const printServicesList = (data: ServicesListPrintData): void => {
    const fontUrls = {
        latin: new URL(interLatinUrl, window.location.href).href,
        latinExt: new URL(interLatinExtUrl, window.location.href).href,
    };
    const html = buildServicesListHtml(data, fontUrls);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const cleanup = () => {
        window.setTimeout(() => iframe.remove(), 1000);
    };

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
        iframe.remove();
        return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    const images = Array.from(doc.images).map(img =>
        img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.addEventListener('load', () => resolve(), { once: true });
                // Wygasły podpisany link S3: drukujemy bez logo, zamiast pustej ramki.
                img.addEventListener('error', () => { img.remove(); resolve(); }, { once: true });
            }),
    );
    const fonts = doc.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise<void>(resolve => window.setTimeout(resolve, 4000));

    void Promise.race([Promise.all([fonts, ...images]), timeout]).then(() => {
        win.addEventListener('afterprint', cleanup, { once: true });
        win.focus();
        win.print();
        // Safari na iOS nie zawsze wysyła afterprint.
        window.setTimeout(cleanup, 60_000);
    });
};
