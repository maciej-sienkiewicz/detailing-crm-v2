// src/modules/comms/components/analytics/charts.tsx
// Elementy, z których złożona jest analityka leadów.
//
// Reguły wspólne dla wszystkich:
//
// • Odpowiedź przed dowodem. Każda karta zaczyna się od zdania po polsku, a wykres
//   pod nim to zdanie uzasadnia. Sam wykres zostawia właścicielowi pracę, którą to
//   narzędzie ma z niego zdjąć.
// • Kolor nigdy nie niesie znaczenia sam. Każdy segment ma podpis obok, więc wykres
//   działa też dla kogoś, kto nie rozróżnia tych barw, i po wydrukowaniu.
// • Jedna skala na wykres. Dwie osi Y na jednym rysunku dobiera się arbitralnie
//   i produkują korelację, której w danych nie ma — dlatego „ile zapytań" i „jaka
//   skuteczność" stoją pod sobą jako dwa osobne rysunki, a nie jeden z dwiema osiami.
// • Cienkie znaki, zaokrąglone końce, wygaszona siatka. Grube nasycone bloki krzyczą.
import { Fragment, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { LOST, MAGNITUDE, MUTED_COLUMN, OPEN, TRACK, WON, percent } from './tokens';

// ── Karta z pytaniem i odpowiedzią ──────────────────────────────────────────

/** Ta sama karta co w module statystyk — użytkownik ma czuć jedną aplikację. */
const CardBox = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 22px 24px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    ${cardEntrance}

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 18px 16px;
    }
`;

const CardHead = styled.header`
    display: flex;
    flex-direction: column;
    gap: 4px;

    h3 {
        margin: 0;
        font-size: ${st.fontXs};
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: ${st.textMuted};
    }

    /* Odpowiedź, nie podtytuł: to jest treść karty, wykres jest przypisem. */
    p {
        margin: 0;
        font-size: 15px;
        line-height: 1.45;
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
    }

    strong { font-weight: ${p => p.theme.fontWeights.bold}; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
`;

interface AnalyticsCardProps {
    question: string;
    answer: ReactNode;
    /** Druga odpowiedź, która mieści się w zdaniu i nie zasługuje na własny rysunek. */
    footnote?: ReactNode;
    children?: ReactNode;
    className?: string;
}

export function AnalyticsCard({ question, answer, footnote, children, className }: AnalyticsCardProps) {
    return (
        <CardBox className={className}>
            <CardHead>
                <h3>{question}</h3>
                <p>{answer}</p>
                {footnote && <Hint>{footnote}</Hint>}
            </CardHead>
            {children}
        </CardBox>
    );
}

export function EmptyChart({ children }: { children: ReactNode }) {
    return <Hint>{children}</Hint>;
}

// ── Kolumny (rytm tygodnia, dnia miesiąca, trend) ───────────────────────────

const ColumnsFrame = styled.div`
    position: relative;
`;

const ColumnsRow = styled.div<{ $height: number }>`
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: ${p => p.$height}px;
    /* Wygaszona linia podstawy — oś ma być obecna, nie widoczna. */
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const ColumnSlot = styled.div`
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
    cursor: default;
`;

const ColumnMark = styled.div<{ $color: string }>`
    width: 100%;
    /* Górny limit szerokości: przy siedmiu kolumnach na całą kartę słupek robi
       się blokiem szerokim na sto pikseli, a taki wykres czyta się jak plakat,
       nie jak dane. Wąski znak plus powietrze wokół — nie odwrotnie. */
    max-width: 34px;
    margin: 0 auto;
    background: ${p => p.$color};
    /* Zaokrąglony tylko szczyt: dół jest przyklejony do osi i zaokrąglenie
       odklejałoby go od zera, czyli kłamało o wartości. */
    border-radius: 4px 4px 0 0;
    transition: filter ${p => p.theme.transitions.fast};

    ${ColumnSlot}:hover & { filter: brightness(0.88); }
`;

const TicksRow = styled.div`
    display: flex;
    gap: 2px;
    margin-top: 6px;
    font-size: 10.5px;
    color: ${p => p.theme.colors.textMuted};

    span {
        flex: 1 1 0;
        min-width: 0;
        text-align: center;
        overflow: hidden;
        white-space: nowrap;
    }
`;

const Tooltip = styled.div`
    position: absolute;
    top: -6px;
    transform: translate(-50%, -100%);
    background: ${p => p.theme.colors.text};
    color: #fff;
    font-size: 11.5px;
    line-height: 1.35;
    padding: 5px 8px;
    border-radius: ${p => p.theme.radii.sm};
    white-space: nowrap;
    pointer-events: none;
    z-index: 2;
`;

export interface Column {
    key: string;
    tick: string;
    value: number;
    /** Pełny opis do podpowiedzi — „poniedziałek: 14 zapytań". */
    caption: string;
    /** Wyróżniona kolumna niesie odpowiedź; reszta jest dla niej tłem. */
    highlighted?: boolean;
}

interface ColumnChartProps {
    columns: Column[];
    height?: number;
    /** Co ile kolumn podpisywać oś — przy 31 dniach każdy podpis to kasza. */
    tickEvery?: number;
    color?: string;
}

/**
 * Kolumny jednej serii. Wyróżnienie zamiast palety: wykres odpowiada na pytanie
 * „który dzień", więc jedna kolumna jest odpowiedzią, a pozostałe są miarą, o ile
 * wygrywa. Osiem kolorów tam, gdzie treścią jest jedna wartość, to najczęstszy
 * sposób, w jaki wykres mija się ze swoim celem.
 */
export function ColumnChart({ columns, height = 120, tickEvery = 1, color }: ColumnChartProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const max = Math.max(1, ...columns.map(c => c.value));
    /*
     * Wygaszenie ma sens tylko wtedy, gdy jest co wyróżnić. Wykres bez wskazanej
     * kolumny (trend) to jedna seria i cała idzie pełnym kolorem — inaczej
     * wyglądałby na wyblakłe tło czekające na treść, która nigdy nie przyjdzie.
     */
    const hasHighlight = columns.some(c => c.highlighted);

    return (
        <ColumnsFrame>
            {hovered !== null && (
                <Tooltip style={{ left: `${((hovered + 0.5) / columns.length) * 100}%` }}>
                    {columns[hovered].caption}
                </Tooltip>
            )}
            <ColumnsRow $height={height}>
                {columns.map((column, index) => (
                    <ColumnSlot
                        key={column.key}
                        title={column.caption}
                        onMouseEnter={() => setHovered(index)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <ColumnMark
                            $color={
                                color ?? (!hasHighlight || column.highlighted ? MAGNITUDE : MUTED_COLUMN)
                            }
                            style={{
                                // Minimum 2px: zero ma zostać zerem, ale jedno zapytanie
                                // przy maksimum czterdziestu musi być widoczne.
                                height: column.value === 0 ? 0 : `${Math.max(2, (column.value / max) * 100)}%`,
                            }}
                        />
                    </ColumnSlot>
                ))}
            </ColumnsRow>
            <TicksRow>
                {columns.map((column, index) => (
                    <span key={column.key}>{index % tickEvery === 0 ? column.tick : ''}</span>
                ))}
            </TicksRow>
        </ColumnsFrame>
    );
}

// ── Punkty skuteczności w czasie ────────────────────────────────────────────

const RateFrame = styled.div`
    position: relative;
`;

/**
 * Pole rysunku o jawnej wysokości. Bez niej SVG z preserveAspectRatio="none"
 * dostaje wysokość z proporcji viewBoxa i przy szerokości 900 px urósłby do
 * kilkuset — a znaczniki, ustawiane procentowo względem tego pola, rozjechałyby
 * się razem z nim.
 */
const RatePlot = styled.div<{ $height: number }>`
    position: relative;
    height: ${p => p.$height}px;

    svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
    }
`;

const RateLabel = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: ${st.textMuted};
    margin-bottom: 4px;

    /* Podpis skali stoi przy górnej linii odniesienia, bo to ona znaczy 100%. */
    span:last-child { font-variant-numeric: tabular-nums; }
`;

interface RateLineProps {
    points: { key: string; rate: number | null; caption: string }[];
    height?: number;
}

/**
 * Skuteczność w czasie jako osobny rysunek pod kolumnami zapytań, nie jako druga
 * oś na tym samym. Dwie skale na jednym wykresie dobiera się arbitralnie i tworzą
 * zależność, której w danych nie ma.
 *
 * Okresy bez rozstrzygnięcia zostają dziurą w linii, a nie zerem: „nikt jeszcze
 * nie zdecydował" i „nikt się nie zdecydował" to dwie różne rzeczy.
 */
export function RateLine({ points, height = 56 }: RateLineProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const width = 100;
    const step = points.length > 1 ? width / (points.length - 1) : 0;
    const y = (rate: number) => height - rate * height;

    const segments: string[] = [];
    let current: string[] = [];
    points.forEach((point, index) => {
        if (point.rate === null) {
            if (current.length > 1) segments.push(current.join(' '));
            current = [];
            return;
        }
        current.push(`${index * step},${y(point.rate)}`);
    });
    if (current.length > 1) segments.push(current.join(' '));

    return (
        <RateFrame>
            <RateLabel><span>Skuteczność</span><span>100%</span></RateLabel>

            {hovered !== null && (
                <Tooltip style={{ left: `${(hovered / Math.max(1, points.length - 1)) * 100}%`, top: 18 }}>
                    {points[hovered].caption}
                </Tooltip>
            )}
            <RatePlot $height={height}>
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
                    {/* Dwie linie odniesienia: 100% u góry i 0% u dołu. Bez górnej
                        podpis „100%" nie ma się o co zaczepić i wysokość punktu
                        pozostaje nie do odczytania. */}
                    <line x1="0" y1="0.5" x2={width} y2="0.5" stroke={st.border} strokeWidth="1"
                          vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={st.border}
                          strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke={st.border}
                          strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    {segments.map((segment) => (
                        <polyline
                            key={segment}
                            points={segment}
                            fill="none"
                            stroke={WON}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>
                {/* Znaczniki poza SVG: przy preserveAspectRatio="none" koło narysowane
                    w układzie wykresu wyszłoby elipsą rozciągniętą razem z osią X. */}
                {points.map((point, index) => point.rate === null ? null : (
                    <Marker
                        key={point.key}
                        title={point.caption}
                        onMouseEnter={() => setHovered(index)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            left: `${(index / Math.max(1, points.length - 1)) * 100}%`,
                            top: `${(y(point.rate) / height) * 100}%`,
                        }}
                    />
                ))}
            </RatePlot>
        </RateFrame>
    );
}

const Marker = styled.span`
    position: absolute;
    width: 9px;
    height: 9px;
    margin: -4.5px 0 0 -4.5px;
    border-radius: 50%;
    background: ${WON};
    /* Pierścień w kolorze tła oddziela znacznik od linii, gdy oba się nakładają. */
    box-shadow: 0 0 0 2px ${p => p.theme.colors.surface};
    cursor: default;
`;

// ── Poziome słupki rankingowe ───────────────────────────────────────────────

const BarRow = styled.div`
    display: grid;
    grid-template-columns: minmax(90px, 150px) minmax(0, 1fr) minmax(64px, auto);
    align-items: center;
    gap: 10px;
    padding: 4px 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${p => p.theme.colors.text};
    }
    .meta {
        text-align: right;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: minmax(72px, 1fr) minmax(0, 1.4fr) auto;
        gap: 8px;
        font-size: 12.5px;
    }
`;

const Track = styled.div`
    background: ${TRACK};
    border-radius: ${p => p.theme.radii.sm};
    height: 10px;
    overflow: hidden;
`;

const Fill = styled.div<{ $color: string }>`
    height: 100%;
    background: ${p => p.$color};
    border-radius: ${p => p.theme.radii.sm};
`;

interface RankedBarsProps {
    rows: { key: string; label: string; value: number; meta: string }[];
    color?: string;
}

export function RankedBars({ rows, color = MAGNITUDE }: RankedBarsProps) {
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
        <div>
            {rows.map((row) => (
                <BarRow key={row.key}>
                    <span className="name" title={row.label}>{row.label}</span>
                    <Track>
                        <Fill $color={color} style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
                    </Track>
                    <span className="meta">{row.meta}</span>
                </BarRow>
            ))}
        </div>
    );
}

// ── Wygrane kontra przegrane ────────────────────────────────────────────────

const SplitTrack = styled.div`
    display: flex;
    /* Dwa piksele tła między segmentami: bez szczeliny granica gubi się w miejscu,
       w którym siedzi cała treść tego paska. */
    gap: 2px;
    height: 10px;
`;

const Segment = styled.div<{ $color: string }>`
    background: ${p => p.$color};
    border-radius: ${p => p.theme.radii.sm};
    min-width: 0;
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};

    span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    i {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        display: inline-block;
    }
`;

export function WinLossLegend() {
    return (
        <Legend>
            <span><i style={{ background: WON }} /> wygrane</span>
            <span><i style={{ background: LOST }} /> przegrane</span>
            <span><i style={{ background: OPEN }} /> w toku</span>
        </Legend>
    );
}

interface WinLossBarsProps {
    rows: {
        key: string;
        label: string;
        won: number;
        lost: number;
        open: number;
        winRate: number | null;
    }[];
}

/**
 * Wygrane i przegrane na jednym pasku, w skali wspólnej dla wszystkich wierszy —
 * inaczej temat z trzema zapytaniami wyglądałby na równie ważny co ten z pięćdziesięcioma.
 *
 * Skuteczność stoi liczbą z prawej, bo z samych długości nie da się jej odczytać,
 * a to ona jest odpowiedzią na pytanie „w czym wygrywamy".
 */
export function WinLossBars({ rows }: WinLossBarsProps) {
    const max = Math.max(1, ...rows.map(r => r.won + r.lost + r.open));
    return (
        <div>
            {rows.map((row) => {
                const total = row.won + row.lost + row.open;
                const scale = (value: number) => `${(value / max) * 100}%`;
                return (
                    <BarRow key={row.key}>
                        <span className="name" title={row.label}>{row.label}</span>
                        <SplitTrack
                            title={`${row.label}: ${row.won} wygranych, ${row.lost} przegranych, ${row.open} w toku`}
                            style={{ width: total === 0 ? 0 : undefined }}
                        >
                            {row.won > 0 && <Segment $color={WON} style={{ width: scale(row.won) }} />}
                            {row.lost > 0 && <Segment $color={LOST} style={{ width: scale(row.lost) }} />}
                            {row.open > 0 && <Segment $color={OPEN} style={{ width: scale(row.open) }} />}
                        </SplitTrack>
                        <span className="meta">{percent(row.winRate)}</span>
                    </BarRow>
                );
            })}
        </div>
    );
}

// ── Macierz: usługa × dzień tygodnia ────────────────────────────────────────

const MatrixGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(120px, 200px) repeat(7, minmax(0, 1fr)) minmax(84px, auto);
    gap: 3px;
    align-items: center;
    min-width: 620px;
`;

const MatrixScroll = styled.div`
    overflow-x: auto;
    /* Macierz nie skaluje się w dół bez utraty czytelności — siedem kolumn poniżej
       620px daje kratki, w których nie mieści się liczba. Na telefonie przewija
       się w bok, tak jak tabela. */
    margin: 0 -4px;
    padding: 0 4px;
`;

const MatrixHead = styled.span`
    font-size: 10.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${st.textMuted};
    text-align: center;
    padding-bottom: 4px;
`;

const MatrixRowLabel = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    padding-right: 10px;

    .name {
        font-size: 12.5px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${st.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .avg {
        font-size: 11px;
        color: ${st.textMuted};
        font-variant-numeric: tabular-nums;
    }
`;

/**
 * Komórka macierzy. Nasycenie jednego odcienia niesie liczbę — ramp sekwencyjny,
 * bo to jest wielkość, a nie tożsamość. Liczba stoi w środku, więc kolor nigdy
 * nie jest jedynym nośnikiem: macierz da się przeczytać po wydrukowaniu na
 * czarno-białej drukarce i przez kogoś, kto tych odcieni nie rozróżnia.
 */
const MatrixCell = styled.div<{ $intensity: number }>`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 38px;
    border-radius: 6px;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    background: ${p => (p.$intensity === 0
        ? st.bgCardAlt
        : `rgba(37, 99, 235, ${0.10 + p.$intensity * 0.72})`)};
    color: ${p => (p.$intensity > 0.55 ? '#fff' : p.$intensity === 0 ? st.textMuted : st.text)};
    font-weight: ${p => (p.$intensity > 0.55 ? 700 : 500)};
    cursor: default;
    transition: transform 140ms ease;

    &:hover { transform: scale(1.06); }
`;

const MatrixTotal = styled.span`
    text-align: right;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: ${st.textSecondary};
    padding-left: 8px;
    white-space: nowrap;
`;

const MatrixScale = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: ${st.textMuted};

    i {
        display: inline-block;
        width: 46px;
        height: 9px;
        border-radius: 5px;
        background: linear-gradient(90deg, rgba(37, 99, 235, 0.10), rgba(37, 99, 235, 0.82));
    }
`;

export interface MatrixRow {
    key: string;
    label: string;
    /** Podpis pod nazwą — u nas średnia wycena. */
    note: string;
    counts: number[];
    total: number;
}

interface WeekdayMatrixProps {
    rows: MatrixRow[];
    dayLabels: string[];
    /** Nazwa jednostki do podpowiedzi: „3 zapytania w sobotę, Powłoka ceramiczna". */
    describeCell: (row: MatrixRow, dayIndex: number, count: number) => string;
}

export function WeekdayMatrix({ rows, dayLabels, describeCell }: WeekdayMatrixProps) {
    // Skala wspólna dla całej macierzy: gdyby każdy wiersz normalizował się osobno,
    // usługa z trzema zapytaniami świeciłaby tak samo mocno jak ta z trzydziestoma.
    const max = Math.max(1, ...rows.flatMap(row => row.counts));

    return (
        <>
            <MatrixScroll>
                <MatrixGrid>
                    <span />
                    {dayLabels.map(day => <MatrixHead key={day}>{day}</MatrixHead>)}
                    <MatrixHead style={{ textAlign: 'right' }}>Razem</MatrixHead>

                    {rows.map(row => (
                        <Fragment key={row.key}>
                            <MatrixRowLabel>
                                <span className="name" title={row.label}>{row.label}</span>
                                <span className="avg">{row.note}</span>
                            </MatrixRowLabel>
                            {row.counts.map((count, index) => (
                                <MatrixCell
                                    key={dayLabels[index]}
                                    $intensity={count / max}
                                    title={describeCell(row, index, count)}
                                >
                                    {count > 0 ? count : ''}
                                </MatrixCell>
                            ))}
                            <MatrixTotal>{row.total}</MatrixTotal>
                        </Fragment>
                    ))}
                </MatrixGrid>
            </MatrixScroll>
            <MatrixScale>
                <span>mniej</span><i /><span>więcej zapytań</span>
            </MatrixScale>
        </>
    );
}

// ── Pieniądze w czasie ──────────────────────────────────────────────────────

const StackSlot = styled.div`
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 2px;
    cursor: default;
    max-width: 46px;
    margin: 0 auto;
`;

/**
 * Kawałek słupka. Zaokrąglenie tylko na skrajnych narożnikach całego stosu —
 * przy zaokrągleniu każdego kawałka z osobna trzy segmenty czytają się jak trzy
 * osobne pastylki wiszące jedna nad drugą, a nie jak jeden słupek podzielony
 * na części. Szczelina 2px zostaje: bez niej granica gubi się dokładnie tam,
 * gdzie siedzi treść.
 */
const StackPiece = styled.div<{ $kind: 'won' | 'open' | 'lost'; $top: boolean; $bottom: boolean }>`
    width: 100%;
    border-radius: ${p => `${p.$top ? '5px 5px' : '0 0'} ${p.$bottom ? '5px 5px' : '0 0'}`};
    background: ${p => (p.$kind === 'won'
        ? `linear-gradient(180deg, #3b82f6 0%, ${WON} 100%)`
        : p.$kind === 'open'
            ? `linear-gradient(180deg, #dbe3ee 0%, ${OPEN} 100%)`
            : 'transparent')};
    border: ${p => (p.$kind === 'lost' ? `1px solid ${LOST}66` : 'none')};
    ${p => p.$kind === 'lost' && `background: repeating-linear-gradient(135deg, ${LOST}0d, ${LOST}0d 5px, ${LOST}26 5px, ${LOST}26 8px);`}
`;

/**
 * Legenda słupków pieniędzy — własna, nie ta od wykresu usług.
 *
 * Legenda musi wyglądać jak znak, który opisuje. Tam segment straty jest pełną
 * czerwienią, tutaj pustym konturem ze szrafurą, więc jedna legenda dla obu
 * kłamałaby o jednym z nich. Nazwy te same co w rachunku wyżej.
 */
export function MoneyLegend() {
    return (
        <Legend>
            <span><i style={{ background: `linear-gradient(180deg, #3b82f6, ${WON})` }} /> zatrzymane</span>
            <span><i style={{ background: OPEN }} /> w grze</span>
            <span>
                <i style={{
                    background: `repeating-linear-gradient(135deg, ${LOST}0d, ${LOST}0d 3px, ${LOST}40 3px, ${LOST}40 5px)`,
                    border: `1px solid ${LOST}66`,
                }} /> stracone
            </span>
        </Legend>
    );
}

export interface MoneyColumn {
    key: string;
    tick: string;
    won: number;
    open: number;
    lost: number;
    caption: string;
}

interface MoneyColumnsProps {
    columns: MoneyColumn[];
    height?: number;
    tickEvery?: number;
}

/**
 * Pieniądze okresu, ułożone tak samo jak w rachunku zapytań: zatrzymane na dole,
 * w grze pośrodku, stracone na górze. Wysokość słupka to wartość wszystkich
 * zapytań danego okresu.
 *
 * Świadomie nie liczba zapytań. Czternaście pytań o mycie i trzy o folię to ta
 * sama liczba i zupełnie inny miesiąc — sztuki mierzą ruch, a ruch sam w sobie
 * nie jest ani przychodem, ani problemem. Ten sam podział kolorów co w belce
 * wyżej znaczy, że nie trzeba się go uczyć drugi raz.
 */
export function MoneyColumns({ columns, height = 170, tickEvery = 1 }: MoneyColumnsProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const max = Math.max(1, ...columns.map(c => c.won + c.open + c.lost));
    // Minimum trzech pikseli na niezerowy kawałek: kwota, która jest, musi być
    // widoczna, ale zero ma zostać zerem.
    const piece = (value: number) => (value === 0 ? 0 : Math.max(3, (value / max) * height));

    return (
        <ColumnsFrame>
            {hovered !== null && (
                <Tooltip style={{ left: `${((hovered + 0.5) / columns.length) * 100}%` }}>
                    {columns[hovered].caption}
                </Tooltip>
            )}
            <ColumnsRow $height={height}>
                {columns.map((column, index) => (
                    <StackSlot
                        key={column.key}
                        title={column.caption}
                        onMouseEnter={() => setHovered(index)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {/* Kolejność od góry: stracone, w grze, zatrzymane — tak samo
                            jak w belce rachunku, tylko pionowo. */}
                        {column.lost > 0 && (
                            <StackPiece
                                $kind="lost"
                                $top
                                $bottom={column.open === 0 && column.won === 0}
                                style={{ height: piece(column.lost) }}
                            />
                        )}
                        {column.open > 0 && (
                            <StackPiece
                                $kind="open"
                                $top={column.lost === 0}
                                $bottom={column.won === 0}
                                style={{ height: piece(column.open) }}
                            />
                        )}
                        {column.won > 0 && (
                            <StackPiece
                                $kind="won"
                                $top={column.lost === 0 && column.open === 0}
                                $bottom
                                style={{ height: piece(column.won) }}
                            />
                        )}
                    </StackSlot>
                ))}
            </ColumnsRow>
            <TicksRow>
                {columns.map((column, index) => (
                    <span key={column.key}>{index % tickEvery === 0 ? column.tick : ''}</span>
                ))}
            </TicksRow>
        </ColumnsFrame>
    );
}
