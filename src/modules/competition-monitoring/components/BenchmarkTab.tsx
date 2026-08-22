import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    Bar, BarChart, CartesianGrid, ComposedChart, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Sparkles, Star, X } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Benchmark, BenchmarkRow, GrowthSummary, WeeksOption } from '../types';
import { PROFILE_COLORS } from '../types';
import { instagramApi } from '../api/instagramApi';
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

// ─── Pager tygodni + podsumowanie AI ─────────────────────────────────────────

const PagerRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 6px;
`;

const PagerLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    white-space: nowrap;
`;

const SummarizeBtn = styled(Pill)`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;

    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const SummaryLoading = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 12px;
    padding: 16px;
    border: 1px dashed ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};

    strong { display: block; font-size: ${st.fontSm}; color: ${st.text}; }
    span { display: block; font-size: ${st.fontXs}; color: ${st.textMuted}; margin-top: 2px; }
`;

const SummaryPanel = styled.div`
    margin-top: 12px;
    padding: 14px 16px;
    border: 1px solid ${st.border};
    border-left: 3px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
`;

const SummaryHead = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;

    strong {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: ${st.fontSm};
        color: ${st.text};
    }
`;

const SummaryMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const SummaryCloseBtn = styled.button`
    margin-left: auto;
    border: none;
    background: none;
    color: ${st.textMuted};
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;

    &:hover { color: ${st.text}; }
`;

const SummaryText = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.65;
    white-space: pre-wrap;
`;

const SummaryError = styled.p`
    margin: 10px 0 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

const MAX_CHART_PROFILES = 4;

const formatWeekTick = (weekStart: string) =>
    new Date(weekStart).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

/** Poniedziałek tygodnia ISO dla daty YYYY-MM-DD. */
const isoMonday = (date: string) => {
    const d = new Date(`${date}T00:00:00Z`);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

const formatDayShort = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

type SummaryState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; data: GrowthSummary }
    | { phase: 'error'; message: string };

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

    // Przyrosty obserwujących: delta między kolejnymi pomiarami, agregowana
    // do tygodni przy dłuższych oknach (żeby słupki były czytelne).
    const followerDeltaWeekly = benchmark.weeks > 8;
    const followerDeltas = useMemo(() => {
        const byBucket = new Map<string, Record<string, number | string>>();
        benchmark.followers
            .filter(series => selected.includes(series.profileId))
            .forEach(series => {
                let prev: number | null = null;
                series.points.forEach(point => {
                    if (point.count === null) return;
                    if (prev !== null) {
                        const bucket = followerDeltaWeekly ? isoMonday(point.date) : point.date;
                        const row = byBucket.get(bucket) ?? { date: bucket };
                        const deltaKey = `d_${series.profileId}`;
                        row[deltaKey] = (Number(row[deltaKey]) || 0) + (point.count - prev);
                        row[`t_${series.profileId}`] = point.count;
                        byBucket.set(bucket, row);
                    }
                    prev = point.count;
                });
            });
        return [...byBucket.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }, [benchmark.followers, selected, followerDeltaWeekly]);

    // ── Pager tygodni (tylko granulacja dzienna, np. okres "Miesiąc") ─────────
    // Pełny okres dziennych słupków byłby nieczytelny, więc pokazujemy jeden
    // tydzień naraz; przyciski przesuwają okno w granicach wybranego okresu.
    const [weekOffset, setWeekOffset] = useState(0);
    useEffect(() => setWeekOffset(0), [benchmark.weeks]);

    const maxWeekOffset = benchmark.weeks - 1;
    const visibleWeekStart = useMemo(
        () => addDays(isoMonday(new Date().toISOString().slice(0, 10)), -7 * weekOffset),
        [weekOffset]
    );
    const visibleWeekEnd = addDays(visibleWeekStart, 6);

    const visibleDeltas = useMemo(
        () =>
            followerDeltaWeekly
                ? followerDeltas
                : followerDeltas.filter(row => {
                      const date = String(row.date);
                      return date >= visibleWeekStart && date <= visibleWeekEnd;
                  }),
        [followerDeltas, followerDeltaWeekly, visibleWeekStart, visibleWeekEnd]
    );

    // ── Podsumowanie AI całego okresu ─────────────────────────────────────────
    const [summary, setSummary] = useState<SummaryState>({ phase: 'idle' });

    const handleSummarize = async () => {
        if (summary.phase === 'loading') return;
        setSummary({ phase: 'loading' });
        try {
            const data = await instagramApi.getGrowthSummary(benchmark.weeks as WeeksOption);
            setSummary({ phase: 'done', data });
        } catch (err: unknown) {
            const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
            const message =
                response?.status === 429
                    ? response.data?.message ??
                      'Podsumowanie AI można generować raz na 15 minut. Spróbuj ponownie później.'
                    : response?.data?.message ?? 'Nie udało się wygenerować podsumowania. Spróbuj ponownie.';
            setSummary({ phase: 'error', message });
        }
    };

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
                        Słupek = o ile zmieniła się liczba obserwujących w danym{' '}
                        {followerDeltaWeekly ? 'tygodniu' : 'dniu'}. Dzięki temu małe i duże profile
                        czyta się tak samo dobrze, liczy się zmiana, nie wielkość konta.
                        {' '}Kliknij słupek, aby zobaczyć, co w tym tygodniu wydarzyło się na profilu.
                    </CardHint>
                    {followerDeltas.length > 0 && (
                        <PagerRow>
                            {!followerDeltaWeekly && (
                                <>
                                    <Pill
                                        onClick={() => setWeekOffset(offset => Math.min(offset + 1, maxWeekOffset))}
                                        disabled={weekOffset >= maxWeekOffset}
                                    >
                                        ← Poprzedni tydzień
                                    </Pill>
                                    <PagerLabel>
                                        {formatDayShort(visibleWeekStart)} – {formatDayShort(visibleWeekEnd)}
                                    </PagerLabel>
                                    <Pill
                                        onClick={() => setWeekOffset(offset => Math.max(offset - 1, 0))}
                                        disabled={weekOffset === 0}
                                    >
                                        Następny tydzień →
                                    </Pill>
                                </>
                            )}
                            <SummarizeBtn
                                $active
                                onClick={handleSummarize}
                                disabled={summary.phase === 'loading'}
                            >
                                <Sparkles size={13} /> Podsumuj cały okres
                            </SummarizeBtn>
                        </PagerRow>
                    )}
                    {followerDeltas.length === 0 ? (
                        <HintNote>
                            Historia obserwujących buduje się od dnia dodania profilu, pierwsze słupki
                            pojawią się po 2 dniach zbierania danych.
                        </HintNote>
                    ) : visibleDeltas.length === 0 ? (
                        <HintNote>
                            Brak danych w tym tygodniu — historia obserwujących buduje się od dnia
                            dodania profilu. Przejdź do nowszego tygodnia.
                        </HintNote>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={visibleDeltas} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid stroke={st.border} strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={value =>
                                        new Date(String(value)).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
                                    }
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: st.textMuted }} />
                                <ReferenceLine y={0} stroke={st.borderHover} />
                                <Tooltip
                                    cursor={{ fill: st.bgCardAlt }}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null;
                                        const row = payload[0]?.payload as Record<string, number | string>;
                                        return (
                                            <TooltipBox>
                                                <strong>
                                                    {followerDeltaWeekly ? 'tydzień od ' : ''}
                                                    {new Date(String(label)).toLocaleDateString('pl-PL', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                    })}
                                                </strong>
                                                {payload
                                                    .filter(entry => String(entry.dataKey).startsWith('d_'))
                                                    .map(entry => {
                                                        const profileId = String(entry.dataKey).slice(2);
                                                        const delta = Number(entry.value);
                                                        const total = row[`t_${profileId}`];
                                                        return (
                                                            <div key={profileId} style={{ color: colorFor(profileId) }}>
                                                                @{usernameFor(profileId)}: {delta > 0 ? '+' : ''}{delta} obs.
                                                                {total !== undefined ? ` (łącznie ${formatNumber(Number(total))})` : ''}
                                                            </div>
                                                        );
                                                    })}
                                            </TooltipBox>
                                        );
                                    }}
                                />
                                {selected.map(profileId => (
                                    <Bar
                                        key={profileId}
                                        dataKey={`d_${profileId}`}
                                        fill={colorFor(profileId)}
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={16}
                                        cursor="pointer"
                                        onClick={(entry: { payload?: Record<string, number | string> }) => {
                                            const date = String(entry?.payload?.date ?? '');
                                            if (date) setExplain({ profileId, weekStart: date });
                                        }}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    {summary.phase === 'loading' && (
                        <SummaryLoading>
                            <Spinner />
                            <div>
                                <strong>Analizuję przyrosty obserwujących…</strong>
                                <span>
                                    AI porównuje trendy i szuka wzorców w całym okresie.
                                    To może potrwać kilkanaście sekund.
                                </span>
                            </div>
                        </SummaryLoading>
                    )}
                    {summary.phase === 'error' && <SummaryError>{summary.message}</SummaryError>}
                    {summary.phase === 'done' && (
                        <SummaryPanel>
                            <SummaryHead>
                                <strong><Sparkles size={13} /> Podsumowanie okresu</strong>
                                <SummaryMeta>
                                    {summary.data.fromCache ? 'z pamięci podręcznej · ' : ''}
                                    wygenerowano {summary.data.generatedAt}
                                </SummaryMeta>
                                <SummaryCloseBtn
                                    onClick={() => setSummary({ phase: 'idle' })}
                                    aria-label="Zamknij podsumowanie"
                                >
                                    <X size={14} />
                                </SummaryCloseBtn>
                            </SummaryHead>
                            <SummaryText>{summary.data.summary}</SummaryText>
                        </SummaryPanel>
                    )}
                    {explain && (
                        <WeekExplainPanel
                            profileId={explain.profileId}
                            username={usernameFor(explain.profileId)}
                            weekStart={explain.weekStart}
                            onClose={() => setExplain(null)}
                        />
                    )}
                </Card>
            </ChartsGrid>
        </Layout>
    );
};
