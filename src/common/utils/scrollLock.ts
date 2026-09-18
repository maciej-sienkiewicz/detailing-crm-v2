// src/common/utils/scrollLock.ts
//
// JEDYNY właściciel blokady przewijania tła. Każde okno, menu i nakładka,
// która chce zatrzymać scroll dokumentu, przechodzi przez ten moduł — nikomu
// nie wolno pisać po `document.body.style.overflow` (ani po `<html>`) na
// własną rękę.
//
// Dlaczego: przed centralizacją w kodzie żyło sześć niezależnych blokad,
// każda według wzorca „zapisz poprzedni styl → nadpisz → przywróć zapisany".
// Ten wzorzec jest poprawny w izolacji i błędny przy nakładaniu się okien:
// okno otwarte NAD innym zapamiętuje `hidden` jako „stan do przywrócenia",
// a gdy sprząta jako ostatnie (React odmontowuje efekty od rodzica w dół,
// więc modal + jego potwierdzenie zamykane jednym kliknięciem sprzątają
// właśnie w tej kolejności), zostawia dokument zablokowany NA STAŁE.
// Objaw z produkcji: „strona zamrożona, nie scrolluje się nic, pomaga
// dopiero odświeżenie" — bo F5 czyści style inline.
//
// Zasada działania: zliczanie referencji. Style dziewicze są zdejmowane
// z elementów wyłącznie przy przejściu licznika 0→1 i przywracane wyłącznie
// przy 1→0. Kolejność zwalniania blokad przestaje mieć znaczenie.
//
// Blokada obejmuje `<html>`, nie tylko `<body>`: to element dokumentu jest
// kontenerem przewijania, samo wyciszenie `<body>` nie działało (patrz
// historia w useModalViewport). `overscroll-behavior` odcina łańcuch
// przewijania z wnętrza okna na dokument.

export type ScrollLockKind =
    /** Zwykłe okno modalne: `overflow: hidden` na `<html>` i `<body>`. */
    | 'overflow'
    /**
     * Twarda blokada dla menu mobilnego: `position: fixed` na `<body>`
     * z zapamiętaną pozycją scrolla. Sam `overflow: hidden` nie wystarcza
     * w mobilnych przeglądarkach (zwłaszcza iOS Safari) — gesty dotyku
     * dalej przesuwają viewport i palcem dało się scrollować treść pod
     * overlayem. Przy `position: fixed` viewport nie ma już czego przewijać.
     */
    | 'fixed';

/** Zwalnia blokadę. Wielokrotne wywołanie jest bezpieczne (no-op). */
export type ReleaseScrollLock = () => void;

interface PristineStyles {
    htmlOverflow: string;
    htmlOverscrollBehavior: string;
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyLeft: string;
    bodyRight: string;
    bodyWidth: string;
}

interface LockToken {
    kind: ScrollLockKind;
}

const activeTokens = new Set<LockToken>();
let fixedCount = 0;
let pristine: PristineStyles | null = null;
let savedScrollY = 0;

const applyFixed = (): void => {
    savedScrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
};

/**
 * Zdejmuje sam wariant `position: fixed` (gdy pod menu mobilnym wciąż trwa
 * inna blokada) i wraca do zapamiętanej pozycji scrolla, żeby użytkownik
 * nie wylądował na górze strony.
 */
const removeFixed = (): void => {
    if (!pristine) return;
    const body = document.body;
    body.style.position = pristine.bodyPosition;
    body.style.top = pristine.bodyTop;
    body.style.left = pristine.bodyLeft;
    body.style.right = pristine.bodyRight;
    body.style.width = pristine.bodyWidth;
    window.scrollTo(0, savedScrollY);
};

const restorePristine = (): void => {
    if (!pristine) return;
    const root = document.documentElement;
    const body = document.body;
    root.style.overflow = pristine.htmlOverflow;
    root.style.overscrollBehavior = pristine.htmlOverscrollBehavior;
    body.style.overflow = pristine.bodyOverflow;
    body.style.position = pristine.bodyPosition;
    body.style.top = pristine.bodyTop;
    body.style.left = pristine.bodyLeft;
    body.style.right = pristine.bodyRight;
    body.style.width = pristine.bodyWidth;
    pristine = null;
};

/**
 * Zakłada blokadę przewijania tła i zwraca funkcję zwalniającą — pomyślaną
 * tak, żeby dało się ją oddać wprost z efektu:
 *
 *     useEffect(() => {
 *         if (!isOpen) return;
 *         return acquireScrollLock();
 *     }, [isOpen]);
 *
 * Zwalnianie jest idempotentne i odporne na kolejność: dopóki JAKAKOLWIEK
 * blokada trwa, style pozostają założone; dziewicze wartości wracają dopiero
 * po zwolnieniu ostatniej.
 */
export const acquireScrollLock = (kind: ScrollLockKind = 'overflow'): ReleaseScrollLock => {
    if (typeof document === 'undefined') return () => {};

    const token: LockToken = { kind };
    activeTokens.add(token);

    if (activeTokens.size === 1) {
        const root = document.documentElement;
        const body = document.body;
        pristine = {
            htmlOverflow: root.style.overflow,
            htmlOverscrollBehavior: root.style.overscrollBehavior,
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
        };
        root.style.overflow = 'hidden';
        root.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
    }

    if (kind === 'fixed') {
        fixedCount += 1;
        if (fixedCount === 1) applyFixed();
    }

    return () => {
        if (!activeTokens.has(token)) return;
        activeTokens.delete(token);

        if (token.kind === 'fixed') {
            fixedCount -= 1;
            if (fixedCount === 0 && activeTokens.size > 0) removeFixed();
        }

        if (activeTokens.size === 0) {
            const scrollBack = fixedCount === 0 && token.kind === 'fixed';
            restorePristine();
            // Po zdjęciu `position: fixed` dokument znów ma wysokość, więc
            // dopiero teraz scroll ma dokąd wrócić.
            if (scrollBack) window.scrollTo(0, savedScrollY);
        }
    };
};

/**
 * Siatka bezpieczeństwa: zwalnia WSZYSTKIE blokady i unieważnia wydane
 * funkcje zwalniające (stają się no-opami). Wołane przy zmianie trasy —
 * każdy właściciel blokady (okno, menu) jest z definicji przypięty do
 * ekranu, więc po nawigacji żadna nie ma prawa trwać. Pojedyncze okno,
 * które nie zdąży posprzątać, nie może zamrozić całej aplikacji.
 */
export const releaseAllScrollLocks = (): void => {
    if (activeTokens.size === 0) return;
    const hadFixed = fixedCount > 0;
    activeTokens.clear();
    fixedCount = 0;
    restorePristine();
    if (hadFixed) window.scrollTo(0, savedScrollY);
};

/** Ilu właścicieli trzyma teraz blokadę. Diagnostyka i testy. */
export const scrollLockCount = (): number => activeTokens.size;
