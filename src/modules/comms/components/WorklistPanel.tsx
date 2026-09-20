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
// Cztery kafle i wykres. Żaden z kafli nie wskazuje konkretnej sprawy: nazwiska
// mieszkają w kolejce i tylko tam, bo nazwisko w prawej kolumnie prosi się
// o kliknięcie, którego ta kolumna nie obsługuje.
//
// Każdy kafel ma DRUGĄ LINIJKĘ z punktem odniesienia, bo liczba bez skali nie
// jest informacją: „63 zapytania" nie znaczy nic, dopóki nie wiadomo, ile było
// dwa tygodnie wcześniej. Odniesienie znika, gdy próba jest za mała - lepiej nie
// powiedzieć nic, niż powiedzieć „+300%" o trzech zapytaniach.
//
// Okno to czternaście dni, a nie miesiąc kalendarzowy: ma być tej samej długości
// przy każdym wejściu, żeby porównanie znaczyło to samo pierwszego i trzydziestego
// dnia miesiąca. Łapie też dwa pełne cykle tygodniowe, a ruch w detailingu jest
// tygodniowy.
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { useLeadOverview } from '../hooks/useLeads';
import type { Worklist } from '../utils/leadWorklist';
import { AnalyticsCard, IntakeYearChart, type YearPoint } from './analytics/charts';
import { formatMinutes } from './analytics/tokens';
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
 * Siatka kafli. Dwa na dwa w panelu, jeden pod drugim poniżej 380 px.
 *
 * Kafel zamiast wiersza listy definicyjnej, bo te cztery liczby są równorzędne
 * i czyta się je porównawczo - a lista definicyjna narzuca kolejność czytania
 * z góry na dół i sugeruje, że pierwszy wiersz jest najważniejszy.
 *
 * Kafle NIE są klikalne i nie mają obwódki akcentu. To wciąż kolumna kontekstu:
 * kształt karty ma tu znaczyć „osobna liczba", a nie „osobny przycisk".
 */
/**
 * Listwa górnej krawędzi kafla - kolor marki studia, ten sam co na Tablicy.
 * Zapis z wartością zapasową, bo `var(--brand-primary)` nie istnieje w podglądach
 * i testach renderujących komponent poza aplikacją.
 */
const TILE_ACCENT = 'var(--brand-primary, #0ea5e9)';

const Tiles = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @container (max-width: 380px) {
        grid-template-columns: 1fr;
    }
`;

/**
 * Kafel w kształcie kafla z Tablicy (dashboard → OperationalScorecard).
 *
 * Kolor wchodzi GÓRNĄ KRAWĘDZIĄ i jest jeden dla wszystkich czterech: to nie są
 * kategorie do rozróżnienia, tylko wspólna listwa, po której poznaje się kafel
 * stanu. Cała reszta powierzchni zostaje biała, więc listwa jest jedynym kolorem,
 * jaki kafel zużywa. Ta sama zasada, co w kolejce obok, gdzie kolor niesie wyjątek,
 * a nie kategorię.
 *
 * Skala pisma też z Tablicy: podpis 12/13 px wielkością zdaniową (wersaliki w 10 px
 * czytały się tam jak podpis pod podpisem), liczba 25/28 px z ujemnym światłem
 * i cyframi tabelarycznymi, dopisek 11 px.
 */
const Tile = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    padding: 12px 15px 13px;
    background: #ffffff;
    border: 1px solid ${p => p.theme.colors.border};
    border-top: 3px solid ${TILE_ACCENT};
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);

    @media (min-width: ${p => p.theme.breakpoints.sm}) {
        gap: 6px;
        padding: 14px 17px 15px;
    }

    .label {
        font-size: 12px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        line-height: 1.25;
        letter-spacing: -0.01em;
        color: ${p => p.theme.colors.textSecondary};

        @media (min-width: ${p => p.theme.breakpoints.sm}) {
            font-size: 13px;
        }
    }

    /*
     * Cyfry tabelaryczne, bo cztery kafle stoją w siatce i ich wartości mają się
     * wyrównywać optycznie mimo różnych szerokości cyfr - inaczej „11" wisi w innym
     * miejscu niż „79" i przy odświeżeniu danych liczby skaczą w poziomie.
     */
    .value {
        font-size: 25px;
        line-height: 1;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: -0.03em;
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;

        @media (min-width: ${p => p.theme.breakpoints.sm}) {
            font-size: 28px;
        }
    }

    /*
     * Dopisek w 11 px, tak jak na Tablicy - ale w textSecondary (#475569, 7,58:1),
     * nie w textMuted (#94a3b8, 2,56:1). To jedyne odstępstwo od tamtego kafla
     * i jest celowe: tutaj w dopisku stoi porównanie z poprzednim okresem, czyli
     * treść, a nie podpis pod treścią.
     */
    .meta {
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.medium};
        line-height: 1.35;
        color: ${p => p.theme.colors.textSecondary};
        font-variant-numeric: tabular-nums;
    }
`;

/**
 * Notka o usługach. Jedyny tekst na tym ekranie, który o coś prosi, i dlatego
 * stoi na końcu, drobnym pismem, bez ramki alarmu, bez ikony i bez przycisku.
 *
 * Bez ikony świadomie: iskierka czy gwiazdka czyta się dziś jako „tu pisał model",
 * a to jest zwykła informacja o tym, jak moduł działa w dłuższym czasie.
 *
 * Mówi też wprost, czego jeszcze nie ma. Przy kilkudziesięciu zapytaniach miesięcznie
 * podział na usługi, segmenty aut i kanały to po trzy-cztery rozstrzygnięte rozmowy
 * na słupek, gdzie jedno zlecenie przewraca wynik. Obietnica zestawień za kilka
 * miesięcy jest uczciwsza niż wykres, który wygląda na wiedzę, a niesie przypadek.
 */
const ServicesNote = styled.p`
    margin: 0;
    padding: 0 4px;
    font-size: 11.5px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textSecondary};

    strong {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
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

/** Poniżej tylu zapytań w poprzednim oknie procent mówi o przypadku, nie o trendzie. */
const MIN_FOR_TREND = 5;
/** Poniżej tylu odpowiedzi średnia okna to jedna rozmowa, nie średnia. */
const MIN_FOR_AVERAGE = 3;
/** Poniżej tylu odpowiedzi w historii P95 wskazuje po prostu najgorszy przypadek. */
const MIN_FOR_P95 = 20;

/**
 * Czas trwania w dopełniaczu - „poniżej 4 godz.", „poniżej 1 dnia".
 *
 * [formatMinutes] daje mianownik („1 dzień"), bo wszędzie indziej stoi samodzielnie.
 * Tutaj wchodzi po przyimku i mianownik daje „poniżej 1 dzień". Różnicę robi jedna
 * forma - skróty „min" i „godz." są nieodmienne, a liczba mnoga dni już się zgadza.
 */
function durationAfterPreposition(minutes: number | null): string {
    const formatted = formatMinutes(minutes);
    return formatted === '1 dzień' ? '1 dnia' : formatted;
}

/** „63 zapytania" - polska odmiana bez zaskoczeń przy 12-14. */
function inquiries(n: number): string {
    if (n === 1) return '1 zapytanie';
    const rest = n % 10;
    const teens = n % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? `${n} zapytania` : `${n} zapytań`;
}

/**
 * Zmiana wobec poprzedniego okna - słowami, nie kolorem.
 *
 * Bez zieleni i czerwieni, bo ta kolumna nie ma akcentów, ale też dlatego, że
 * kierunek nie jest tu oceną: więcej zapytań bywa skutkiem kampanii albo sezonu,
 * a mniej - urlopu. Strzałka mówi, w którą stronę; wniosek należy do właściciela.
 */
function trend(current: number, previous: number): string {
    if (previous < MIN_FOR_TREND) return `poprzednie 14 dni: ${previous}`;
    if (current === previous) return 'tyle samo co poprzednie 14 dni';
    const change = Math.round(((current - previous) / previous) * 100);
    const arrow = current > previous ? '↑' : '↓';
    return `${arrow} ${Math.abs(change)}% wobec poprzednich 14 dni`;
}

export function WorklistPanel({ worklist, onOpenSummary, compact = false }: WorklistPanelProps) {
    /*
     * Kafle i wykres idą po własne, lekkie dane, a nie po pełną analitykę: ta liczy
     * macierze dni tygodnia, segmenty aut i kilkaset surowych faktów - przy każdym
     * wejściu w moduł, żeby narysować dwanaście punktów i cztery liczby.
     */
    const overview = useLeadOverview();

    const months = overview.data?.months ?? [];
    const points: YearPoint[] = months.map((month) => ({
        period: MONTH_ABBR[month.month - 1],
        value: month.value,
        count: month.count,
    }));

    const recent = overview.data?.recent;
    const closedThisWeek = overview.data?.confirmedValueThisWeek ?? 0;
    const silentValue = worklist.silent.value;

    /*
     * Czas odpowiedzi milczy, dopóki nie ma z czego go policzyć. Kafel z „—" mówi
     * prawdę („jeszcze nie wiemy"), a kafel ze średnią z dwóch rozmów mówi nieprawdę
     * wyglądającą jak pomiar.
     */
    const hasAverage = Boolean(recent && recent.answered >= MIN_FOR_AVERAGE && recent.averageResponseMinutes !== null);
    const hasP95 = Boolean(recent && recent.answeredAllTime >= MIN_FOR_P95 && recent.p95ResponseMinutes !== null);

    const responseMeta = (() => {
        if (!recent) return '';
        if (!hasAverage) return `za mało odpowiedzi w tym okresie (${recent.answered})`;
        if (hasP95) return `95% odpowiedzi poniżej ${durationAfterPreposition(recent.p95ResponseMinutes)}`;
        if (recent.averageResponseMinutesAllTime !== null) {
            return `zwykle ${formatMinutes(recent.averageResponseMinutesAllTime)}`;
        }
        return '';
    })();

    return (
        <Shell $compact={compact}>
            <Body $compact={compact}>
                <Tiles>
                    <Tile>
                        <span className="label">Zapytania · 14 dni</span>
                        <span className="value">{recent ? recent.inquiries : '—'}</span>
                        <span className="meta">
                            {recent ? trend(recent.inquiries, recent.inquiriesPrevious) : ''}
                        </span>
                    </Tile>

                    <Tile>
                        <span className="label">Czas odpowiedzi · 14 dni</span>
                        <span className="value">
                            {hasAverage ? formatMinutes(recent!.averageResponseMinutes) : '—'}
                        </span>
                        <span className="meta">{responseMeta}</span>
                    </Tile>

                    <Tile>
                        {/*
                          * Bezosobowo, bo polszczyzna nie ma bezrodzajowej drugiej osoby
                          * w czasie przeszłym. Stało tu „domknąłeś" - słowo, które połowie
                          * użytkowników mówi, że aplikacja ich nie zna.
                          */}
                        <span className="label">Domknięte · ten tydzień</span>
                        <span className="value">{formatMoney(closedThisWeek)}</span>
                        <span className="meta">od poniedziałku, wartość rezerwacji</span>
                    </Tile>

                    <Tile>
                        {/* Ta sama nazwa, co nagłówek sekcji w kolejce obok. Dwa słowa
                            na jedną rzecz na jednym ekranie to dwie rzeczy dla czytającego. */}
                        <span className="label">Ucichło</span>
                        <span className="value">{formatMoney(silentValue)}</span>
                        <span className="meta">
                            {worklist.silent.entries.length > 0
                                ? `${inquiries(worklist.silent.entries.length)} w kolejce obok`
                                : 'nic nie ucichło'}
                        </span>
                    </Tile>
                </Tiles>

                <AnalyticsCard
                    question="Zapytania miesiąc po miesiącu"
                    answer={`Rok ${overview.data?.year ?? new Date().getFullYear()}, od stycznia do grudnia.`}
                >
                    <IntakeYearChart points={points} />
                </AnalyticsCard>

                <ServicesNote>
                    <strong>Ustawiaj usługi w zapytaniach.</strong> Każda przypisana usługa zostaje
                    w historii i buduje obraz, którego nie da się odtworzyć wstecz: na czym studio
                    zarabia, które usługi i które auta domykają się najczęściej, ile warta jest szybka
                    odpowiedź. Zestawienia pojawią się po kilku miesiącach pracy z modułem, kiedy
                    danych będzie dość, żeby widać było powtarzalne schematy, a nie pojedyncze zlecenia.
                </ServicesNote>

                <SummaryLink type="button" onClick={onOpenSummary}>
                    Podsumowanie miesiąca <ArrowRight />
                </SummaryLink>
            </Body>
        </Shell>
    );
}
