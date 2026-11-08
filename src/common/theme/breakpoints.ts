export const breakpoints = {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
} as const;

/**
 * Górne granice dla reguł `max-width`: „poniżej progu", bez samego progu.
 *
 * Próg należy do szerszego układu - `min-width: 768px` włącza menu boczne, a
 * `useBreakpoint('md')` liczy `>= 768`. Reguła telefonu napisana jako
 * `max-width: 768px` obejmuje go TAKŻE, więc na szerokości dokładnie 768 px
 * (iPad w pionie) działały naraz obie: menu boczne chowało się jak na telefonie,
 * dolny pasek jak na komputerze, a treść dostawała lewy margines pod menu, którego
 * nie było. Aplikacja zostawała bez żadnej nawigacji.
 */
export const below = {
    sm: '639.98px',
    md: '767.98px',
    lg: '1023.98px',
    xl: '1279.98px',
    xxl: '1535.98px',
} as const;
