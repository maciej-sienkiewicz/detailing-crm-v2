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
 * Podgląd załącznika w nowej karcie. Karta otwiera się od razu (w geście kliknięcia),
 * a adres dostaje po pobraniu - inaczej blokada wyskakujących okien ją zatrzyma.
 */
export async function previewAttachmentFile(load: (id: string) => Promise<Blob>, attachment: CommAttachment): Promise<void> {
    const tab = window.open('', '_blank');
    try {
        const blob = await load(attachment.id);
        const typed = blob.type ? blob : new Blob([blob], { type: attachment.contentType });
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
