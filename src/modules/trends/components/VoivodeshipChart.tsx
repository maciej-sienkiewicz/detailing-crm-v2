import { useState } from 'react';
import styled from 'styled-components';
import { MapPin, Search } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { useVoivodeshipComparison } from '../hooks/useVoivodeshipComparison';
import { useKeywordsList } from '../hooks/useKeywordsList';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const ControlRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`;

const SelectWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 400px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${p => p.theme.colors.textMuted};
    display: flex;
    align-items: center;
    pointer-events: none;
`;

const KeywordSelect = styled.select`
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
    appearance: none;
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgb(14 165 233 / 0.1);
    }
`;

const ChartCard = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.xl};
    padding: 24px;
    box-shadow: ${p => p.theme.shadows.sm};
`;

const ChartTitle = styled.h3`
    margin: 0 0 20px;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Empty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    flex-direction: column;
    gap: 8px;
`;

const Loading = styled(Empty)``;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-top: 20px;
`;

const StatCard = styled.div<{ $isCountry?: boolean }>`
    padding: 14px 16px;
    background: ${p => p.$isCountry ? 'rgb(14 165 233 / 0.05)' : p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.$isCountry ? 'rgb(14 165 233 / 0.2)' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StatName = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StatVolume = styled.div`
    font-size: 18px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

function formatVolume(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toLocaleString('pl-PL');
}

export function VoivodeshipChart() {
    const { data: keywordsData, isLoading: kwLoading } = useKeywordsList();
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

    const keywords = keywordsData?.keywords ?? [];
    const activeKeyword = selectedKeyword ?? (keywords[0]?.keyword ?? null);

    const { data, isLoading } = useVoivodeshipComparison(activeKeyword);

    const voivodeships = (data?.locations ?? []).filter(l => l.geoLevel === 'voivodeship');
    const country = (data?.locations ?? []).find(l => l.geoLevel === 'country');

    const chartData = voivodeships
        .filter(v => v.searchVolume != null)
        .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
        .map(v => ({
            name: v.polishName ?? v.locationName,
            volume: v.searchVolume ?? 0,
        }));

    const maxVolume = chartData[0]?.volume ?? 1;

    return (
        <Wrapper>
            <ControlRow>
                <SelectWrapper>
                    <SearchIcon><Search size={15} /></SearchIcon>
                    <KeywordSelect
                        value={activeKeyword ?? ''}
                        onChange={e => setSelectedKeyword(e.target.value)}
                        disabled={kwLoading || keywords.length === 0}
                    >
                        {kwLoading && <option>Ładowanie...</option>}
                        {keywords.map(kw => (
                            <option key={kw.keyword} value={kw.keyword}>{kw.keyword}</option>
                        ))}
                    </KeywordSelect>
                </SelectWrapper>
            </ControlRow>

            <ChartCard>
                <ChartTitle>
                    <MapPin size={16} style={{ color: 'var(--brand-primary)' }} />
                    Popularność w województwach — {activeKeyword ?? '...'}
                </ChartTitle>

                {isLoading ? (
                    <Loading>Ładowanie danych regionalnych...</Loading>
                ) : chartData.length === 0 ? (
                    <Empty>
                        <MapPin size={32} style={{ opacity: 0.3 }} />
                        Brak danych regionalnych dla wybranej frazy
                    </Empty>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 12, fill: '#475569' }}
                                tickLine={false}
                                axisLine={false}
                                width={130}
                            />
                            <Tooltip
                                formatter={(v: number) => [v.toLocaleString('pl-PL'), 'Wyszukiwania / mies.']}
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            />
                            <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={entry.name}
                                        fill={`rgba(14, 165, 233, ${0.35 + 0.65 * (entry.volume / maxVolume)})`}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {country && (
                <ChartCard>
                    <ChartTitle>Dane ogólnopolskie</ChartTitle>
                    <StatsGrid>
                        <StatCard $isCountry>
                            <StatName>Polska (łącznie)</StatName>
                            <StatVolume>{formatVolume(country.searchVolume)}</StatVolume>
                            <StatName>wyszukiwań / mies.</StatName>
                        </StatCard>
                        {voivodeships.slice(0, 5).map(v => (
                            <StatCard key={v.locationCode}>
                                <StatName>{v.polishName ?? v.locationName}</StatName>
                                <StatVolume>{formatVolume(v.searchVolume)}</StatVolume>
                                <StatName>wyszukiwań / mies.</StatName>
                            </StatCard>
                        ))}
                    </StatsGrid>
                </ChartCard>
            )}
        </Wrapper>
    );
}
