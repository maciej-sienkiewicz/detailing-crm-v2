import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronUp, ChevronDown, Search, ArrowUpRight } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { KeywordListItem, SortField } from '../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ControlBar = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`;

const SearchBox = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 380px;
`;

const SearchIco = styled.span`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${st.textMuted};
    display: flex;
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 12px 9px 36px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus {
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowBlue};
    }
    &::placeholder { color: ${st.textMuted}; }
`;

const ResultCount = styled.span`
    font-size: 13px;
    color: ${st.textMuted};
    font-weight: 500;
    margin-left: auto;
    white-space: nowrap;
`;

const shimmer = keyframes`
    0%   { opacity: 1; }
    50%  { opacity: 0.4; }
    100% { opacity: 1; }
`;

const FetchingBar = styled.div`
    height: 2px;
    background: linear-gradient(90deg, ${st.accentBlue}, ${st.accentBlueDim});
    border-radius: 2px;
    animation: ${shimmer} 1s infinite;
`;

const TableWrap = styled.div`
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    overflow-x: auto;
    box-shadow: ${st.shadowSm};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th<{ $sortable?: boolean; $active?: boolean; $align?: string }>`
    padding: 11px 16px;
    text-align: ${p => p.$align ?? 'left'};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${p => p.$active ? st.accentBlue : st.textMuted};
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
    cursor: ${p => p.$sortable ? 'pointer' : 'default'};
    user-select: none;
    transition: color ${st.transition};

    &:hover { color: ${p => p.$sortable ? st.accentBlue : undefined}; }
`;

const ThInner = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
`;

const Tr = styled.tr<{ $faded?: boolean }>`
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    opacity: ${p => p.$faded ? 0.5 : 1};

    &:last-child { border-bottom: none; }
    &:hover td { background: rgba(59,130,246,0.03); }
`;

const Td = styled.td<{ $align?: string }>`
    padding: 13px 16px;
    color: ${st.text};
    background: ${st.bgCard};
    white-space: nowrap;
    text-align: ${p => p.$align ?? 'left'};
    transition: background ${st.transition};
`;

const KeywordCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: ${st.accentBlue};
    max-width: 300px;
`;

const KwText = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const LinkIcon = styled.span`
    opacity: 0;
    color: ${st.accentBlue};
    transition: opacity ${st.transition};
    flex-shrink: 0;
    display: flex;

    ${Tr}:hover & { opacity: 1; }
`;

const Num = styled.span`
    font-variant-numeric: tabular-nums;
    font-weight: 500;
`;

const Muted = styled.span`
    color: ${st.textMuted};
    font-weight: 400;
`;

const CompBadge = styled.span<{ $level: string }>`
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    letter-spacing: 0.04em;

    ${p => {
        switch (p.$level?.toUpperCase()) {
            case 'HIGH':   return css`background: ${st.accentRedDim}; color: ${st.accentRed};`;
            case 'MEDIUM': return css`background: ${st.accentAmberDim}; color: ${st.accentAmber};`;
            case 'LOW':    return css`background: ${st.accentGreenDim}; color: ${st.accentGreen};`;
            default:       return css`background: ${st.bgCardAlt}; color: ${st.textMuted};`;
        }
    }}
`;

const IndexBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 100px;
`;

const Track = styled.div`
    flex: 1;
    height: 5px;
    background: ${st.bgCardAlt};
    border-radius: 3px;
    overflow: hidden;
`;

const Fill = styled.div<{ $pct: number; $level: string }>`
    height: 100%;
    width: ${p => p.$pct}%;
    border-radius: 3px;
    background: ${p => {
        if (p.$pct >= 70) return st.accentRed;
        if (p.$pct >= 40) return st.accentAmber;
        return st.accentGreen;
    }};
    transition: width 0.4s ease;
`;

const EmptyRow = styled.td`
    padding: 48px 20px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    background: ${st.bgCard};
`;

// ─── Logic ────────────────────────────────────────────────────────────────────

interface SortConfig { field: SortField; dir: 'asc' | 'desc'; }

interface Props {
    keywords: KeywordListItem[];
    isFetching?: boolean;
    onSelect: (keyword: string) => void;
}

export function KeywordsTable({ keywords, isFetching, onSelect }: Props) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortConfig>({ field: 'volume', dir: 'desc' });

    const filtered = keywords.filter(k =>
        k.keyword.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        let d = 0;
        switch (sort.field) {
            case 'keyword':     d = a.keyword.localeCompare(b.keyword, 'pl'); break;
            case 'cpc':         d = (a.cpc ?? -1) - (b.cpc ?? -1); break;
            case 'competition': d = (a.competitionIndex ?? -1) - (b.competitionIndex ?? -1); break;
            default:            d = (a.searchVolume ?? -1) - (b.searchVolume ?? -1); break;
        }
        return sort.dir === 'asc' ? d : -d;
    });

    function toggleSort(field: SortField) {
        setSort(s => s.field === field
            ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
            : { field, dir: 'desc' }
        );
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sort.field !== field) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
        return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    }

    return (
        <Wrapper>
            <ControlBar>
                <SearchBox>
                    <SearchIco><Search size={14} /></SearchIco>
                    <SearchInput
                        placeholder="Szukaj frazy kluczowej…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchBox>
                <ResultCount>
                    {filtered.length !== keywords.length
                        ? `${filtered.length} z ${keywords.length} fraz`
                        : `${keywords.length} fraz`}
                </ResultCount>
            </ControlBar>

            {isFetching && <FetchingBar />}

            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <Th $sortable $active={sort.field === 'keyword'} onClick={() => toggleSort('keyword')}>
                                <ThInner>Fraza kluczowa <SortIcon field="keyword" /></ThInner>
                            </Th>
                            <Th $sortable $active={sort.field === 'volume'} $align="right" onClick={() => toggleSort('volume')}>
                                <ThInner>Wyszukiwania / mies. <SortIcon field="volume" /></ThInner>
                            </Th>
                            <Th $sortable $active={sort.field === 'cpc'} $align="right" onClick={() => toggleSort('cpc')}>
                                <ThInner>CPC <SortIcon field="cpc" /></ThInner>
                            </Th>
                            <Th $sortable $active={sort.field === 'competition'} onClick={() => toggleSort('competition')}>
                                <ThInner>Konkurencja <SortIcon field="competition" /></ThInner>
                            </Th>
                            <Th>Indeks</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(kw => (
                            <Tr key={kw.keyword} onClick={() => onSelect(kw.keyword)}>
                                <Td>
                                    <KeywordCell>
                                        <KwText title={kw.keyword}>{kw.keyword}</KwText>
                                        <LinkIcon><ArrowUpRight size={13} /></LinkIcon>
                                    </KeywordCell>
                                </Td>
                                <Td $align="right">
                                    {kw.searchVolume != null
                                        ? <Num>{kw.searchVolume.toLocaleString('pl-PL')}</Num>
                                        : <Muted>—</Muted>}
                                </Td>
                                <Td $align="right">
                                    {kw.cpc != null
                                        ? <Num>{kw.cpc.toFixed(2)} zł</Num>
                                        : <Muted>—</Muted>}
                                </Td>
                                <Td>
                                    {kw.competition
                                        ? <CompBadge $level={kw.competition}>{kw.competition}</CompBadge>
                                        : <Muted>—</Muted>}
                                </Td>
                                <Td>
                                    {kw.competitionIndex != null ? (
                                        <IndexBar>
                                            <Track>
                                                <Fill $pct={kw.competitionIndex} $level={kw.competition ?? ''} />
                                            </Track>
                                            <Num style={{ fontSize: 12, minWidth: 24 }}>{kw.competitionIndex}</Num>
                                        </IndexBar>
                                    ) : <Muted>—</Muted>}
                                </Td>
                            </Tr>
                        ))}
                        {sorted.length === 0 && (
                            <tr>
                                <EmptyRow colSpan={5}>
                                    {search ? `Brak wyników dla „${search}"` : 'Brak danych'}
                                </EmptyRow>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </TableWrap>
        </Wrapper>
    );
}
