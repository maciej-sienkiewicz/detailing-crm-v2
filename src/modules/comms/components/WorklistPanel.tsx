// src/modules/comms/components/WorklistPanel.tsx
// Prawa kolumna: KONTEKST, nie praca.
//
// ── Podział ról między kolumnami ────────────────────────────────────────────
//
// Lewa kolumna jest jedynym miejscem, w którym cokolwiek się robi. Prawa ma
// wyłącznie mówić, jak wygląda rok i co się domknęło - i ma to robić tak, żeby
// nie zabierać wzroku z lewej.
//
// Dlatego NIE MA tu ani jednego wezwania do działania. Stał tu wcześniej duży
// przycisk „Odpisz Markowi" - i to był błąd dwa razy: raz, bo przeciągał uwagę
// z kolumny, w której ta sama sprawa stoi pierwsza od góry, a drugi raz, bo
// wypełniony kolorem marki (#0ea5e9) z białym napisem dawał kontrast 2,77:1,
// czyli poniżej progu WCAG AA. Przycisk był jednocześnie najgłośniejszym
// i najmniej czytelnym elementem ekranu.
//
// ── Kolor ───────────────────────────────────────────────────────────────────
//
// Panel nie ma własnego akcentu. Wcześniej karta miała czerwoną krawędź przy
// jasnoniebieskim przycisku - dwie barwy, z których każda coś krzyczała, i żadna
// nie znaczyła tego samego co druga. Tu zostaje biel kart na szarej podłodze
// i jeden kolor pisma. Kolor w tym module ma jedno zadanie i jest nim wiek, który
// przekroczył próg - w kolumnie obok.
//
// ── Liczby ──────────────────────────────────────────────────────────────────
//
// Trzy fakty i wykres. Żaden z faktów nie wskazuje konkretnej sprawy: nazwiska
// mieszkają w kolejce i tylko tam, bo nazwisko w prawej kolumnie prosi się
// o kliknięcie, którego ta kolumna nie obsługuje.
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useLeadIntakeYear } from '../hooks/useLeads';
import type { Worklist } from '../utils/leadWorklist';
import { AnalyticsCard, IntakeYearChart, type YearPoint } from './analytics/charts';
import { formatMoney } from './shared';

const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const Shell = styled.div<{ $compact?: boolean }>`
    display: flex;
    flex-direction: column;
    height: ${p => (p.$compact ? 'auto' : '100%')};
    min-height: 0;
    /* Szara podłoga aplikacji, nie biel: dopiero na niej białe karty czytają się
       jako uniesione powierzchnie, a nie płaskie prostokąty na bieli. W wariancie
       spod listy podłogę daje już strona, więc panel jej nie dokłada. */
    background: ${p => (p.$compact ? 'transparent' : p.theme.colors.background)};
`;

const Body = styled.div<{ $compact?: boolean }>`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: ${p => (p.$compact ? 'visible' : 'auto')};
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: ${p => (p.$compact ? '0' : '20px 20px 40px')};
    /* Kontener zapytań szerokości: karty reagują na szerokość PANELU (~600 px),
       nie okna desktopu. */
    container-type: inline-size;

    & > * { flex-shrink: 0; }
`;

/**
 * Trzy fakty jako lista definicyjna: etykieta po lewej, liczba po prawej.
 *
 * Nie kafle. Kafel obiecuje, że liczba jest ważna sama z siebie i że da się w nią
 * kliknąć; wiersz listy definicyjnej obiecuje tyle, ile tu faktycznie jest -
 * że tak to wygląda. Liczby wyrównane do prawej i tabelaryczne, więc trzy wiersze
 * czyta się jednym ruchem oka w dół, a nie trzema w poprzek.
 */
const Facts = styled.dl`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px 16px;
    margin: 0;
    padding: 18px 22px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};

    dt {
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
        min-width: 0;
    }

    dd {
        margin: 0;
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    @container (max-width: 380px) {
        padding: 16px;
        dt { font-size: 12.5px; }
    }
`;

/**
 * Wejście w podsumowanie miesiąca. Tekst z podkreśleniem przy najechaniu, nie
 * przycisk: to jest droga dalej, a nie czynność do wykonania na tym ekranie.
 *
 * Kolor: #0369a1 zamiast #0ea5e9 z palety marki. Marka na bieli daje 2,77:1,
 * czyli mniej niż wymaga WCAG AA dla trzynastopunktowego pisma; ciemniejszy
 * odcień tej samej barwy daje 5,93:1 i wygląda jak ta sama marka.
 */
const SummaryLink = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    align-self: center;
    padding: 6px 4px;
    border: none;
    background: transparent;
    color: #0369a1;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }

    svg { width: 14px; height: 14px; }
`;

interface WorklistPanelProps {
    worklist: Worklist;
    /** Wejście w podsumowanie miesiąca (pełna analityka). */
    onOpenSummary: () => void;
    /**
     * Wariant spod listy na wąskim ekranie: bez własnej podłogi i przewijania.
     * Treść jest ta sama - tam też jest to kontekst pod pracą, nie obok niej.
     */
    compact?: boolean;
}

export function WorklistPanel({ worklist, onOpenSummary, compact = false }: WorklistPanelProps) {
    /*
     * Wykres idzie po własne, lekkie dane, a nie po pełną analitykę: ta liczy
     * macierze dni tygodnia, segmenty aut i kilkaset surowych faktów - przy każdym
     * wejściu w moduł, żeby narysować dwanaście punktów.
     */
    const intake = useLeadIntakeYear();

    const months = intake.data?.months ?? [];
    const points: YearPoint[] = months.map((month) => ({
        period: MONTH_ABBR[month.month - 1],
        value: month.value,
        count: month.count,
    }));

    const thisMonth = new Date().getMonth();
    const thisMonthCount = months[thisMonth]?.count ?? null;
    const closedThisWeek = intake.data?.confirmedValueThisWeek ?? 0;
    const silentValue = worklist.silent.value;

    return (
        <Shell $compact={compact}>
            <Body $compact={compact}>
                <Facts>
                    <dt>Domknięte w tym tygodniu</dt>
                    {/*
                      * Bezosobowo, bo polszczyzna nie ma bezrodzajowej drugiej osoby
                      * w czasie przeszłym. Stało tu „domknąłeś" - słowo, które połowie
                      * użytkowników mówi, że aplikacja ich nie zna.
                      */}
                    <dd>{formatMoney(closedThisWeek)}</dd>

                    <dt>Zapytania w tym miesiącu</dt>
                    <dd>{thisMonthCount ?? '—'}</dd>

                    <dt>Wyceny w rozmowach bez odzewu</dt>
                    <dd>{formatMoney(silentValue)}</dd>
                </Facts>

                <AnalyticsCard
                    question="Zapytania miesiąc po miesiącu"
                    answer={`Rok ${intake.data?.year ?? new Date().getFullYear()}, od stycznia do grudnia.`}
                >
                    <IntakeYearChart points={points} />
                </AnalyticsCard>

                <SummaryLink type="button" onClick={onOpenSummary}>
                    Podsumowanie miesiąca <ArrowRight />
                </SummaryLink>
            </Body>
        </Shell>
    );
}
