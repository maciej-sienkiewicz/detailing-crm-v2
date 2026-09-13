import styled, { css } from 'styled-components';

/**
 * PageContainer — jedyne źródło prawdy o szerokości i marginesach strony.
 *
 * Wcześniej każdy widok routingu sam ustawiał `max-width` (1080 / 1280 / 1400 /
 * 1600 / 1800 / 1920px albo brak) oraz własną skalę paddingu. Przez to nagłówek
 * i treść „przeskakiwały" na szerszą/węższą kolumnę przy przechodzeniu między
 * widokami na dużym ekranie.
 *
 * Ten komponent centralizuje trzy rzeczy dla WSZYSTKICH widoków treściowych:
 *   1. spójny `max-width` (patrz PAGE_MAX_WIDTH),
 *   2. wyśrodkowanie kolumny (`margin-inline: auto`),
 *   3. jedną responsywną skalę paddingu POZIOMEGO (gutter).
 *
 * Świadomie ustawiamy tylko `padding-inline`. „Przeskakiwanie" jest problemem
 * poziomym (szerokość + wyrównanie lewej/prawej krawędzi nagłówka i treści),
 * więc padding PIONOWY zostaje po stronie widoku (`padding-block`). Dzięki temu
 * ujednolicamy szerokość, nie ruszając rytmu pionowego ani miejsca zostawionego
 * pod przyklejone stopki akcji (np. karty klienta/pojazdu).
 *
 * Widok nie powinien już deklarować własnego `max-width` / `margin: 0 auto`
 * ani poziomego paddingu — od tego jest właśnie PageContainer.
 *
 * Renderuje się domyślnie jako <main> — kolumna treści jest jednocześnie
 * landmarkiem `main` strony. Widok pełnoekranowego tła (wzorzec z osobnym
 * wrapperem tła) powinien mieć ten wrapper jako <div>, żeby nie powstał
 * zagnieżdżony <main>. W razie potrzeby element można nadpisać przez `as`.
 *
 * Użycie — jako samodzielny wrapper (jest <main>):
 *   <PageContainer>
 *       ...treść widoku...
 *   </PageContainer>
 *
 * Użycie — jako baza własnego kontenera widoku (zachowuje flex/gap/animację):
 *   const ViewContainer = styled(PageContainer)`
 *       display: flex;
 *       flex-direction: column;
 *       gap: ${(p) => p.theme.spacing.xl};
 *       padding-block: ${(p) => p.theme.spacing.lg};
 *   `;
 *   // ...
 *   <ViewContainer>...</ViewContainer>
 *
 * Warianty (`$width`):
 *   - "standard" (domyślny) — kolumna treści dla dashboardu, list, formularzy itd.
 *   - "narrow"   — wąska, wyśrodkowana kolumna dla widoków self-service / prostych
 *                  formularzy.
 *   - "full"     — bez limitu szerokości, ale z tym samym gutterem; dla gęstych
 *                  tabel, które muszą wykorzystać całą dostępną przestrzeń.
 *
 * Widoki celowo pełnoekranowe (Kalendarz, Galeria, Poczta, Leady) zarządzają
 * własnym układem (100dvh, własne przewijanie kolumn) i NIE korzystają z tego
 * komponentu.
 */

export type PageWidth = 'standard' | 'narrow' | 'full';

/** Docelowa maksymalna szerokość standardowego widoku treściowego. */
export const PAGE_MAX_WIDTH = '1600px';

/** Maksymalna szerokość wariantu wąskiego (self-service / formularze). */
export const PAGE_NARROW_MAX_WIDTH = '640px';

const widthStyles = {
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

interface PageContainerProps {
    /** Wariant szerokości. Domyślnie "standard". */
    $width?: PageWidth;
    /**
     * Wyłącza domyślny poziomy padding kontenera. Rzadko potrzebne — tylko gdy
     * widok musi sięgać poziomo od krawędzi do krawędzi, a mimo to chce korzystać
     * z limitu szerokości i wyśrodkowania.
     */
    $noPadding?: boolean;
}

export const PageContainer = styled.main<PageContainerProps>`
    width: 100%;
    margin-inline: auto;
    ${({ $width = 'standard' }) => widthStyles[$width]}

    ${({ $noPadding }) =>
        !$noPadding &&
        css`
            /* Jedna, wspólna skala guttera dla całej aplikacji. Ten sam poziomy
               padding na każdym widoku = nagłówek i treść zaczynają się w tym
               samym miejscu niezależnie od tego, którą stronę otworzysz. */
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
        `}
`;
