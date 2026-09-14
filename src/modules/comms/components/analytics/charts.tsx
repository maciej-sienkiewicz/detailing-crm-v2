// src/modules/comms/components/analytics/charts.tsx
// Elementy analityki leadów po odchudzeniu do „rachunku pieniędzy":
//   • karta pytanie → odpowiedź (zdanie po polsku, dowód pod spodem),
//   • poziomy ranking magnitudy (skąd przychodzą zapytania),
//   • jeden prawdziwy wykres: zamknięte pieniądze miesiąc po miesiącu.
//
// Świadomie NIE ma tu już macierzy dni tygodnia, słupków wygrane/przegrane po
// usłudze i segmencie auta, linii skuteczności ani wykresu liczby zapytań. Przy
// sześćdziesięciu–stu zapytaniach miesięcznie i rozrzucie cen od 300 do 10 000 zł
// były to wykresy szumu z podpisem sugerującym prawidłowość - a nie dane, na
// których właściciel podejmuje decyzję.
import type { ReactNode } from 'react';
import styled from 'styled-components';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { MAGNITUDE, TRACK, WON, formatMoney } from './tokens';

// ── Karta z pytaniem i odpowiedzią ──────────────────────────────────────────

/** Ta sama karta co w module statystyk - użytkownik ma czuć jedną aplikację. */
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
        color: ${st.textSecondary};
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

/*
 * `&&` podbija swoistość: w nagłówku karty stoi reguła `CardHead p`, która jest
 * bardziej swoista niż zwykła klasa i nadpisywała przypisowi rozmiar oraz kolor
 * odpowiedzi. Przypis, który wygląda jak odpowiedź, przestaje być przypisem.
 */
const Hint = styled.p`
    && {
        margin: 0;
        font-size: 12.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${st.textSecondary};
    }
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

// ── Poziome słupki rankingowe (skąd przychodzą zapytania) ────────────────────

const BarRow = styled.div`
    display: grid;
    grid-template-columns: minmax(90px, 150px) minmax(0, 1fr) minmax(64px, auto);
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    .name {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .meta {
        text-align: right;
        color: ${p => p.theme.colors.textSecondary};
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

// ── Jedyny prawdziwy wykres: wartość zapytań przez cały rok ──────────────────
//
// Recharts w jasnej skórce modułu statystyk: jedna linia, jedna oś, hairline'owa
// siatka (ciągła, nie kreskowana - kreska czyta się jak próg albo prognoza).
// Zawsze pełny rok (styczeń–grudzień); miesiące jeszcze nieprzeżyte są dziurą
// w linii (null), nie zerem - „nic nie przyszło" i „miesiąc nie nadszedł" to
// dwie różne rzeczy. Bez drugiej osi i bez linii skuteczności.

/** Oś Y w tysiącach złotych: „13 tys." zamiast „12 580 zł" - kwota na osi ma być skalą, nie treścią. */
const axisMoney = (grosze: number): string => {
    const zl = grosze / 100;
    if (zl >= 1000) return `${Math.round(zl / 1000)} tys.`;
    return `${Math.round(zl)}`;
};

interface WonTooltipProps {
    active?: boolean;
    payload?: { value?: number }[];
    label?: string | number;
}

function WonTooltip({ active, payload, label }: WonTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: '#FFFFFF',
                border: `1px solid ${st.border}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                boxShadow: st.shadowMd,
                pointerEvents: 'none',
            }}
        >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: st.textSecondary, marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontWeight: 700, color: st.text, fontSize: 15 }}>
                {formatMoney(payload[0].value ?? 0)}
            </div>
        </div>
    );
}

export interface YearPoint {
    /** Skrót miesiąca na osi: „sty", „lut", … */
    period: string;
    /** Wartość zapytań, które przyszły w tym miesiącu; null dla miesięcy, które jeszcze nie nadeszły. */
    value: number | null;
}

export function YearLineChart({ points }: { points: YearPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={st.border} vertical={false} />
                <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: st.textSecondary }}
                    tickLine={false}
                    axisLine={{ stroke: st.border }}
                    interval={0}
                    minTickGap={0}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: st.textSecondary }}
                    tickLine={false}
                    axisLine={false}
                    /* Na tyle szeroko, żeby „340 tys." zmieściło się w JEDNEJ linii -
                       przy węższej osi Recharts łamał etykietę na „340" i „tys.". */
                    width={64}
                    allowDecimals={false}
                    tickFormatter={axisMoney}
                />
                <Tooltip cursor={{ stroke: st.border, strokeWidth: 1 }} content={<WonTooltip />} />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={WON}
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 3, fill: WON, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                    animationDuration={700}
                    animationEasing="ease-out"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
