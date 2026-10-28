// src/modules/comms/utils/placeholderAnswers.ts
//
// Co pracownik wpisał w miejsce znaczników szkicu - żeby studio to zapamiętało.
//
// Szkic nie może wymyślać, jak studio pracuje, więc wstawia znacznik, np.
// [jak dbamy o powłokę ceramiczną przy myciu]. Dawniej odpowiedź wpisana raz ginęła razem
// z wysłanym mailem i przy następnym podobnym zapytaniu ten sam znacznik wracał
// („model musi się uczyć", 29.10.2026). Po wysłaniu porównujemy szkic z wysłaną treścią:
// tekst między tymi samymi sąsiednimi słowami, w miejscu znacznika, to odpowiedź.
// Backend (StudioReplyFactStore) podaje ją kolejnym szkicom.
//
// Zapamiętujemy tylko wiedzę o studiu. Termin, cena, imię czy numer dotyczą jednej
// rozmowy - „czwartek 30.10" zapamiętany jako „proponowany termin" trafiłby do każdego
// następnego klienta.

export interface PlaceholderAnswer {
    topic: string;
    answer: string;
}

/** Znaczniki jednej rozmowy - nigdy nie trafiają do wiedzy studia. */
const ONE_CONVERSATION = /termin|dzie[nń]|dat[aęy]|godzin|kiedy|cen[aęy]|kwot|koszt|zł|rabat|imi[eę]|nazwisk|numer|adres|telefon|rejestrac/i;

/** Tyle znaków sąsiedztwa szukamy w wysłanej treści - krócej to zgadywanie, dłużej rzadziej przetrwa edycję. */
const ANCHOR = 40;
const MIN_ANCHOR = 8;
const MAX_ANSWER = 1000;

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

export const remembersPlaceholder = (placeholder: string): boolean => !ONE_CONVERSATION.test(placeholder);

/**
 * Odpowiedzi wpisane w miejsce znaczników [placeholders] szkicu [draftText] w wysłanej
 * treści [sentText]. Znacznik, którego miejsca nie da się pewnie odnaleźć (pracownik
 * przepisał całe zdanie), pomijamy - lepiej nie zapamiętać niż zapamiętać pół zdania.
 */
export function placeholderAnswers(draftText: string, sentText: string, placeholders: string[]): PlaceholderAnswer[] {
    const draft = squash(draftText);
    const sent = squash(sentText);
    const answers: PlaceholderAnswer[] = [];
    for (const placeholder of placeholders) {
        if (!remembersPlaceholder(placeholder)) continue;
        const at = draft.indexOf(placeholder);
        if (at < 0) continue;
        // Sąsiedztwo do najbliższego innego znacznika - jego treść też się zmieniła.
        const before = draft.slice(Math.max(0, at - ANCHOR), at).split(']').pop() ?? '';
        const after = draft.slice(at + placeholder.length, at + placeholder.length + ANCHOR).split('[')[0];
        const atStart = at === 0;
        const atEnd = at + placeholder.length === draft.length;
        if ((!atStart && before.trim().length < MIN_ANCHOR) || (!atEnd && after.trim().length < MIN_ANCHOR)) continue;

        const from = atStart ? 0 : sent.indexOf(before);
        if (from < 0 || sent.indexOf(before, from + 1) >= 0) continue; // brak albo dwuznaczne
        const start = from + before.length;
        const end = atEnd ? sent.length : sent.indexOf(after, start);
        if (end < start) continue;

        const answer = sent.slice(start, end).trim();
        if (!answer || answer.includes('[') || answer.length > MAX_ANSWER) continue;
        answers.push({ topic: placeholder.slice(1, -1).trim(), answer });
    }
    return answers;
}
