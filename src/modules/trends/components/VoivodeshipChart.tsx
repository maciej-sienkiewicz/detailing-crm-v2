import styled from 'styled-components';
import { MapPin } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useVoivodeshipComparison } from '../hooks/useVoivodeshipComparison';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ChartCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: 18px 20px 14px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    gap: 10px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${st.text};
    letter-spacing: -0.1px;
`;

const CardSub = styled.span`
    font-size: 13px;
    color: ${st.textMuted};
    font-weight: 400;
    margin-left: auto;
`;

const CardBody = styled.div`
    padding: 20px;
`;

const Empty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    flex-direction: column;
    gap: 10px;
`;

const Loading = styled(Empty)``;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
    margin-top: 4px;
`;

const StatCard = styled.div<{ $highlight?: boolean }>`
    padding: 14px 16px;
    background: ${p => p.$highlight ? st.accentBlueDim : st.bgCardAlt};
    border: 1px solid ${p => p.$highlight ? 'rgba(59,130,246,0.2)' : st.border};
    border-radius: ${st.radiusSm};
`;

const StatName = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
`;

const StatVol = styled.div`
    font-size: 20px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
`;

const StatUnit = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    margin-top: 2px;
`;

const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${st.border}`,
    boxShadow: st.shadowMd,
};

function fmt(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toLocaleString('pl-PL');
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { keyword: string | null; }

export function VoivodeshipChart({ keyword }: Props) {
    const { data, isLoading } = useVoivodeshipComparison(keyword);

    const voivodeships = (data?.locations ?? []).filter(l => l.geoLevel === 'voivodeship');
    const country = (data?.locations ?? []).find(l => l.geoLevel === 'country');

    const chartData = [...voivodeships]
        .filter(v => v.searchVolume != null)
        .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
        .map(v => ({ name: v.polishName ?? v.locationName, volume: v.searchVolume ?? 0 }));

    const maxVol = chartData[0]?.volume ?? 1;

    return (
        <Wrapper>
            <ChartCard>
                <CardHeader>
                    <MapPin size={15} style={{ color: st.accentBlue, flexShrink: 0 }} />
                    <CardTitle>
                        {keyword ? `„${keyword}" — popularność w województwach` : 'Wybierz frazę, aby zobaczyć dane'}
                    </CardTitle>
                    {chartData.length > 0 && (
                        <CardSub>{chartData.length} województw z danymi</CardSub>
                    )}
                </CardHeader>
                <CardBody>
                    {!keyword ? (
                        <Empty>
                            <MapPin size={28} style={{ opacity: 0.25 }} />
                            Wybierz frazę kluczową z zakładki Słowa kluczowe
                        </Empty>
                    ) : isLoading ? (
                        <Loading>Ładowanie danych regionalnych…</Loading>
                    ) : chartData.length === 0 ? (
                        <Empty>
                            <MapPin size={28} style={{ opacity: 0.25 }} />
                            Brak danych regionalnych dla tej frazy
                        </Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 34)}>
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={st.border} horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: st.text, fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={140}
                                />
                                <Tooltip
                                    formatter={(v: number) => [v.toLocaleString('pl-PL'), 'Wyszukiwania / mies.']}
                                    contentStyle={tooltipStyle}
                                />
                                <Bar dataKey="volume" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: st.textMuted, formatter: (v: number) => v.toLocaleString('pl-PL') }}>
                                    {chartData.map(entry => (
                                        <Cell
                                            key={entry.name}
                                            fill={`rgba(59,130,246,${0.25 + 0.75 * (entry.volume / maxVol)})`}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardBody>
            </ChartCard>

            {country && voivodeships.length > 0 && (
                <ChartCard>
                    <CardHeader>
                        <CardTitle>Podsumowanie</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <StatsGrid>
                            <StatCard $highlight>
                                <StatName>Polska (łącznie)</StatName>
                                <StatVol>{fmt(country.searchVolume)}</StatVol>
                                <StatUnit>wyszukiwań / mies.</StatUnit>
                            </StatCard>
                            {voivodeships
                                .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
                                .slice(0, 8)
                                .map(v => (
                                    <StatCard key={v.locationCode}>
                                        <StatName title={v.locationName}>{v.polishName ?? v.locationName}</StatName>
                                        <StatVol>{fmt(v.searchVolume)}</StatVol>
                                        <StatUnit>wyszukiwań / mies.</StatUnit>
                                    </StatCard>
                                ))}
                        </StatsGrid>
                    </CardBody>
                </ChartCard>
            )}
        </Wrapper>
    );
}
