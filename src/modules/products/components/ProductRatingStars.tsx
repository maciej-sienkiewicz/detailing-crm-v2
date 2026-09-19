import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Star } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatRating } from '../utils/productFormat';

/**
 * Ocena produktu - jeden wygląd dla całego modułu.
 *
 * Wcześniej to samo rysowały trzy różne kawałki kodu: pięć gwiazdek w karcie
 * produktu i po jednej „gwiazdce z liczbą" w tabeli oraz w siatce, każda
 * z własnymi rozmiarami i kolorami. Poza niespójnością miały trzy wspólne wady:
 *
 *  1. PUSTE GWIAZDKI BYŁY BURSZTYNOWE. Ocena 2/5 dawała pięć bursztynowych
 *     kształtów w jednym rzędzie - kolor przestawał cokolwiek znaczyć, bo
 *     niósł go zarówno stan „przyznane", jak i „nieprzyznane". Puste są teraz
 *     szare; bursztyn zostaje wyłącznie dla tego, co ktoś faktycznie ocenił.
 *  2. LICZBA BYŁA BURSZTYNOWA. `#F59E0B` na białym tle daje kontrast ~2,1:1,
 *     czyli poniżej wymaganych 4,5:1 (WCAG AA). Kolor niesie teraz ikona,
 *     a liczba wraca do koloru tekstu.
 *  3. GRUBOŚĆ KRESKI 2 px przy ikonie 13-14 px zlepiała ramiona gwiazdki
 *     w plamę. Przy tym rozmiarze kreska musi być cieńsza od odstępów, które
 *     rozdziela.
 */

const AMBER = st.accentAmber;
/** Szarość pustej gwiazdki - ta sama, co obwódki kart i tabel. */
const EMPTY = '#CBD5E1';

const Row = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    line-height: 1;
`;

/**
 * Cel dotykowy 32 px przy ikonie 22 px - gwiazdki ocenia się kciukiem, często
 * w rękawicy. Bez `padding` sąsiednie oceny dzieliły 2 px i trafienie w czwórkę
 * zamiast w trójkę było kwestią szczęścia.
 */
const StarBtn = styled.button<{ $size: number }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${p => Math.max(p.$size + 10, 28)}px;
    height: ${p => Math.max(p.$size + 10, 28)}px;
    padding: 0;
    border: none;
    border-radius: ${st.radiusSm};
    background: none;
    cursor: pointer;
    transition: transform 120ms ease, background 120ms ease;

    &:hover { background: ${st.accentAmberDim}; }
    &:active { transform: scale(0.92); }

    &:focus-visible {
        outline: 2px solid ${st.accentBlue};
        outline-offset: -2px;
    }
`;

/** Wspólny rysunek gwiazdki: cieńsza kreska i zaokrąglone złącza. */
const starIcon = css`
    stroke-width: 1.5;
    stroke-linejoin: round;
`;

const StaticStar = styled(Star)`
    ${starIcon}
    flex-shrink: 0;
`;

const Value = styled.span`
    font-size: inherit;
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const Empty = styled.span`
    color: ${st.textMuted};
`;

const STARS = [1, 2, 3, 4, 5];

interface Props {
    value: number | null;
    size?: number;
    onChange?: (rating: number) => void;
}

/**
 * Pięć gwiazdek - do karty produktu, gdzie ocenę się WIDZI i USTAWIA.
 *
 * W trybie ustawiania najechanie pokazuje ocenę, którą da kliknięcie: bez tego
 * jedyną informacją zwrotną była zmiana po fakcie, a przy pięciu celach obok
 * siebie łatwo kliknąć nie ten, który się miało na myśli.
 */
export function ProductRatingStars({ value, size = 16, onChange }: Props) {
    const [hovered, setHovered] = useState<number | null>(null);
    const filled = hovered ?? value ?? 0;

    if (!onChange) {
        return (
            <Row role="img" aria-label={value ? `Ocena ${value} na 5` : 'Brak oceny'}>
                {STARS.map(n => (
                    <StaticStar
                        key={n}
                        size={size}
                        color={n <= filled ? AMBER : EMPTY}
                        fill={n <= filled ? AMBER : 'none'}
                    />
                ))}
            </Row>
        );
    }

    return (
        <Row onMouseLeave={() => setHovered(null)}>
            {STARS.map(n => (
                <StarBtn
                    key={n}
                    $size={size}
                    type="button"
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHovered(n)}
                    onFocus={() => setHovered(n)}
                    onBlur={() => setHovered(null)}
                    aria-label={`Oceń na ${n}`}
                    aria-pressed={value === n}
                >
                    <StaticStar
                        size={size}
                        color={n <= filled ? AMBER : EMPTY}
                        fill={n <= filled ? AMBER : 'none'}
                    />
                </StarBtn>
            ))}
        </Row>
    );
}

/**
 * Ocena skrócona do jednej gwiazdki i liczby - do wierszy tabeli i kafelków
 * siatki, gdzie pięć gwiazdek zjadłoby szerokość kolumny, a i tak czytałoby się
 * je jako jedną liczbę.
 */
export function ProductRatingCompact({ value, size = 14 }: { value: number | null; size?: number }) {
    if (value === null) return <Empty>—</Empty>;

    return (
        <Row aria-label={`Ocena ${formatRating(value)} na 5`}>
            <StaticStar size={size} color={AMBER} fill={AMBER} aria-hidden="true" />
            <Value>{formatRating(value)}</Value>
        </Row>
    );
}
