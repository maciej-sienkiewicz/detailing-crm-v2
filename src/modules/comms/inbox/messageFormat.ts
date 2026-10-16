// src/modules/comms/inbox/messageFormat.ts
// Drobiazgi rozmowy w skrzynce „Zapytania": podpis chwili wiadomości i otwieranie
// załączników przez API (sesja), a nie przez `<a href>`.
import { dayLabel } from '../utils/mailListRows';

/** „5 października", a dla dziś i wczoraj z godziną: „Dziś, 9:40". */
export function messageMoment(iso: string): string {
    const day = dayLabel(iso);
    if (day !== 'Dziś' && day !== 'Wczoraj') return day;
    const time = new Date(iso).toLocaleTimeString('pl-PL', { hour: 'numeric', minute: '2-digit' });
    return `${day}, ${time}`;
}

/** Pobranie załącznika przez API (sesja), a nie przez `<a href>`. */
export async function downloadAttachmentFile(
    load: (id: string) => Promise<Blob>,
    attachmentId: string,
    fileName: string
): Promise<void> {
    saveBlobAs(await load(attachmentId), fileName);
}

/** Zapis już pobranego bloba - podgląd ma plik w ręku i nie pyta serwera drugi raz. */
export function saveBlobAs(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * Typy, które wolno pokazać w podglądzie w CRM-ie. Wyłącznie zamknięta lista: PDF,
 * obrazy RASTROWE i zwykły tekst. Nie „image/*" - SVG to dokument ze skryptami;
 * kiedy podgląd otwierał się w karcie z adresem blob:, ta dziedziczyła pochodzenie
 * CRM-a i SVG z cudzej poczty uruchamiał kod nadawcy w sesji osoby, która kliknęła
 * „Otwórz podgląd". Okno w CRM-ie nie zmienia tej zasady: wszystko spoza listy się
 * pobiera.
 *
 * Każdy rodzaj ma bezpieczną drogę na ekran: PDF rysuje pdf.js na kanwie, obraz
 * idzie przez `<img>` (który skryptów nie wykonuje), tekst jest wstawiany jako
 * tekst, a nie HTML.
 */
const PREVIEW_KINDS: Record<string, AttachmentPreviewKind> = {
    'application/pdf': 'pdf',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'image/avif': 'image',
    'image/bmp': 'image',
    'text/plain': 'text',
    'text/csv': 'text',
};

export type AttachmentPreviewKind = 'pdf' | 'image' | 'text';

/** To, co podgląd musi wiedzieć o pliku - wspólne dla załącznika wiadomości i osi sprawy. */
export interface PreviewableFile {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
}

export const baseType = (contentType: string): string => contentType.split(';')[0].trim().toLowerCase();

/**
 * Typ z rozszerzenia - wyłącznie dla plików, które nadawca wysłał jako „jakieś bajty"
 * (`application/octet-stream`; tak przychodzi spora część faktur PDF ze starszych
 * programów). Rozszerzenie nie przesądza o treści, ale tu nie musi: każda z dróg
 * wyświetlenia wyżej jest bezpieczna dla dowolnych bajtów, najwyżej pokaże błąd.
 * Typ podany wprost (np. `image/svg+xml`) zawsze wygrywa z nazwą pliku.
 */
const EXTENSION_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
};

const GENERIC_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

/** Sprawdzony typ pliku z listy wyżej albo `null`, gdy pliku nie pokazujemy. */
export function previewContentType(file: Pick<PreviewableFile, 'contentType' | 'fileName'>): string | null {
    const declared = baseType(file.contentType);
    if (PREVIEW_KINDS[declared]) return declared;
    if (!GENERIC_TYPES.has(declared)) return null;
    const extension = file.fileName.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_TYPES[extension] ?? null;
}

/** Jak pokazać plik w CRM-ie; `null` - nie pokazujemy, tylko pobieramy. */
export function attachmentPreviewKind(file: Pick<PreviewableFile, 'contentType' | 'fileName'>): AttachmentPreviewKind | null {
    const type = previewContentType(file);
    return type ? PREVIEW_KINDS[type] : null;
}

/** PDF, obrazek rastrowy i tekst da się obejrzeć w CRM-ie - reszta się pobiera. */
export function isPreviewableAttachment(file: Pick<PreviewableFile, 'contentType' | 'fileName'>): boolean {
    return attachmentPreviewKind(file) !== null;
}

/** „12 KB", „3,4 MB" - rozmiar przy nazwie pliku. */
export function fileSizeLabel(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`;
}
