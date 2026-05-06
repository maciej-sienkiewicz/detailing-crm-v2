import styled, { keyframes } from 'styled-components';
import { X, TrendingUp, DollarSign, BarChart2, Activity, MapPin } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useKeywordHistory } from '../hooks/useKeywordHistory';

const MONTHS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn  = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

// ─── Overlay + Sheet ─────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.5);
    backdrop-filter: blur(2px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: ${fadeIn} 0.15s ease;
`;

const Sheet = styled.div`
    background: ${st.bgCard};
    border-radius: 18px;
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 880px;
    max-height: 90vh;
    overflow-y: auto;
    animation: ${slideUp} 0.2s ease;
    display: flex;
    flex-direction: column;
    border: 1px solid ${st.border};
`;

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px 28px 20px;
    border-bottom: 1px solid ${st.border};
    position: sticky;
    top: 0;
    background: ${st.bgCard};
    z-index: 1;
    gap: 16px;
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const KeywordTitle = styled.h2`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
`;

const LocationLine = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: ${st.textMuted};
    font-weight: 500;
`;

const CloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    transition: all ${st.transition};

    &:hover { background: ${st.bgCardAlt}; color: ${st.text}; }
`;

// ─── Body ────────────────────────────────────────────────────────────────────

const Body = styled.div`
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 28px;
`;

// ─── Metrics strip ───────────────────────────────────────────────────────────

const MetricsStrip = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
`;

const MetricTile = styled.div<{ $accent: string; $dimBg: string }>`
    padding: 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-top: 3px solid ${p => p.$accent};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const MetricIcon = styled.div<{ $bg: string; $color: string }>`
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: ${p => p.$bg};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.$color};
    margin-bottom: 4px;
`;

const MetricLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
`;

const MetricValue = styled.div`
    font-size: 24px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
`;

const MetricSub = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    font-weight: 400;
`;

// ─── Chart section ───────────────────────────────────────────────────────────

const ChartSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ChartHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ChartLabel = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
`;

const ChartCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 20px 20px 12px;
`;

const EmptyChart = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 140px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const Loading = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const CompBadge = styled.span<{ $level: string }>`
    font-size: 13px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    ${p => {
        switch (p.$level?.toUpperCase()) {
            case 'HIGH':   return `background: ${st.accentRedDim}; color: ${st.accentRed};`;
            case 'MEDIUM': return `background: ${st.accentAmberDim}; color: ${st.accentAmber};`;
            case 'LOW':    return `background: ${st.accentGreenDim}; color: ${st.accentGreen};`;
            default:       return `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
        }
    }}
`;

// ─── Tooltip styles ──────────────────────────────────────────────────────────

const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${st.border}`,
    boxShadow: st.shadowMd,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    keyword: string;
    locationCode: number;
    onClose: () => void;
}

export function KeywordHistoryModal({ keyword, locationCode, onClose }: Props) {
    const { history, isLoading } = useKeywordHistory(keyword, locationCode);

    const monthlyData = [...(history?.monthlySearches ?? [])]
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map(p => ({
            label: `${MONTHS[p.month - 1]} ${p.year}`,
            volume: p.searchVolume ?? 0,
        }));

    const dailyData = [...(history?.dailyTrend ?? [])]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(p => ({ date: p.date, index: p.trendIndex ?? 0 }));

    const avgTrend = dailyData.length > 0
        ? Math.round(dailyData.reduce((s, d) => s + d.index, 0) / dailyData.length)
        : null;

    const m = history?.currentMetrics;

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <Sheet>
                <Header>
                    <HeaderLeft>
                        <KeywordTitle>{keyword}</KeywordTitle>
                        <LocationLine>
                            <MapPin size={12} />
                            {history?.locationName ?? 'Polska'}
                        </LocationLine>
                    </HeaderLeft>
                    <CloseBtn onClick={onClose}><X size={16} /></CloseBtn>
                </Header>

                <Body>
                    {isLoading ? (
                        <Loading>Ładowanie danych…</Loading>
                    ) : (
                        <>
                            {m && (
                                <MetricsStrip>
                                    <MetricTile $accent={st.accentBlue} $dimBg={st.accentBlueDim}>
                                        <MetricIcon $bg={st.accentBlueDim} $color={st.accentBlue}>
                                            <TrendingUp size={14} />
                                        </MetricIcon>
                                        <MetricLabel>Wyszukiwania / mies.</MetricLabel>
                                        <MetricValue>
                                            {m.searchVolume != null
                                                ? m.searchVolume.toLocaleString('pl-PL')
                                                : '—'}
                                        </MetricValue>
                                        <MetricSub>średnia miesięczna</MetricSub>
                                    </MetricTile>

                                    <MetricTile $accent={st.accentGreen} $dimBg={st.accentGreenDim}>
                                        <MetricIcon $bg={st.accentGreenDim} $color={st.accentGreen}>
                                            <DollarSign size={14} />
                                        </MetricIcon>
                                        <MetricLabel>CPC</MetricLabel>
                                        <MetricValue>
                                            {m.cpc != null ? `${m.cpc.toFixed(2)} zł` : '—'}
                                        </MetricValue>
                                        <MetricSub>koszt kliknięcia (reklama)</MetricSub>
                                    </MetricTile>

                                    <MetricTile $accent={st.accentAmber} $dimBg={st.accentAmberDim}>
                                        <MetricIcon $bg={st.accentAmberDim} $color={st.accentAmber}>
                                            <BarChart2 size={14} />
                                        </MetricIcon>
                                        <MetricLabel>Konkurencja</MetricLabel>
                                        <MetricValue>
                                            {m.competition
                                                ? <CompBadge $level={m.competition}>{m.competition}</CompBadge>
                                                : '—'}
                                        </MetricValue>
                                        <MetricSub>indeks {m.competitionIndex ?? '—'} / 100</MetricSub>
                                    </MetricTile>

                                    {avgTrend != null && (
                                        <MetricTile $accent="#8b5cf6" $dimBg="rgba(139,92,246,.10)">
                                            <MetricIcon $bg="rgba(139,92,246,.10)" $color="#8b5cf6">
                                                <Activity size={14} />
                                            </MetricIcon>
                                            <MetricLabel>Śr. indeks trendu</MetricLabel>
                                            <MetricValue>{avgTrend}</MetricValue>
                                            <MetricSub>ostatnie 12 miesięcy</MetricSub>
                                        </MetricTile>
                                    )}
                                </MetricsStrip>
                            )}

                            <ChartSection>
                                <ChartHeader>
                                    <ChartLabel>Wolumen wyszukiwań miesięcznie</ChartLabel>
                                </ChartHeader>
                                <ChartCard>
                                    {monthlyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                                                />
                                                <Tooltip
                                                    formatter={(v: number) => [v.toLocaleString('pl-PL'), 'Wyszukiwania']}
                                                    contentStyle={tooltipStyle}
                                                />
                                                <Bar dataKey="volume" fill={st.accentBlue} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart>Brak danych miesięcznych</EmptyChart>}
                                </ChartCard>
                            </ChartSection>

                            <ChartSection>
                                <ChartHeader>
                                    <ChartLabel>Indeks trendu Google (dziennie)</ChartLabel>
                                </ChartHeader>
                                <ChartCard>
                                    {dailyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 10, fill: st.textMuted }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    interval={Math.max(1, Math.floor(dailyData.length / 8))}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip
                                                    formatter={(v: number) => [v, 'Indeks trendu']}
                                                    contentStyle={tooltipStyle}
                                                />
                                                {avgTrend != null && (
                                                    <ReferenceLine
                                                        y={avgTrend}
                                                        stroke={st.textMuted}
                                                        strokeDasharray="4 3"
                                                        label={{ value: `śr. ${avgTrend}`, fontSize: 10, fill: st.textMuted, position: 'right' }}
                                                    />
                                                )}
                                                <Line
                                                    type="monotone"
                                                    dataKey="index"
                                                    stroke={st.accentBlue}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: st.accentBlue }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : <EmptyChart>Brak danych trendów</EmptyChart>}
                                </ChartCard>
                            </ChartSection>
                        </>
                    )}
                </Body>
            </Sheet>
        </Overlay>
    );
}
