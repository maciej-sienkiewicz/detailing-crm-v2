/** Widoki zakładki Konkurencja (`?pokaz=`). */
export type CompetitionView = 'profile' | 'reklamy' | 'okolica';

export const isCompetitionView = (raw: string | null): raw is CompetitionView =>
    raw === 'profile' || raw === 'reklamy' || raw === 'okolica';

/**
 * Stare adresy modułu → nowe. Linki z powiadomień push, podpowiedzi na Tablicy i zakładek
 * przeglądarki prowadziły do zakładek, których już nie ma (Tydzień, Porównanie, Treści,
 * Reklamy) - bez przekierowania otwierałyby po cichu Przegląd zamiast obiecanej treści.
 *
 * Zwraca nowe parametry albo null, gdy adres jest już aktualny.
 */
export const resolveLegacyUrl = (current: URLSearchParams): URLSearchParams | null => {
    const params = new URLSearchParams(current);
    const tab = params.get('widok');
    let changed = false;

    const set = (key: string, value: string) => {
        if (params.get(key) !== value) { params.set(key, value); changed = true; }
    };

    if (tab === 'tydzien') set('widok', 'przeglad');
    if (tab === 'tresci') set('widok', 'inspiracje');
    if (tab === 'porownanie') { set('widok', 'konkurencja'); set('pokaz', 'profile'); }
    if (tab === 'reklamy') { set('widok', 'konkurencja'); set('pokaz', 'reklamy'); }
    if (params.get('widok') === 'konkurencja' && params.get('pokaz') === 'porownanie') set('pokaz', 'profile');

    // Dawny okres był w tygodniach (4/12/26/52). „Rok" ma odpowiednik, reszta - domyślne 90 dni.
    const period = params.get('okres');
    if (period && period !== '90' && period !== '365') {
        if (period === '52' && params.get('widok') === 'konkurencja') set('okres', '365');
        else { params.delete('okres'); changed = true; }
    }

    return changed ? params : null;
};
