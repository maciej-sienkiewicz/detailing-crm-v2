import styled, { keyframes } from 'styled-components';
import { X, TrendingUp, DollarSign, BarChart2, Activity } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { useKeywordHistory } from '../hooks/useKeywordHistory';

const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: ${fadeIn} 0.15s ease;
`;

const Sheet = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: ${p => p.theme.shadows.xl};
    width: 100%;
    max-width: 860px;
    max-height: 90vh;
    overflow-y: auto;
    animation: ${slideUp} 0.2s ease;
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px 28px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    position: sticky;
    top: 0;
    background: ${p => p.theme.colors.surface};
    z-index: 1;
    gap: 16px;
`;

const HeaderLeft = styled.div``;

const Keyword = styled.h2`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.3px;
`;

const Location = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
`;

const CloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    flex-shrink: 0;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
`;

const Body = styled.div`
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 28px;
`;

const MetricsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
`;

const MetricCard = styled.div`
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const MetricIcon = styled.div`
    color: var(--brand-primary);
    display: flex;
`;

const MetricLabel = styled.div`
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${p => p.theme.colors.textMuted};
    font-weight: ${p => p.theme.fontWeights.medium};
`;

const MetricValue = styled.div`
    font-size: 24px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
`;

const MetricSub = styled.div`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
`;

const ChartSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ChartTitle = styled.h3`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Empty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    background: ${p => p.theme.colors.surfaceAlt};
    border-radius: ${p => p.theme.radii.lg};
`;

const Loading = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: ${p => p.theme.colors.textMuted};
`;

const CompBadge = styled.span<{ $level: string }>`
    display: inline-block;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 3px 10px;
    border-radius: ${p => p.theme.radii.full};
    ${p => {
        switch (p.$level?.toUpperCase()) {
            case 'HIGH': return 'background: #fef2f2; color: #dc2626;';
            case 'MEDIUM': return 'background: #fffbeb; color: #d97706;';
            case 'LOW': return 'background: #f0fdf4; color: #16a34a;';
            default: return 'background: #f1f5f9; color: #64748b;';
        }
    }}
`;

function formatVolume(v: number | null): string {
    if (v == null) return '—';
    return v.toLocaleString('pl-PL');
}

interface Props {
    keyword: string;
    onClose: () => void;
}

export function KeywordHistoryModal({ keyword, onClose }: Props) {
    const { history, isLoading } = useKeywordHistory(keyword);

    const monthlyData = (history?.monthlySearches ?? [])
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map(p => ({
            label: `${MONTH_NAMES[p.month - 1]} ${p.year}`,
            volume: p.searchVolume ?? 0,
        }));

    const dailyData = (history?.dailyTrend ?? [])
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(p => ({
            date: p.date,
            index: p.trendIndex ?? 0,
        }));

    const avgTrend = dailyData.length > 0
        ? Math.round(dailyData.reduce((s, d) => s + d.index, 0) / dailyData.length)
        : null;

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <Sheet>
                <Header>
                    <HeaderLeft>
                        <Keyword>{keyword}</Keyword>
                        <Location>{history?.locationName ?? 'Polska'}</Location>
                    </HeaderLeft>
                    <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
                </Header>

                <Body>
                    {isLoading ? (
                        <Loading>Ładowanie danych...</Loading>
                    ) : (
                        <>
                            {history?.currentMetrics && (
                                <MetricsRow>
                                    <MetricCard>
                                        <MetricIcon><TrendingUp size={16} /></MetricIcon>
                                        <MetricLabel>Wyszukiwania / mies.</MetricLabel>
                                        <MetricValue>{formatVolume(history.currentMetrics.searchVolume)}</MetricValue>
                                        <MetricSub>średnia miesięczna</MetricSub>
                                    </MetricCard>
                                    <MetricCard>
                                        <MetricIcon><DollarSign size={16} /></MetricIcon>
                                        <MetricLabel>CPC</MetricLabel>
                                        <MetricValue>
                                            {history.currentMetrics.cpc != null
                                                ? `${history.currentMetrics.cpc.toFixed(2)} zł`
                                                : '—'}
                                        </MetricValue>
                                        <MetricSub>koszt kliknięcia</MetricSub>
                                    </MetricCard>
                                    <MetricCard>
                                        <MetricIcon><BarChart2 size={16} /></MetricIcon>
                                        <MetricLabel>Konkurencja</MetricLabel>
                                        <MetricValue>
                                            {history.currentMetrics.competition
                                                ? <CompBadge $level={history.currentMetrics.competition}>{history.currentMetrics.competition}</CompBadge>
                                                : '—'}
                                        </MetricValue>
                                        <MetricSub>
                                            indeks: {history.currentMetrics.competitionIndex ?? '—'}
                                        </MetricSub>
                                    </MetricCard>
                                    {avgTrend != null && (
                                        <MetricCard>
                                            <MetricIcon><Activity size={16} /></MetricIcon>
                                            <MetricLabel>Śr. indeks trendu</MetricLabel>
                                            <MetricValue>{avgTrend}</MetricValue>
                                            <MetricSub>ostatnie 12 mies.</MetricSub>
                                        </MetricCard>
                                    )}
                                </MetricsRow>
                            )}

                            <ChartSection>
                                <ChartTitle><BarChart2 size={15} /> Wolumen wyszukiwań miesięcznie</ChartTitle>
                                {monthlyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickLine={false}
                                                axisLine={false}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                                            />
                                            <Tooltip
                                                formatter={(v: number) => [v.toLocaleString('pl-PL'), 'Wyszukiwania']}
                                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                            />
                                            <Bar dataKey="volume" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <Empty>Brak danych miesięcznych</Empty>}
                            </ChartSection>

                            <ChartSection>
                                <ChartTitle><Activity size={15} /> Indeks trendu Google (dziennie)</ChartTitle>
                                {dailyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                tickLine={false}
                                                axisLine={false}
                                                interval={Math.floor(dailyData.length / 6)}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                formatter={(v: number) => [v, 'Indeks trendu']}
                                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                            />
                                            {avgTrend != null && (
                                                <ReferenceLine y={avgTrend} stroke="#94a3b8" strokeDasharray="4 4" />
                                            )}
                                            <Line
                                                type="monotone"
                                                dataKey="index"
                                                stroke="var(--brand-primary)"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <Empty>Brak danych trendów</Empty>}
                            </ChartSection>
                        </>
                    )}
                </Body>
            </Sheet>
        </Overlay>
    );
}
