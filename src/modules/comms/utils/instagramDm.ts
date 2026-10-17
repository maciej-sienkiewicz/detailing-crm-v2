// src/modules/comms/utils/instagramDm.ts
// Rozmowa z Instagrama w sprawie: do kiedy wolno odpisać z CRM i dokąd odesłać,
// gdy już nie wolno.
//
// Meta przyjmuje odpowiedź z API tylko w 24 godziny od ostatniej wiadomości klienta.
// Godzina graniczna jest więc faktem, który trzeba pokazać PRZED pisaniem - wiadomość
// napisana minutę po terminie nie wyjdzie, a pisała ją osoba, która nie wiedziała,
// że się spieszy.
import type { InstagramDmAttachment, LeadTimelineEntry } from '../types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const clock = (date: Date): string =>
    date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * „Z CRM odpiszesz do 14:05", „do jutra, 9:12", a w ostatniej godzinie „jeszcze przez
 * 25 min" - wtedy liczy się ile, a nie do której. Null, gdy okno jest zamknięte.
 */
export function replyDeadlineLabel(deadlineIso: string | null, now: Date = new Date()): string | null {
    if (!deadlineIso) return null;
    const deadline = new Date(deadlineIso);
    const left = deadline.getTime() - now.getTime();
    if (!Number.isFinite(left) || left <= 0) return null;
    if (left < HOUR) return `Z CRM odpiszesz jeszcze przez ${Math.max(1, Math.floor(left / MINUTE))} min`;
    if (sameDay(deadline, now)) return `Z CRM odpiszesz do ${clock(deadline)}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (sameDay(deadline, tomorrow)) return `Z CRM odpiszesz do jutra, ${clock(deadline)}`;
    return `Z CRM odpiszesz do ${deadline.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}, ${clock(deadline)}`;
}

/**
 * Adres rozmowy w aplikacji Instagram. `ig.me/m/<login>` otwiera wiadomości z tą osobą
 * (na telefonie od razu w aplikacji); sam profil każe jej dopiero szukać. Bez loginu
 * zostaje profil od serwera - albo nic.
 */
export function instagramChatUrl(username: string | null, profileUrl: string | null): string | null {
    const login = username?.trim().replace(/^@/, '');
    if (login) return `https://ig.me/m/${encodeURIComponent(login)}`;
    return profileUrl;
}

/** Wpis osi czasu leada, który jest wiadomością z Instagrama (serwer nadaje mu prefiks). */
export const isInstagramEntry = (entry: Pick<LeadTimelineEntry, 'id'>): boolean =>
    entry.id.startsWith('instagram-');

/**
 * Wiadomość bez tekstu po ludzku - ten sam słownik co serwer (DmRules.describe), bo
 * dymek i podgląd na liście mają mówić o tym samym tymi samymi słowami.
 */
export function describeAttachments(attachments: InstagramDmAttachment[]): string {
    const kinds = attachments.map((item) => item.type);
    if (kinds.length === 0) return 'Wiadomość bez treści';
    if (kinds.every((kind) => kind === 'image')) return kinds.length === 1 ? 'Zdjęcie' : `Zdjęcia (${kinds.length})`;
    if (kinds.some((kind) => kind === 'video' || kind === 'ig_reel' || kind === 'reel')) return 'Nagranie';
    if (kinds.includes('audio')) return 'Wiadomość głosowa';
    if (kinds.some((kind) => kind === 'share' || kind === 'ig_post')) return 'Udostępniony post';
    if (kinds.includes('story_mention')) return 'Wzmianka w relacji';
    return 'Załącznik';
}

/** Limit Meta na jedną wiadomość tekstową - ten sam, który pilnuje serwer. */
export const INSTAGRAM_REPLY_MAX = 1000;
