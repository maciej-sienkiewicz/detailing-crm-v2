import styled, { css } from 'styled-components';
import { pageGutter, pageWidthStyles, type PageWidth } from './pageWidth';

/**
 * PageContainer — jedyne źródło prawdy o szerokości i marginesach strony.
 *
 * Wcześniej każdy widok routingu sam ustawiał `max-width` (1080 / 1280 / 1400 /
 * 1600 / 1800 / 1920px albo brak) oraz własną skalę paddingu. Przez to nagłówek
 * i treść „przeskakiwały" na szerszą/węższą kolumnę przy przechodzeniu między
 * widokami na dużym ekranie.
 *
 * Ten komponent centralizuje cztery rzeczy dla WSZYSTKICH widoków treściowych:
 *   1. spójny `max-width` (patrz PAGE_MAX_WIDTH),
 *   2. wyśrodkowanie kolumny (`margin-inline: auto`),
 *   3. jedną responsywną skalę paddingu POZIOMEGO (gutter),
 *   4. wspólny GÓRNY odstęp, żeby nagłówek zaczynał się w tym samym miejscu na
 *      każdym widoku (koniec „skakania" nagłówka w pionie).
 *
 * Widok nie powinien już deklarować własnego `max-width` / `margin: 0 auto`
 * ani paddingu poziomego/górnego — od tego jest właśnie PageContainer. Jedyne,
 * co widok może dołożyć, to DOLNY zapas (`padding-block-end`), gdy ma przyklejoną
 * stopkę akcji albo pasek zakładek (np. karty klienta/pojazdu/wizyty, edycja
 * wizyty). Górny odstęp zostaje wspólny.
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
    ${({ $width = 'standard' }) => pageWidthStyles[$width]}

    ${({ $noPadding }) =>
        !$noPadding &&
        css`
            /* Wspólny gutter POZIOMY (pageGutter) + wspólny odstęp PIONOWY (od
               góry) na każdym widoku = nagłówek i treść zaczynają się w tym samym
               miejscu niezależnie od tego, którą stronę otworzysz.

               Padding-block bywa nadpisywany PRZEZ widok tylko od dołu
               (padding-block-end) - gdy widok ma przyklejoną stopkę akcji albo
               pasek zakładek i musi zostawić pod nie zapas. Górny odstęp zostaje
               wspólny, żeby nagłówek nie „skakał" w pionie. */
            ${pageGutter}
            padding-block: ${(p) => p.theme.spacing.lg};

            @media (min-width: ${(p) => p.theme.breakpoints.md}) {
                padding-block: ${(p) => p.theme.spacing.xl};
            }
        `}
`;
