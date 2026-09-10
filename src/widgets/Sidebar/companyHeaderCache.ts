// src/widgets/Sidebar/companyHeaderCache.ts
//
// Nagłówek menu (nazwa + logo studia) czeka na `GET /v1/company`, więc po każdym
// odświeżeniu strony przez ułamek sekundy widać inicjały, a dopiero potem logo.
// Ten „przeskok" widać przy każdym wejściu do aplikacji, choć dane praktycznie się
// nie zmieniają - trzymamy je więc lokalnie i rysujemy nagłówek od pierwszej klatki.
//
// Zapis jest per studio: na jednym urządzeniu pracuje kilka kont (przełącznik PIN),
// a nagłówek nie może pokazać cudzej firmy.

const STORAGE_KEY = 'crm.sidebar.company-header';

/**
 * Adres logo jest stały (hash treści w ścieżce, CompanyLogoService.appLogoUrl), więc
 * zapis może żyć długo: po podmianie logo przychodzi nowy adres z `GET /company`, a
 * stary po prostu przestaje odpowiadać i nagłówek wraca do inicjałów. Limit zostaje
 * dla logo sprzed wariantów, które nadal ma podpisany link S3 ważny 24 h.
 */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SIGNED_LINK_MAX_AGE_MS = 20 * 60 * 60 * 1000;

/** Podpisany link S3 poznać po parametrach podpisu w adresie. */
const isSignedLink = (url: string | null) => !!url && url.includes('X-Amz-Signature=');

export interface CompanyHeaderSnapshot {
    name: string | null;
    logoUrl: string | null;
    /** Brak w zapisie sprzed tej wersji = zachowanie dawne (podkładka, układ z inicjałem). */
    logoNeedsLightPlate?: boolean;
    logoAspectRatio?: number | null;
}

interface StoredSnapshot extends CompanyHeaderSnapshot {
    studioId: string;
    savedAt: number;
}

/** Pamięć przeglądarki bywa wyłączona (tryb prywatny, polityka firmowa) - nigdy nie rzucamy. */
function readRaw(): StoredSnapshot | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredSnapshot) : null;
    } catch {
        return null;
    }
}

export function readCompanyHeader(studioId: string | undefined): CompanyHeaderSnapshot | null {
    if (!studioId) return null;
    const stored = readRaw();
    if (!stored || stored.studioId !== studioId) return null;
    const age = Date.now() - stored.savedAt;
    if (age > MAX_AGE_MS || (isSignedLink(stored.logoUrl) && age > SIGNED_LINK_MAX_AGE_MS)) {
        return { name: stored.name, logoUrl: null };
    }
    return {
        name: stored.name,
        logoUrl: stored.logoUrl,
        logoNeedsLightPlate: stored.logoNeedsLightPlate,
        logoAspectRatio: stored.logoAspectRatio,
    };
}

export function writeCompanyHeader(studioId: string | undefined, snapshot: CompanyHeaderSnapshot): void {
    if (!studioId) return;
    try {
        const payload: StoredSnapshot = { ...snapshot, studioId, savedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Brak miejsca albo zablokowany storage - nagłówek po prostu mignie, jak wcześniej.
    }
}
