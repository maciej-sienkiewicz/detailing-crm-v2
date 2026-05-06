import styled from 'styled-components';
import { TrendingUp, Search, DollarSign, BarChart2 } from 'lucide-react';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile/StatTile';
import type { KeywordListItem } from '../types';

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
`;

interface Props {
    keywords: KeywordListItem[];
    locationName: string;
    isLoading: boolean;
}

function avg(nums: (number | null)[]): number {
    const valid = nums.filter((n): n is number => n != null);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function formatVolume(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toLocaleString('pl-PL');
}

export function TrendsSummaryTiles({ keywords, locationName, isLoading }: Props) {
    if (isLoading) {
        return (
            <Grid>
                <StatTileSkeleton compact accentColor="#3B82F6" bgGradient="linear-gradient(135deg,#fff,rgba(59,130,246,.04))" iconBg="rgba(59,130,246,.10)" />
                <StatTileSkeleton compact accentColor="#10B981" bgGradient="linear-gradient(135deg,#fff,rgba(16,185,129,.04))" iconBg="rgba(16,185,129,.10)" />
                <StatTileSkeleton compact accentColor="#0ea5e9" bgGradient="linear-gradient(135deg,#fff,rgba(14,165,233,.04))" iconBg="rgba(14,165,233,.10)" />
                <StatTileSkeleton compact accentColor="#F59E0B" bgGradient="linear-gradient(135deg,#fff,rgba(245,158,11,.04))" iconBg="rgba(245,158,11,.10)" />
            </Grid>
        );
    }

    const withVolume = keywords.filter(k => k.searchVolume != null);
    const totalVol = withVolume.reduce((s, k) => s + (k.searchVolume ?? 0), 0);
    const avgVol = avg(keywords.map(k => k.searchVolume));
    const avgCpc = keywords.filter(k => k.cpc != null).length > 0
        ? (keywords.filter(k => k.cpc != null).reduce((s, k) => s + (k.cpc ?? 0), 0) / keywords.filter(k => k.cpc != null).length).toFixed(2)
        : '—';
    const topKeyword = [...keywords].sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))[0];

    return (
        <Grid>
            <StatTile
                compact
                accentColor="#3B82F6"
                bgGradient="linear-gradient(135deg,#fff 0%,rgba(59,130,246,.04) 100%)"
                iconBg="rgba(59,130,246,.10)"
                icon={Search}
                value={keywords.length}
                label="Śledzone frazy"
                subContent={<span style={{ fontSize: 12, color: '#94a3b8' }}>{locationName}</span>}
            />
            <StatTile
                compact
                accentColor="#10B981"
                bgGradient="linear-gradient(135deg,#fff 0%,rgba(16,185,129,.04) 100%)"
                iconBg="rgba(16,185,129,.10)"
                icon={TrendingUp}
                value={formatVolume(totalVol)}
                label="Łączny wolumen"
                subContent={<span style={{ fontSize: 12, color: '#94a3b8' }}>wyszukiwań / mies.</span>}
            />
            <StatTile
                compact
                accentColor="#0ea5e9"
                bgGradient="linear-gradient(135deg,#fff 0%,rgba(14,165,233,.04) 100%)"
                iconBg="rgba(14,165,233,.10)"
                icon={BarChart2}
                value={formatVolume(avgVol)}
                label="Śr. wolumen"
                subContent={<span style={{ fontSize: 12, color: '#94a3b8' }}>na frazę</span>}
            />
            <StatTile
                compact
                accentColor="#F59E0B"
                bgGradient="linear-gradient(135deg,#fff 0%,rgba(245,158,11,.04) 100%)"
                iconBg="rgba(245,158,11,.10)"
                icon={DollarSign}
                value={avgCpc !== '—' ? `${avgCpc} zł` : '—'}
                label="Śr. CPC"
                subContent={
                    topKeyword
                        ? <span style={{ fontSize: 12, color: '#94a3b8' }} title={topKeyword.keyword}>
                            Top: {topKeyword.keyword.length > 20
                                ? topKeyword.keyword.slice(0, 20) + '…'
                                : topKeyword.keyword}
                          </span>
                        : undefined
                }
            />
        </Grid>
    );
}
