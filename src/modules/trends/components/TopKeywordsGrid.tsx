import styled, { keyframes } from 'styled-components';
import { ArrowUpRight } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { KeywordListItem } from '../types';

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Card = styled.button<{ $delay: number }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: all ${st.transition};
    animation: ${fadeUp} 300ms ease both;
    animation-delay: ${p => p.$delay}ms;

    &:hover {
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowMd}, 0 0 0 3px ${st.accentBlueDim};
        transform: translateY(-2px);
    }

    &:hover .arrow-icon {
        opacity: 1;
        transform: translate(0, 0);
    }
`;

const CardTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
`;

const RankBadge = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.accentBlue};
    letter-spacing: 0.05em;
`;

const ArrowIcon = styled.span`
    opacity: 0;
    color: ${st.accentBlue};
    transform: translate(-4px, 4px);
    transition: all ${st.transition};
    display: flex;
`;

const Keyword = styled.div`
    font-size: ${st.fontMd};
    font-weight: 600;
    color: ${st.text};
    line-height: 1.3;
    margin-bottom: 14px;
    letter-spacing: -0.1px;
    word-break: break-word;
`;

const VolumeRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 10px;
`;

const VolumeNum = styled.span`
    font-size: 28px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -1px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
`;

const VolumeUnit = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-weight: 400;
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
    margin-bottom: 10px;
`;

const MetaRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
`;

const MetaItem = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    font-weight: 500;
`;

const CompBadge = styled.span<{ $level: string }>`
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    letter-spacing: 0.04em;

    ${p => {
        switch (p.$level?.toUpperCase()) {
            case 'HIGH':   return `background: ${st.accentRedDim}; color: ${st.accentRed};`;
            case 'MEDIUM': return `background: ${st.accentAmberDim}; color: ${st.accentAmber};`;
            case 'LOW':    return `background: ${st.accentGreenDim}; color: ${st.accentGreen};`;
            default:       return `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
        }
    }}
`;

function formatVolume(v: number | null): string {
    if (v == null) return '—';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
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
                <Card key={kw.keyword} $delay={i * 30} onClick={() => onSelect(kw.keyword)}>
                    <CardTop>
                        <RankBadge>#{i + 1}</RankBadge>
                        <ArrowIcon className="arrow-icon"><ArrowUpRight size={15} /></ArrowIcon>
                    </CardTop>
                    <Keyword>{kw.keyword}</Keyword>
                    <VolumeRow>
                        <VolumeNum>{formatVolume(kw.searchVolume)}</VolumeNum>
                        <VolumeUnit>/ mies.</VolumeUnit>
                    </VolumeRow>
                    <Divider />
                    <MetaRow>
                        {kw.cpc != null && (
                            <MetaItem>CPC {kw.cpc.toFixed(2)} zł</MetaItem>
                        )}
                        {kw.competition && (
                            <CompBadge $level={kw.competition}>{kw.competition}</CompBadge>
                        )}
                        {kw.competitionIndex != null && (
                            <MetaItem>idx {kw.competitionIndex}</MetaItem>
                        )}
                    </MetaRow>
                </Card>
            ))}
        </Grid>
    );
}
