import { generateEntryCode, previewWindowUrl } from './entryCode';
import { rolePreviewApi } from './rolePreviewApi';
import { sendStartFailed } from './startFailure';

export interface RolePreviewInput {
    roleName: string;
    permissions: string[];
    trackWorkTime: boolean;
}

interface OpenDeps {
    open: (url: string) => Window | null;
    start: typeof rolePreviewApi.start;
    newCode: () => string;
}

const defaultDeps: OpenDeps = {
    open: url => window.open(url, '_blank'),
    start: rolePreviewApi.start,
    newCode: () => generateEntryCode(),
};

/**
 * Otwiera podgląd roli w nowym oknie.
 *
 * Okno otwiera się w tej samej chwili, w której użytkownik kliknął - przed odpowiedzią
 * serwera - bo przeglądarki blokują okna otwierane później. Okno czeka, aż piaskownica
 * będzie gotowa, i wchodzi do niej kodem, z którym je otwarto. Gdy serwer odmówi, okno
 * jest zamykane, a błąd wraca do wołającego.
 *
 * Musi być wołane bezpośrednio z obsługi kliknięcia, bez `await` przed nim.
 */
export function openRolePreview(previewBaseUrl: string, input: RolePreviewInput, deps: OpenDeps = defaultDeps): Promise<void> {
    const entryCode = deps.newCode();
    const previewWindow = deps.open(previewWindowUrl(previewBaseUrl, entryCode));
    if (!previewWindow) {
        return Promise.reject(new PreviewWindowBlockedError());
    }
    return deps.start({ ...input, entryCode }).catch(error => {
        // Okno podglądu mogło się już odciąć od tego okna - wtedy samo close() nic nie da,
        // a okno czekałoby na piaskownicę, która nie powstanie. Wiadomość zamyka je od środka.
        sendStartFailed(previewWindow, previewBaseUrl, serverMessageOf(error));
        previewWindow.close();
        throw error;
    });
}

const serverMessageOf = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';

export class PreviewWindowBlockedError extends Error {
    constructor() {
        super('Przeglądarka zablokowała nowe okno. Zezwól tej stronie na wyskakujące okna i spróbuj ponownie.');
        this.name = 'PreviewWindowBlockedError';
    }
}
