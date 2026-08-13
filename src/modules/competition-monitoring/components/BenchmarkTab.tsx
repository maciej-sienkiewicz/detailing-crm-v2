import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    Bar, BarChart, CartesianGrid, ComposedChart, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Star } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Benchmark, BenchmarkRow } from '../types';
import { PROFILE_COLORS } from '../types';
import { Card, CardTitle, CardHint, MetricCell, SelfTag, formatNumber } from './MetricBits';

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

const MAX_CHART_PROFILES = 4;

const formatWeekTick = (weekStart: string) =>
    new Date(weekStart).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

export const BenchmarkTab: React.FC<{ benchmark: Benchmark }> = ({ benchmark }) => {
    // Na wykresach: self + pierwsi konkurenci (klik w wiersz tabeli zmienia wybór)
    const defaultSelection = useMemo(() => {
        const ordered = [...benchmark.rows].sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
        return ordered.slice(0, MAX_CHART_PROFILES).map(r => r.profileId);
    }, [benchmark.rows]);

    const [selected, setSelected] = useState<string[]>(defaultSelection);

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
        const isoMonday = (date: string) => {
            const d = new Date(`${date}T00:00:00Z`);
            const day = (d.getUTCDay() + 6) % 7;
            d.setUTCDate(d.getUTCDate() - day);
            return d.toISOString().slice(0, 10);
        };

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
                                <th>Aktywność (0–100)</th>
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
                    <CardHint>Pionowe linie to wykryte wydarzenia (promocje, hity) – najedź, aby zobaczyć.</CardHint>
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
                        czyta się tak samo dobrze – liczy się zmiana, nie wielkość konta.
                    </CardHint>
                    {followerDeltas.length === 0 ? (
                        <HintNote>
                            Historia obserwujących buduje się od dnia dodania profilu – pierwsze słupki
                            pojawią się po 2 dniach zbierania danych.
                        </HintNote>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={followerDeltas} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </ChartsGrid>
        </Layout>
    );
};
