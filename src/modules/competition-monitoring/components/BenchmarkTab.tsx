import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
    ArrowDownRight, ArrowUpRight, ExternalLink, FileText, Flame, Pause,
    Sparkles, Star, TrendingDown, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Benchmark, BenchmarkRow, PulseEventKind } from '../types';
import { PROFILE_COLORS } from '../types';
import { usePulse } from '../hooks/useAnalytics';
import { Card, CardTitle, CardHint, MetricCell, Pill, SelfTag, Spinner, formatNumber } from './MetricBits';
import { WeekExplainPanel } from './WeekExplainPanel';

/**
 * Porównanie: jedna tabela z pełnym kontekstem (delty + "typowe studio")
 * i dokładnie dwa wykresy z adnotacjami zdarzeń zamiast czterech zakładek
 * z akapitami tłumaczeń.
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// ─── Tabela ───────────────────────────────────────────────────────────────────

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;

    th {
        text-align: left;
        font-size: ${st.fontXs};
        font-weight: 700;
        color: ${st.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 8px 12px;
        border-bottom: 1px solid ${st.border};
        white-space: nowrap;
    }

    td {
        padding: 14px 12px;
        border-bottom: 1px solid ${st.border};
        vertical-align: top;
        font-size: ${st.fontSm};
        color: ${st.text};
    }

    tbody tr:last-child td { border-bottom: none; }
`;

const ProfileRow = styled.tr<{ $self: boolean; $selected: boolean }>`
    cursor: pointer;
    background: ${p => (p.$self ? st.bgAccentBlue : p.$selected ? st.bgCardAlt : 'transparent')};
    transition: background ${st.transition};

    &:hover { background: ${p => (p.$self ? st.bgAccentBlue : st.bgCardAlt)}; }
`;

const UserCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    white-space: nowrap;
`;

const ColorDot = styled.span<{ $color: string; $muted: boolean }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => (p.$muted ? st.border : p.$color)};
    flex-shrink: 0;
`;

const ErrorTag = styled.span`
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    background: ${st.accentRedDim};
    border-radius: ${st.radiusFull};
    padding: 2px 8px;
    font-weight: 700;
`;

const MixBar = styled.div`
    display: flex;
    width: 96px;
    height: 8px;
    border-radius: ${st.radiusFull};
    overflow: hidden;
    background: ${st.bgCardAlt};
    margin-bottom: 4px;
`;

const MixSeg = styled.span<{ $w: number; $c: string }>`
    width: ${p => p.$w}%;
    background: ${p => p.$c};
`;

const SubNote = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

// ─── Wykresy ──────────────────────────────────────────────────────────────────

const ChartsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const HintNote = styled.p`
    margin: 8px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const TooltipBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd};
    padding: 10px 12px;
    font-size: ${st.fontSm};
    color: ${st.text};
`;

// ─── Nagłówek wykresu przyrostu ──────────────────────────────────────────────

const ChartHeadRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 4px;
`;

const HeadStat = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};

    strong { color: ${st.text}; font-weight: 700; }
`;

const ModeSwitch = styled.div`
    margin-left: auto;
    display: flex;
    gap: 6px;
`;

const WindowNote = styled.p`
    margin: 6px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const WindowWarning = styled.p`
    margin: 6px 0 0;
    padding: 7px 10px;
    font-size: ${st.fontXs};
    color: ${st.text};
    background: ${st.accentAmberDim};
    border-left: 2px solid ${st.accentAmber};
    border-radius: ${st.radiusSm};
    line-height: 1.5;
`;

// ─── Puls konkurencji ────────────────────────────────────────────────────────

const PulseHead = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
`;

const PulseMeta = styled.span`
    margin-left: auto;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const PulseList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
`;

const PulseRow = styled.div<{ $self: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 11px 13px;
    border: 1px solid ${p => (p.$self ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${p => (p.$self ? st.bgAccentBlue : st.bgCard)};
`;

const TONE_COLOR = {
    good: st.accentGreen,
    warn: st.accentAmber,
    bad: st.accentRed,
    neutral: st.accentBlue,
} as const;

const TONE_BG = {
    good: st.accentGreenDim,
    warn: st.accentAmberDim,
    bad: st.accentRedDim,
    neutral: st.accentBlueDim,
} as const;

const PulseIcon = styled.span<{ $tone: keyof typeof TONE_COLOR }>`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: ${p => TONE_COLOR[p.$tone]};
    background: ${p => TONE_BG[p.$tone]};
`;

const PulseBody = styled.div`
    min-width: 0;
    flex: 1;
`;

const PulseHeadline = styled.div`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const PulseDetail = styled.div`
    margin-top: 2px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const PulseLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    text-decoration: none;

    &:hover { text-decoration: underline; }
`;

const PulseDate = styled.span`
    flex-shrink: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    padding-top: 2px;
`;

const PulseFootnote = styled.p`
    margin: 12px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    line-height: 1.5;
`;

const MAX_CHART_PROFILES = 4;

const formatWeekTick = (weekStart: string) =>
    new Date(weekStart).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

const formatDayShort = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

const daysBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Mediana — używana i do linii odniesienia, i do odpornego punktu bazowego. */
const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

type GrowthMode = 'absolute' | 'relative';

interface GrowthTotal {
    profileId: string;
    username: string;
    isSelf: boolean;
    /** Przyrost obserwujących od wspólnego punktu zerowego, w sztukach. */
    gain: number;
}

interface GrowthData {
    rows: Record<string, number | string>[];
    /** Wspólny dzień startu wszystkich zaznaczonych profili. */
    baselineDate: string | null;
    /** Profil, który skraca okno porównania, bo obserwujemy go najkrócej. */
    limiter: { username: string; gainedDays: number } | null;
    totals: GrowthTotal[];
}

interface GrowthHeadline {
    rank: number;
    total: number;
    self: GrowthTotal;
    leader: GrowthTotal | null;
    multiple: number | null;
    gap: number;
}

type PulseTone = 'good' | 'warn' | 'bad' | 'neutral';

/**
 * Kolor niesie znaczenie: zielony to Twój dobry wynik, czerwony Twój problem,
 * bursztynowy to ruch u konkurencji wart uwagi, niebieski to zwykła informacja.
 */
const PULSE_STYLE: Record<PulseEventKind, { icon: LucideIcon; tone: PulseTone }> = {
    YOUR_POST: { icon: FileText, tone: 'neutral' },
    YOUR_SILENCE: { icon: Pause, tone: 'bad' },
    FOLLOWER_SPIKE: { icon: ArrowUpRight, tone: 'good' },
    FOLLOWER_DROP: { icon: ArrowDownRight, tone: 'bad' },
    ACCELERATION: { icon: TrendingUp, tone: 'warn' },
    STANDOUT_POST: { icon: Flame, tone: 'warn' },
    NEW_TOPIC: { icon: Sparkles, tone: 'warn' },
    SLOWDOWN: { icon: TrendingDown, tone: 'neutral' },
};

export const BenchmarkTab: React.FC<{ benchmark: Benchmark }> = ({ benchmark }) => {
    // Na wykresach: self + pierwsi konkurenci (klik w wiersz tabeli zmienia wybór)
    const defaultSelection = useMemo(() => {
        const ordered = [...benchmark.rows].sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
        return ordered.slice(0, MAX_CHART_PROFILES).map(r => r.profileId);
    }, [benchmark.rows]);

    const [selected, setSelected] = useState<string[]>(defaultSelection);
    /** Kliknięty słupek przyrostu obserwujących → panel wyjaśnienia tygodnia. */
    const [explain, setExplain] = useState<{ profileId: string; weekStart: string } | null>(null);

    const toggleProfile = (profileId: string) => {
        setSelected(prev => {
            if (prev.includes(profileId)) return prev.filter(id => id !== profileId);
            if (prev.length >= MAX_CHART_PROFILES) return [...prev.slice(1), profileId];
            return [...prev, profileId];
        });
    };

    const colorFor = useMemo(() => {
        const map = new Map<string, string>();
        benchmark.rows.forEach((row, index) => {
            map.set(row.profileId, PROFILE_COLORS[index % PROFILE_COLORS.length]);
        });
        return (profileId: string) => map.get(profileId) ?? st.accentBlue;
    }, [benchmark.rows]);

    const usernameFor = useMemo(() => {
        const map = new Map(benchmark.rows.map(r => [r.profileId, r.username]));
        return (profileId: string | null) => (profileId ? map.get(profileId) ?? '' : '');
    }, [benchmark.rows]);

    const activityData = useMemo(
        () =>
            benchmark.weekly.map(point => {
                const row: Record<string, number | string> = { weekStart: point.weekStart };
                selected.forEach(profileId => {
                    row[`p_${profileId}`] = point.values[profileId]?.posts ?? 0;
                    row[`e_${profileId}`] = point.values[profileId]?.engagement ?? 0;
                });
                return row;
            }),
        [benchmark.weekly, selected]
    );

    // ── Przyrost obserwujących: linie skumulowane od wspólnego zera ───────────
    //
    // Liczymy PRZYROST BEZWZGLĘDNY, nie procentowy: przy dwóch profilach o różnej
    // wielkości ten sam procent oznacza zupełnie inną liczbę realnych ludzi, a to
    // o ludzi toczy się gra na lokalnym rynku. Procent zostaje jako drugi tryb,
    // bo odpowiada na inne pytanie — czy moja robota jest skuteczna.
    //
    // Punkt zerowy jest WSPÓLNY dla wszystkich zaznaczonych profili: to najpóźniejszy
    // start danych w tej grupie. Dzięki temu każda linia startuje z zera tego samego
    // dnia i porównanie jest uczciwe. Profil dodany później skraca okno — mówimy
    // o tym wprost i podpowiadamy, że można go odznaczyć w tabeli.
    const [growthMode, setGrowthMode] = useState<GrowthMode>('absolute');

    const growth = useMemo<GrowthData>(() => {
        const series = benchmark.followers
            .filter(s => selected.includes(s.profileId))
            .map(s => ({ ...s, measured: s.points.filter(p => p.count !== null) }))
            .filter(s => s.measured.length > 0);

        if (series.length === 0) {
            return { rows: [], baselineDate: null, limiter: null, totals: [] };
        }

        // Wspólne zero = najpóźniejszy pierwszy pomiar wśród zaznaczonych.
        const starts = series.map(s => ({ series: s, start: s.measured[0].date }));
        const sortedStarts = [...starts].sort((a, b) => b.start.localeCompare(a.start));
        const baselineDate = sortedStarts[0].start;
        const limiter = sortedStarts.length > 1 && sortedStarts[0].start !== sortedStarts[1].start
            ? { username: sortedStarts[0].series.username, gainedDays: daysBetween(sortedStarts[1].start, baselineDate) }
            : null;

        // Punkt bazowy z mediany pierwszych trzech pomiarów — pojedynczy błędny
        // odczyt na starcie przesunąłby inaczej całą linię przez cały okres.
        const baselines = new Map<string, number>();
        series.forEach(s => {
            const head = s.measured.filter(p => p.date >= baselineDate).slice(0, 3).map(p => p.count as number);
            if (head.length > 0) baselines.set(s.profileId, median(head));
        });

        const dates = [...new Set(series.flatMap(s => s.measured.map(p => p.date)))]
            .filter(d => d >= baselineDate)
            .sort();

        const rows = dates.map(date => {
            const row: Record<string, number | string> = { date };
            const onThisDay: number[] = [];
            series.forEach(s => {
                const base = baselines.get(s.profileId);
                const point = s.measured.find(p => p.date === date);
                if (base === undefined || point === undefined) return;
                const count = point.count as number;
                const value = growthMode === 'absolute'
                    ? count - base
                    : base > 0 ? ((count - base) / base) * 100 : 0;
                row[`g_${s.profileId}`] = Math.round(value * 10) / 10;
                row[`t_${s.profileId}`] = count;
                onThisDay.push(value);
            });
            if (onThisDay.length >= 3) row.median = Math.round(median(onThisDay) * 10) / 10;
            return row;
        });

        // Stan na ostatni dzień, w którym profil miał pomiar — podstawa nagłówka.
        const totals: GrowthTotal[] = series.map(s => {
            const base = baselines.get(s.profileId);
            const last = s.measured.filter(p => p.date >= baselineDate).slice(-1)[0];
            const gain = base === undefined || last === undefined ? 0 : (last.count as number) - base;
            return { profileId: s.profileId, username: s.username, isSelf: s.isSelf, gain };
        }).sort((a, b) => b.gain - a.gain);

        return { rows, baselineDate, limiter, totals };
    }, [benchmark.followers, selected, growthMode]);

    /**
     * Nagłówek wykresu. Świadomie NIE liczymy tu "udziału w puli nowych obserwujących" —
     * suma przyrostów wszystkich profili nie jest liczbą unikalnych osób, bo ten sam
     * człowiek może obserwować kilka profili naraz. Pozycja w rankingu, krotność
     * względem lidera i różnica w sztukach są odporne na to nakładanie się widowni.
     */
    const growthHeadline = useMemo<GrowthHeadline | null>(() => {
        const totals = growth.totals;
        if (totals.length < 2) return null;
        const selfIndex = totals.findIndex(t => t.isSelf);
        if (selfIndex === -1) return null;
        const self = totals[selfIndex];
        const leader = totals[0];
        if (leader.profileId === self.profileId) {
            return { rank: 1, total: totals.length, self, leader: null, multiple: null, gap: 0 };
        }
        const multiple = self.gain > 0 ? leader.gain / self.gain : null;
        return {
            rank: selfIndex + 1,
            total: totals.length,
            self,
            leader,
            multiple,
            gap: leader.gain - self.gain,
        };
    }, [growth.totals]);

    // ── Puls konkurencji ──────────────────────────────────────────────────────
    // Liczony w całości po stronie backendu, bez modelu AI — więc ładuje się razem
    // z zakładką, bez przycisku i bez czekania.
    const pulseQuery = usePulse();

    const annotations = useMemo(
        () => benchmark.annotations.filter(a => !a.profileId || selected.includes(a.profileId)),
        [benchmark.annotations, selected]
    );

    const renderBenchRow = (row: BenchmarkRow) => (
        <ProfileRow
            key={row.studioProfileId}
            $self={row.isSelf}
            $selected={selected.includes(row.profileId)}
            onClick={() => toggleProfile(row.profileId)}
        >
            <td>
                <UserCell>
                    <ColorDot $color={colorFor(row.profileId)} $muted={!selected.includes(row.profileId)} />
                    @{row.username}
                    {row.isSelf && (
                        <SelfTag>
                            <Star size={10} style={{ marginRight: 3 }} /> Ty
                        </SelfTag>
                    )}
                    {row.apiError && <ErrorTag>problem z pobraniem</ErrorTag>}
                </UserCell>
                <SubNote>wizytówka {row.storefront.score}/100</SubNote>
            </td>
            <td><MetricCell metric={row.followers} decimals={0} /></td>
            <td><MetricCell metric={row.erPct} decimals={1} unit="%" /></td>
            <td><MetricCell metric={row.postsPerWeek} decimals={1} /></td>
            <td>
                <MixBar title={`Zdjęcia ${row.formatMix.photoPct.toFixed(0)}% · Rolki ${row.formatMix.reelsPct.toFixed(0)}% · Karuzele ${row.formatMix.carouselPct.toFixed(0)}%`}>
                    <MixSeg $w={row.formatMix.photoPct} $c={st.accentBlue} />
                    <MixSeg $w={row.formatMix.reelsPct} $c={st.accentAmber} />
                    <MixSeg $w={row.formatMix.carouselPct} $c={st.accentGreen} />
                </MixBar>
                <SubNote>publikuje w {row.regularityPct.toFixed(0)}% tygodni</SubNote>
            </td>
            <td><MetricCell metric={row.activityIndex} decimals={0} /></td>
        </ProfileRow>
    );

    return (
        <Layout>
            <Card>
                <CardTitle>Porównanie profili</CardTitle>
                <CardHint>
                    Każda liczba ze zmianą vs poprzedni okres. Porównania dotyczą wyłącznie{' '}
                    <strong>obserwowanej przez Ciebie grupy {benchmark.comparisonGroupSize}{' '}
                    {benchmark.comparisonGroupSize === 1 ? 'profilu' : 'profili'}</strong>.
                    {benchmark.comparisonGroupSize < 4 && (
                        <> Dodaj jeszcze {4 - benchmark.comparisonGroupSize}{' '}
                        {4 - benchmark.comparisonGroupSize === 1 ? 'profil' : 'profile'}, aby odblokować
                        odniesienie do mediany grupy.</>
                    )}{' '}
                    Kliknij wiersz, aby dodać profil do wykresów (maks. {MAX_CHART_PROFILES}).
                </CardHint>
                <TableScroll>
                    <Table>
                        <thead>
                            <tr>
                                <th>Profil</th>
                                <th>Obserwujący</th>
                                <th>Zaangażowanie</th>
                                <th>Posty / tydz.</th>
                                <th>Formaty i regularność</th>
                                <th>Aktywność (0-100)</th>
                            </tr>
                        </thead>
                        <tbody>{benchmark.rows.map(renderBenchRow)}</tbody>
                    </Table>
                </TableScroll>
                <HintNote>
                    Formaty: <span style={{ color: st.accentBlue }}>■</span> zdjęcia ·{' '}
                    <span style={{ color: st.accentAmber }}>■</span> rolki ·{' '}
                    <span style={{ color: st.accentGreen }}>■</span> karuzele
                </HintNote>
            </Card>

            <ChartsGrid>
                <Card>
                    <CardTitle>Ile publikują tydzień po tygodniu</CardTitle>
                    <CardHint>Pionowe linie to wykryte wydarzenia (promocje, hity), najedź, aby zobaczyć.</CardHint>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid stroke={st.border} strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="weekStart"
                                tickFormatter={formatWeekTick}
                                tick={{ fontSize: 11, fill: st.textMuted }}
                                interval="preserveStartEnd"
                            />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: st.textMuted }} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <TooltipBox>
                                            <strong>tydzień od {formatWeekTick(String(label))}</strong>
                                            {payload
                                                .filter(entry => String(entry.dataKey).startsWith('p_'))
                                                .map(entry => {
                                                    const profileId = String(entry.dataKey).slice(2);
                                                    return (
                                                        <div key={profileId} style={{ color: colorFor(profileId) }}>
                                                            @{usernameFor(profileId)}: {entry.value} postów
                                                        </div>
                                                    );
                                                })}
                                        </TooltipBox>
                                    );
                                }}
                            />
                            {annotations.map(annotation => (
                                <ReferenceLine
                                    key={`${annotation.date}-${annotation.title}`}
                                    x={annotation.date.slice(0, 10)}
                                    stroke={st.accentAmber}
                                    strokeDasharray="4 3"
                                />
                            ))}
                            {selected.map(profileId => (
                                <Bar
                                    key={profileId}
                                    dataKey={`p_${profileId}`}
                                    fill={colorFor(profileId)}
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={18}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                    {annotations.length > 0 && (
                        <HintNote>
                            Wydarzenia w tym oknie:{' '}
                            {annotations.slice(0, 3).map(a => a.title).join(' · ')}
                            {annotations.length > 3 ? ` · +${annotations.length - 3} więcej` : ''}
                        </HintNote>
                    )}
                </Card>


                <Card>
                    <CardTitle>Przyrost obserwujących</CardTitle>
                    <CardHint>
                        Każdy profil startuje od zera tego samego dnia, a linia pokazuje, ilu
                        obserwujących przybyło mu od tego momentu. Im bardziej linie się rozjeżdżają,
                        tym większa różnica w liczbie realnie zdobytych ludzi. Kliknij wykres, aby
                        zobaczyć, co działo się wtedy na profilu.
                    </CardHint>

                    {growth.rows.length > 0 && (
                        <ChartHeadRow>
                            {growthHeadline && (
                                <HeadStat>
                                    Jesteś{' '}
                                    <strong>{growthHeadline.rank}. z {growthHeadline.total}</strong>{' '}
                                    pod względem zdobytych obserwujących
                                    {growthHeadline.leader && (
                                        <>
                                            {' · '}
                                            @{growthHeadline.leader.username} zdobył{' '}
                                            {growthHeadline.multiple !== null ? (
                                                <strong>{growthHeadline.multiple.toFixed(1)}× więcej</strong>
                                            ) : (
                                                <strong>{formatNumber(growthHeadline.leader.gain)}</strong>
                                            )}
                                            {' '}({formatNumber(growthHeadline.leader.gain)} wobec{' '}
                                            {formatNumber(growthHeadline.self.gain)}) · dystans urósł o{' '}
                                            <strong>{formatNumber(growthHeadline.gap)}</strong>
                                        </>
                                    )}
                                </HeadStat>
                            )}
                            <ModeSwitch>
                                <Pill
                                    $active={growthMode === 'absolute'}
                                    onClick={() => setGrowthMode('absolute')}
                                    title="Ile osób przybyło — tak wygląda walka o lokalną uwagę"
                                >
                                    Zasięg (osoby)
                                </Pill>
                                <Pill
                                    $active={growthMode === 'relative'}
                                    onClick={() => setGrowthMode('relative')}
                                    title="Przyrost w % bazy — tak wygląda skuteczność niezależnie od wielkości konta"
                                >
                                    Tempo (%)
                                </Pill>
                            </ModeSwitch>
                        </ChartHeadRow>
                    )}

                    {growth.rows.length === 0 ? (
                        <HintNote>
                            Historia obserwujących buduje się od dnia dodania profilu — pierwsze punkty
                            pojawią się po 2 dniach zbierania danych.
                        </HintNote>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart
                                data={growth.rows}
                                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                                onClick={state => {
                                    const label = (state as { activeLabel?: string | number } | undefined)?.activeLabel;
                                    const date = label ? String(label) : '';
                                    if (!date) return;
                                    const target = growth.totals.find(t => t.isSelf) ?? growth.totals[0];
                                    if (target) setExplain({ profileId: target.profileId, weekStart: date });
                                }}
                            >
                                <CartesianGrid stroke={st.border} strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={value => formatDayShort(String(value))}
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    interval="preserveStartEnd"
                                    minTickGap={24}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    tickFormatter={value =>
                                        growthMode === 'relative' ? `${value}%` : String(value)
                                    }
                                />
                                <ReferenceLine y={0} stroke={st.borderHover} />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null;
                                        const row = payload[0]?.payload as Record<string, number | string>;
                                        const show = (value: number) =>
                                            growthMode === 'relative'
                                                ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
                                                : `${value > 0 ? '+' : ''}${formatNumber(value)}`;
                                        return (
                                            <TooltipBox>
                                                <strong>
                                                    {new Date(`${String(label)}T00:00:00Z`).toLocaleDateString('pl-PL', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                    })}
                                                </strong>
                                                {selected.map(profileId => {
                                                    const value = row[`g_${profileId}`];
                                                    if (value === undefined) return null;
                                                    const total = row[`t_${profileId}`];
                                                    return (
                                                        <div key={profileId} style={{ color: colorFor(profileId) }}>
                                                            @{usernameFor(profileId)}: {show(Number(value))}
                                                            {total !== undefined
                                                                ? ` (łącznie ${formatNumber(Number(total))})`
                                                                : ''}
                                                        </div>
                                                    );
                                                })}
                                                {row.median !== undefined && (
                                                    <div style={{ color: st.textMuted, marginTop: 4 }}>
                                                        mediana grupy: {show(Number(row.median))}
                                                    </div>
                                                )}
                                            </TooltipBox>
                                        );
                                    }}
                                />
                                {/* Mediana grupy: właściciel konkuruje z rynkiem, nie z jednym gwiazdorem. */}
                                <Line
                                    dataKey="median"
                                    stroke={st.textMuted}
                                    strokeWidth={1.5}
                                    strokeDasharray="5 4"
                                    dot={false}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                                {selected.map(profileId => {
                                    const isSelf = benchmark.rows.find(r => r.profileId === profileId)?.isSelf;
                                    return (
                                        <Line
                                            key={profileId}
                                            dataKey={`g_${profileId}`}
                                            stroke={colorFor(profileId)}
                                            strokeWidth={isSelf ? 3 : 1.75}
                                            strokeOpacity={isSelf ? 1 : 0.7}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                            connectNulls={false}
                                            isAnimationActive={false}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    )}

                    {growth.baselineDate && (
                        <WindowNote>
                            Porównanie od {formatDayShort(growth.baselineDate)} — od tego dnia masz dane
                            dla wszystkich {growth.totals.length}{' '}
                            {growth.totals.length === 1 ? 'wybranego profilu' : 'wybranych profili'}.
                        </WindowNote>
                    )}
                    {growth.limiter && growth.limiter.gainedDays >= 3 && (
                        <WindowWarning>
                            Profil @{growth.limiter.username} skraca okno porównania o{' '}
                            {growth.limiter.gainedDays}{' '}
                            {growth.limiter.gainedDays === 1 ? 'dzień' : 'dni'} — obserwujesz go krócej
                            niż pozostałe. Odznacz go w tabeli powyżej, aby wrócić do pełnej historii reszty.
                        </WindowWarning>
                    )}

                    {explain && (
                        <>
                            <ChartHeadRow>
                                <HeadStat>Pokaż tydzień profilu:</HeadStat>
                                {selected.map(profileId => (
                                    <Pill
                                        key={profileId}
                                        $active={explain.profileId === profileId}
                                        onClick={() => setExplain({ profileId, weekStart: explain.weekStart })}
                                    >
                                        @{usernameFor(profileId)}
                                    </Pill>
                                ))}
                            </ChartHeadRow>
                            <WeekExplainPanel
                                profileId={explain.profileId}
                                username={usernameFor(explain.profileId)}
                                weekStart={explain.weekStart}
                                onClose={() => setExplain(null)}
                            />
                        </>
                    )}
                </Card>
            </ChartsGrid>

            <Card>
                <PulseHead>
                    <div style={{ minWidth: 0 }}>
                        <CardTitle>Puls konkurencji</CardTitle>
                        <CardHint style={{ margin: 0 }}>
                            Co wydarzyło się u obserwowanych profili. Każdą liczbę zestawiamy z normą
                            danego profilu z ostatnich {pulseQuery.data?.baselineWeeks ?? 26} tygodni —
                            to fakty z ostatnich dni, nie wnioski o tym, co „działa".
                        </CardHint>
                    </div>
                    {pulseQuery.data && (
                        <PulseMeta>
                            {pulseQuery.data.windowFrom} – {pulseQuery.data.windowTo}
                        </PulseMeta>
                    )}
                </PulseHead>

                {pulseQuery.isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
                        <Spinner />
                    </div>
                )}

                {pulseQuery.isError && (
                    <HintNote style={{ marginTop: 14 }}>
                        Nie udało się pobrać pulsu. Odśwież stronę.
                    </HintNote>
                )}

                {pulseQuery.data && pulseQuery.data.events.length === 0 && (
                    <HintNote style={{ marginTop: 14 }}>
                        {pulseQuery.data.profilesWatched === 0
                            ? 'Dodaj profile do obserwacji, aby zobaczyć, co się u nich dzieje.'
                            : 'W tym okresie nic się nie wydarzyło — ani u ciebie, ani u konkurencji. ' +
                              'Historia normy buduje się przez pierwsze tygodnie obserwacji.'}
                    </HintNote>
                )}

                {pulseQuery.data && pulseQuery.data.events.length > 0 && (
                    <>
                        <PulseList>
                            {pulseQuery.data.events.map((event, index) => {
                                const style = PULSE_STYLE[event.kind];
                                const Icon = style.icon;
                                return (
                                    <PulseRow key={`${event.kind}-${index}`} $self={event.isSelf}>
                                        <PulseIcon $tone={style.tone}>
                                            <Icon size={14} />
                                        </PulseIcon>
                                        <PulseBody>
                                            <PulseHeadline>{event.headline}</PulseHeadline>
                                            <PulseDetail>{event.detail}</PulseDetail>
                                            {event.permalink && (
                                                <PulseLink
                                                    href={event.permalink}
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                >
                                                    Zobacz post <ExternalLink size={11} />
                                                </PulseLink>
                                            )}
                                        </PulseBody>
                                        {event.occurredAt && <PulseDate>{event.occurredAt}</PulseDate>}
                                    </PulseRow>
                                );
                            })}
                        </PulseList>
                        <PulseFootnote>
                            Nie widzimy zasięgów, zapisów, udostępnień ani tego, czy post był promowany
                            płatnie — Instagram nie udostępnia tych danych dla obserwowanych profili.
                        </PulseFootnote>
                    </>
                )}
            </Card>
        </Layout>
    );
};
