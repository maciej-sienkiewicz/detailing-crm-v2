// Wysokość dolnego paska nawigacji na mobile (bez safe-area).
export const BOTTOM_NAV_HEIGHT = 56;

// Miejsce, które pasek zajmuje na dole ekranu razem z safe-area iOS.
// Używane przez Layout (padding treści) oraz widoki liczące własną wysokość.
export const BOTTOM_NAV_SPACE = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;
