// src/widgets/Sidebar/companyHeaderCache.ts
//
// Podpis pod logo w nagłówku menu (nazwa studia) czeka na `GET /v1/company`, więc po
// każdym odświeżeniu strony dochodziłby z opóźnieniem i nagłówek skakałby o linię.
// Nazwa praktycznie się nie zmienia - trzymamy ją więc lokalnie i rysujemy nagłówek
// od pierwszej klatki.
//
// Zapis jest per studio: na jednym urządzeniu pracuje kilka kont (przełącznik PIN),
// a nagłówek nie może pokazać cudzej firmy.

const STORAGE_KEY = 'crm.sidebar.company-header';

/** Odpowiedź serwera i tak nadpisuje zapis przy każdym wejściu; limit chroni przed porzuconym. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface CompanyHeaderSnapshot {
    name: string | null;
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
    if (Date.now() - stored.savedAt > MAX_AGE_MS) return null;
    return { name: stored.name };
}

export function writeCompanyHeader(studioId: string | undefined, snapshot: CompanyHeaderSnapshot): void {
    if (!studioId) return;
    try {
        const payload: StoredSnapshot = { ...snapshot, studioId, savedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Brak miejsca albo zablokowany storage - podpis po prostu dojdzie z opóźnieniem.
    }
}
