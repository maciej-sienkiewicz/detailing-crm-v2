/** Widoki zakładki Konkurencja (`?show=`). */
export type CompetitionView = 'profiles' | 'ads' | 'area';

export const isCompetitionView = (raw: string | null): raw is CompetitionView =>
    raw === 'profiles' || raw === 'ads' || raw === 'area';

/**
 * Stare adresy modułu → nowe. Linki z powiadomień push, podpowiedzi na Tablicy i zakładek
 * przeglądarki prowadziły do zakładek, których już nie ma (Tydzień, Porównanie, Treści,
 * Reklamy) - bez przekierowania otwierałyby po cichu Przegląd zamiast obiecanej treści.
 *
 * Polskie nazwy parametrów i wartości (dawne `widok`, `pokaz`, `okres`) tłumaczy
 * wcześniej, przy wejściu na stronę, `core/legacyUrls.ts`; tu zostają tylko dawne zakładki
 * i okresy liczone w tygodniach. Zwraca nowe parametry albo null, gdy adres jest aktualny.
 */
export const resolveLegacyUrl = (current: URLSearchParams): URLSearchParams | null => {
    const params = new URLSearchParams(current);
    const tab = params.get('view');
    let changed = false;

    const set = (key: string, value: string) => {
        if (params.get(key) !== value) { params.set(key, value); changed = true; }
    };

    if (tab === 'tydzien') set('view', 'overview');
    if (tab === 'tresci') set('view', 'inspiration');
    if (tab === 'porownanie') { set('view', 'competition'); set('show', 'profiles'); }
    if (tab === 'reklamy') { set('view', 'competition'); set('show', 'ads'); }
    if (params.get('view') === 'competition' && params.get('show') === 'porownanie') set('show', 'profiles');

    // Dawny okres był w tygodniach (4/12/26/52). „Rok" ma odpowiednik, reszta - domyślne 90 dni.
    const period = params.get('period');
    if (period && period !== '90' && period !== '365') {
        if (period === '52' && params.get('view') === 'competition') set('period', '365');
        else { params.delete('period'); changed = true; }
    }

    return changed ? params : null;
};
