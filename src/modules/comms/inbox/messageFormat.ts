// src/modules/comms/inbox/messageFormat.ts
// Drobiazgi rozmowy w skrzynce „Zapytania": podpis chwili wiadomości i otwieranie
// załączników przez API (sesja), a nie przez `<a href>`.
import type { CommAttachment } from '../types';
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
    const blob = await load(attachmentId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * Typy, które wolno pokazać w nowej karcie. Wyłącznie zamknięta lista: PDF i obrazy
 * RASTROWE. Nie „image/*" - SVG to dokument ze skryptami, a karta z adresem blob:
 * dziedziczy pochodzenie CRM-a, więc SVG z cudzej poczty uruchamiał kod nadawcy w sesji
 * osoby, która kliknęła „Otwórz podgląd". Wszystko spoza listy się pobiera.
 */
const PREVIEWABLE_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
]);

const baseType = (contentType: string): string => contentType.split(';')[0].trim().toLowerCase();

/** PDF i obrazek rastrowy da się obejrzeć w przeglądarce - reszta się pobiera. */
export function isPreviewableAttachment(attachment: CommAttachment): boolean {
    return PREVIEWABLE_TYPES.has(baseType(attachment.contentType));
}

/**
 * Podgląd załącznika w nowej karcie. Karta otwiera się od razu (w geście kliknięcia),
 * a adres dostaje po pobraniu - inaczej blokada wyskakujących okien ją zatrzyma.
 *
 * Typ bloba ustawiamy sami z listy wyżej, nie bierzemy go z odpowiedzi ani z nazwy
 * pliku: o tym, jak przeglądarka zinterpretuje bajty, decyduje sprawdzony typ.
 */
export async function previewAttachmentFile(load: (id: string) => Promise<Blob>, attachment: CommAttachment): Promise<void> {
    if (!isPreviewableAttachment(attachment)) {
        await downloadAttachmentFile(load, attachment.id, attachment.fileName);
        return;
    }
    const tab = window.open('', '_blank');
    // Karta podglądu nie dostaje uchwytu do okna CRM-a.
    if (tab) tab.opener = null;
    try {
        const blob = await load(attachment.id);
        const typed = new Blob([blob], { type: baseType(attachment.contentType) });
        const url = URL.createObjectURL(typed);
        if (tab) tab.location.href = url;
        else window.open(url, '_blank');
        // Karta trzyma własną kopię - adres można zwolnić po chwili.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
        tab?.close();
        throw error;
    }
}
