/**
 * Reguły wyłącznie na telefon. Próg to lustro `useBreakpoint('md')`
 * (`min-width: 768px`), więc desktop i tablet od 768 px zostają nietknięte.
 *
 * Nie `max-width: ${theme.breakpoints.md}`: to obejmuje też dokładnie 768 px,
 * czyli szerokość, na której widok jest już desktopowy (sidebar, nagłówek
 * z akcjami) - reguła „mobilna" nachodziła wtedy na desktop.
 *
 * Także nie `touch` z `@/common/components/ui`: laptop z ekranem dotykowym to
 * nadal desktop, a układ ma się zmieniać od szerokości, nie od rodzaju wskaźnika.
 */
export const PHONE = '@media (max-width: 767px)';
