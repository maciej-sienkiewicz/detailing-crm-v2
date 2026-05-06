import styled from 'styled-components';
import { TrendingUp, DollarSign, Target } from 'lucide-react';
import type { KeywordListItem } from '../types';

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
`;

const Card = styled.button`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.sm};
    cursor: pointer;
    text-align: left;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgb(14 165 233 / 0.1);
        transform: translateY(-1px);
    }
`;

const Rank = styled.span`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: var(--brand-primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const Keyword = styled.div`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    line-height: 1.3;
    word-break: break-word;
`;

const Metrics = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
`;

const Metric = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: ${p => p.theme.colors.textSecondary};
`;

const Volume = styled.div`
    font-size: ${p => p.theme.fontSizes.xl};
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.5px;
`;

const VolumeLabel = styled.div`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
`;

const CompetitionBadge = styled.span<{ $level: string }>`
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 2px 7px;
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
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toString();
}

interface Props {
    keywords: KeywordListItem[];
    onSelect: (keyword: string) => void;
}

export function TopKeywordsGrid({ keywords, onSelect }: Props) {
    return (
        <Grid>
            {keywords.map((kw, i) => (
                <Card key={kw.keyword} onClick={() => onSelect(kw.keyword)}>
                    <Rank>#{i + 1}</Rank>
                    <Keyword>{kw.keyword}</Keyword>
                    <Volume>{formatVolume(kw.searchVolume)}</Volume>
                    <VolumeLabel>wyszukiwań / mies.</VolumeLabel>
                    <Metrics>
                        {kw.cpc != null && (
                            <Metric>
                                <DollarSign size={11} />
                                {kw.cpc.toFixed(2)} CPC
                            </Metric>
                        )}
                        {kw.competition && (
                            <CompetitionBadge $level={kw.competition}>
                                {kw.competition}
                            </CompetitionBadge>
                        )}
                        {kw.searchVolume != null && (
                            <Metric>
                                <TrendingUp size={11} />
                                {kw.competitionIndex ?? '—'}
                            </Metric>
                        )}
                    </Metrics>
                </Card>
            ))}
        </Grid>
    );
}
