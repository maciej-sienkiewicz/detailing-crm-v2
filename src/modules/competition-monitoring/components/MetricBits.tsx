import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ui } from '@/common/components/ui';
import { PHONE } from '../utils/phone';

/**
 * Współdzielone klocki UI modułu. Zasada: żadna liczba bez kontekstu,
 * każda metryka renderowana jest z deltą i/lub odniesieniem do konkurencji,
 * opisanym prostym językiem (bez żargonu analitycznego).
 */

// ─── Formatery ────────────────────────────────────────────────────────────────

/**
 * JEDEN zapis braku danych w całym module: półpauza.
 *
 * Wcześniej w jednym wierszu tabeli stały obok siebie trzy różne zapisy tego
 * samego pojęcia: `formatExact` zwracało łącznik „-", a JSX wypisywał półpauzę
 * „—" i literalne „0". Trzy glify na „nic" w jednym wierszu każą czytelnikowi
 * szukać różnicy, której nie ma.
 */
export const EMPTY = '—';

/**
 * Liczby w module piszemy po polsku: „1,5 tys.", „2,3 mln". `toFixed()` dawało
 * kropkę dziesiętną („1.5 tys."), która w polskim tekście wygląda jak błąd.
 */
const plNumber = (value: number, decimals: number): string =>
    value.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const formatNumber = (value: number | null | undefined, decimals = 0): string => {
    if (value === null || value === undefined) return EMPTY;
    if (Math.abs(value) >= 1_000_000) return `${plNumber(value / 1_000_000, 1)} mln`;
    if (Math.abs(value) >= 10_000) return `${plNumber(value / 1000, 0)} tys.`;
    if (Math.abs(value) >= 1000) return `${plNumber(value / 1000, 1)} tys.`;
    return plNumber(value, decimals);
};

/**
 * Liczba bez zaokrąglania, z grupowaniem tysięcy: „41 200".
 *
 * [formatNumber] skraca do „41 tys.", co przy zasięgu reklamy gubi różnicę między
 * 41 200 a 41 900 - a to jedyna liczba, po której właściciel porównuje kampanie.
 *
 * Grupujemy SAMI, zamiast przez `toLocaleString('pl-PL')`: polska lokalizacja
 * nie rozdziela liczb czterocyfrowych (`minimumGroupingDigits` = 2), więc
 * w kolumnie stało „5170" tuż pod „41 717" i oko traciło wspólny rytm cyfr.
 *
 * Opcja `useGrouping: 'always'` naprawiłaby to jedną linijką, ale pochodzi
 * z ES2023, a aplikacja celuje w ES2020 — nie ma jej w bibliotece typów.
 * Wynik poniżej jest identyczny co do znaku w całym zakresie, jaki tu występuje
 * (liczby całkowite, nieujemne).
 *
 * Separatorem jest TWARDA spacja: zwykła pozwoliłaby złamać „41 717" na końcu
 * wiersza na „41" i „717".
 */
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

export const formatExact = (value: number | null | undefined): string =>
    value === null || value === undefined
        ? EMPTY
        : String(Math.trunc(value)).replace(THOUSANDS, '\u00A0');

export const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

// ─── Karty i nagłówki ─────────────────────────────────────────────────────────

export const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    padding: 20px 24px;

    /* Padding 24 px z desktopu to na 375 px 48 px odjęte od szerokości karty,
       przy kolumnie profilu 34 + gap 14 = ~48 zostaje na treść. Na mobile
       zmniejszamy do 16 px, żeby tytuł i zdanie o realizacjach nie zwijały się
       w dwa piętra na kciuku. */
    @media (max-width: ${p => p.theme.breakpoints.md}) {
        padding: 14px 14px;
        border-radius: ${st.radiusSm};
    }

    /* Na telefonie karta stoi między panelami z promieniem 16-20 px; 8 px czytało
       się jak inny, tańszy materiał. Reguła wyżej zostaje dla 768 px (desktop). */
    ${PHONE} {
        border-radius: ${ui.radiusPanel};
    }
`;

export const CardTitle = styled.h2`
    margin: 0 0 4px;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.2px;
`;

export const CardHint = styled.p<{ $hideOnMobile?: boolean }>`
    margin: 0 0 16px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.5;

    /* Długie akapity wyjaśniające („domyślnie sortujemy po skuteczności...") są
       na desktopie kontekstem, na telefonie szumem — właściciel skanuje ekran
       między klientami. Miejsca gdzie hint nie jest esencjalny mają go schować
       poniżej md. */
    @media (max-width: ${p => p.theme.breakpoints.md}) {
        ${p => p.$hideOnMobile && 'display: none;'}
    }

    /* #94A3B8 na bieli to 2,6:1 - na telefonie, w słońcu przy aucie, nie do przeczytania. */
    ${PHONE} {
        color: ${ui.textMuted};
    }
`;

// ─── Delta ────────────────────────────────────────────────────────────────────

// ─── Komórka metryki (wartość + delta + vs konkurencja) ──────────────────────

// ─── Stany widoku ─────────────────────────────────────────────────────────────

export const CenterState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 56px 24px;
    text-align: center;
    color: ${st.textSecondary};
    font-size: ${st.fontMd};

    strong { color: ${st.text}; font-size: ${st.fontLg}; }
    span { color: ${st.textMuted}; font-size: ${st.fontSm}; max-width: 440px; line-height: 1.6; }

    /* Ten sam powód co przy CardHint: podpowiedź pustego stanu ma się dać przeczytać. */
    ${PHONE} {
        span { color: ${ui.textMuted}; }
    }
`;

export const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ig-spin 0.8s linear infinite;

    @keyframes ig-spin {
        to { transform: rotate(360deg); }
    }
`;

// ─── Pigułki / pomocnicze ────────────────────────────────────────────────────

