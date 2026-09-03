// src/widgets/Sidebar/companyHeaderCache.ts
//
// Nagłówek menu (nazwa + logo studia) czeka na `GET /v1/company`, więc po każdym
// odświeżeniu strony przez ułamek sekundy widać inicjały, a dopiero potem logo.
// Ten „przeskok" widać przy każdym wejściu do aplikacji, choć dane praktycznie się
// nie zmieniają — trzymamy je więc lokalnie i rysujemy nagłówek od pierwszej klatki.
//
// Zapis jest per studio: na jednym urządzeniu pracuje kilka kont (przełącznik PIN),
// a nagłówek nie może pokazać cudzej firmy.

const STORAGE_KEY = 'crm.sidebar.company-header';

/**
 * Adres logo to podpisany link do S3 ważny 24 h (CompanyController.LOGO_URL_TTL).
 * Starszego zapisu nie używamy: pokazałby obrazek, który i tak nie wczyta się
 * z S3, czyli zamienił jeden przeskok na drugi. Margines bezpieczeństwa bierze się
 * z tego, że link podpisano chwilę PRZED tym, jak go zapisaliśmy.
 */
const MAX_AGE_MS = 20 * 60 * 60 * 1000;

export interface CompanyHeaderSnapshot {
    name: string | null;
    logoUrl: string | null;
}

interface StoredSnapshot extends CompanyHeaderSnapshot {
    studioId: string;
    savedAt: number;
}

/** Pamięć przeglądarki bywa wyłączona (tryb prywatny, polityka firmowa) — nigdy nie rzucamy. */
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
    if (Date.now() - stored.savedAt > MAX_AGE_MS) {
        return { name: stored.name, logoUrl: null };
    }
    return { name: stored.name, logoUrl: stored.logoUrl };
}

export function writeCompanyHeader(studioId: string | undefined, snapshot: CompanyHeaderSnapshot): void {
    if (!studioId) return;
    try {
        const payload: StoredSnapshot = { ...snapshot, studioId, savedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Brak miejsca albo zablokowany storage — nagłówek po prostu mignie, jak wcześniej.
    }
}
