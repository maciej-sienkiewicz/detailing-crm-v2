/**
 * „3,4× normy" - ile razy lepiej niż typowy post tego samego profilu. Okolice jedynki
 * to „w normie": różnica 1,02× nie jest informacją, a wygląda jak wynik.
 */
export const normLabel = (relativeToNorm: number | null | undefined): string | null => {
    if (relativeToNorm === null || relativeToNorm === undefined || !Number.isFinite(relativeToNorm)) return null;
    if (relativeToNorm >= 0.95 && relativeToNorm < 1.05) return 'w normie';
    const value = relativeToNorm.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${value}× normy`;
};

/**
 * Adres oficjalnego osadzenia posta (ta sama strona, której używa „Osadź" na Instagramie).
 * Null bez kodu posta - wtedy karta pokazuje ikonę formatu zamiast pustej ramki.
 */
export const embedUrl = (postCode: string | null | undefined): string | null => {
    const code = postCode?.trim();
    if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    return `https://www.instagram.com/p/${code}/embed/`;
};
