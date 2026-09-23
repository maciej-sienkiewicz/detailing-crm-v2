/**
 * Jednorazowy kod wejścia do podglądu roli: 32 losowe bajty w base64url bez dopełnienia,
 * czyli dokładnie 43 znaki. Generuje go przeglądarka administratora, bo okno podglądu musi
 * się otworzyć SYNCHRONICZNIE w obsłudze kliknięcia (inaczej zablokuje je przeglądarka),
 * czyli zanim backend cokolwiek odpowie. Kod jedzie w części adresu po `#`, która nie
 * trafia do serwera ani do nagłówka Referer, i okno podglądu usuwa go z paska adresu,
 * zanim zrobi cokolwiek innego.
 */
export function generateEntryCode(random: (bytes: Uint8Array) => Uint8Array = b => crypto.getRandomValues(b)): string {
    const bytes = random(new Uint8Array(32));
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const ENTRY_CODE = /^[A-Za-z0-9_-]{43}$/;

/** Kod z części adresu po `#` (`#k=...`); null, gdy go nie ma albo ma zły format. */
export function readEntryCodeFromHash(hash: string): string | null {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const code = params.get('k');
    return code && ENTRY_CODE.test(code) ? code : null;
}

/** Ścieżka okna podglądu na adresie podglądu. */
export const ROLE_PREVIEW_SHELL_PATH = '/podglad';

export function previewWindowUrl(previewBaseUrl: string, entryCode: string): string {
    return `${previewBaseUrl.replace(/\/+$/, '')}${ROLE_PREVIEW_SHELL_PATH}#k=${entryCode}`;
}

/** Czy ta strona to okno podglądu (a nie aplikacja w jego ramce). */
export function isRolePreviewShellPath(pathname: string): boolean {
    return pathname === ROLE_PREVIEW_SHELL_PATH || pathname === `${ROLE_PREVIEW_SHELL_PATH}/`;
}
