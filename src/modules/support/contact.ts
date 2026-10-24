// Kontakt z obsługą DetailBoost poza formularzem zgłoszenia problemu.
//
// Adres jest jeden dla całej aplikacji. Wcześniej żył tylko jako tekst w oknie
// pierwszego logowania, więc każde nowe miejsce „napisz do nas" wpisywało go od nowa.

export const SUPPORT_EMAIL = 'pomoc@detailboost.pl';

/** Link `mailto:` z gotowym tematem i treścią - klient poczty otwiera się z wypełnioną wiadomością. */
export function supportMailto(subject: string, body: string): string {
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
