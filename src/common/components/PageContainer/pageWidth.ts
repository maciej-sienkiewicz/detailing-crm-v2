import { css } from 'styled-components';

/**
 * Współdzielone tokeny i fragmenty CSS szerokości strony.
 *
 * Wydzielone z PageContainer.tsx celowo: komponent React i pomocnicze fragmenty
 * `css` muszą mieszkać w osobnych plikach, bo react-refresh (Fast Refresh) działa
 * poprawnie tylko dla plików eksportujących wyłącznie komponenty. Dzięki temu
 * PageContainer.tsx eksportuje sam komponent, a tutaj trzymamy resztę - i jedno,
 * i drugie da się importować z barrela `@/common/components/PageContainer`.
 */

export type PageWidth = 'standard' | 'narrow' | 'full';

/** Docelowa maksymalna szerokość standardowego widoku treściowego. */
export const PAGE_MAX_WIDTH = '1600px';

/** Maksymalna szerokość wariantu wąskiego (self-service / formularze). */
export const PAGE_NARROW_MAX_WIDTH = '640px';

/**
 * Wspólny, responsywny gutter POZIOMY całej aplikacji - JEDNO źródło prawdy.
 * Używa go PageContainer, ale też widoki pełnoekranowe (np. Galeria), które nie
 * mogą użyć samego PageContainera, a mimo to muszą trzymać treść w tej samej
 * kolumnie. Dzięki temu krawędzie nagłówka i treści są identyczne wszędzie -
 * także 48px na dużych ekranach (≥1280px).
 */
export const pageGutter = css`
    padding-inline: ${(p) => p.theme.spacing.md};

    @media (min-width: ${(p) => p.theme.breakpoints.sm}) {
        padding-inline: ${(p) => p.theme.spacing.lg};
    }

    @media (min-width: ${(p) => p.theme.breakpoints.md}) {
        padding-inline: ${(p) => p.theme.spacing.xl};
    }

    @media (min-width: ${(p) => p.theme.breakpoints.xl}) {
        padding-inline: 48px;
    }
`;

/**
 * Wyśrodkowana kolumna treści o standardowej szerokości + wspólny gutter.
 * Dla pasm w widokach pełnoekranowych, które chcą wyglądać dokładnie jak
 * standardowy PageContainer, ale nie mogą nim być (własny układ 100dvh).
 */
export const pageColumn = css`
    width: 100%;
    max-width: ${PAGE_MAX_WIDTH};
    margin-inline: auto;
    ${pageGutter}
`;

/** Reguły max-width dla wariantów PageContainer. */
export const pageWidthStyles = {
    standard: css`
        max-width: ${PAGE_MAX_WIDTH};
    `,
    narrow: css`
        max-width: ${PAGE_NARROW_MAX_WIDTH};
    `,
    full: css`
        max-width: none;
    `,
} as const;
