import { useState } from 'react';
import styled from 'styled-components';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import type { KeywordListItem, SortField } from '../types';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Controls = styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 360px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${p => p.theme.colors.textMuted};
    display: flex;
    align-items: center;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 12px 9px 36px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    outline: none;
    transition: border-color ${p => p.theme.transitions.fast};
    box-sizing: border-box;

    &:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgb(14 165 233 / 0.1);
    }

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
`;

const TableContainer = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${p => p.theme.fontSizes.sm};
`;

const Th = styled.th<{ $sortable?: boolean; $active?: boolean }>`
    padding: 12px 16px;
    text-align: left;
    font-weight: ${p => p.theme.fontWeights.semibold};
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    white-space: nowrap;
    cursor: ${p => p.$sortable ? 'pointer' : 'default'};
    user-select: none;

    &:hover {
        color: ${p => p.$sortable ? 'var(--brand-primary)' : undefined};
    }
`;

const ThContent = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const Tr = styled.tr`
    cursor: pointer;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    &:last-child { border-bottom: none; }

    &:hover td {
        background: ${p => p.theme.colors.surfaceHover};
    }
`;

const Td = styled.td`
    padding: 12px 16px;
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    transition: background ${p => p.theme.transitions.fast};
    white-space: nowrap;
`;

const KeywordCell = styled.div`
    font-weight: ${p => p.theme.fontWeights.medium};
    color: var(--brand-primary);
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const NumCell = styled.span`
    font-variant-numeric: tabular-nums;
`;

const MutedCell = styled.span`
    color: ${p => p.theme.colors.textMuted};
`;

const CompetitionBadge = styled.span<{ $level: string }>`
    display: inline-block;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 2px 8px;
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

const CompIndexBar = styled.div<{ $pct: number }>`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const BarTrack = styled.div`
    flex: 1;
    height: 6px;
    background: ${p => p.theme.colors.border};
    border-radius: 3px;
    min-width: 60px;
`;

const BarFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    background: var(--brand-primary);
    border-radius: 3px;
    transition: width 0.3s ease;
`;

const CountBadge = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    margin-left: auto;
`;

function formatVolume(v: number | null): string {
    if (v == null) return '—';
    return v.toLocaleString('pl-PL');
}

interface SortConfig {
    field: SortField;
    dir: 'asc' | 'desc';
}

interface Props {
    keywords: KeywordListItem[];
    onSelect: (keyword: string) => void;
}

export function KeywordsTable({ keywords, onSelect }: Props) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortConfig>({ field: 'volume', dir: 'desc' });

    const filtered = keywords.filter(k =>
        k.keyword.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        let diff = 0;
        switch (sort.field) {
            case 'keyword': diff = a.keyword.localeCompare(b.keyword, 'pl'); break;
            case 'cpc': diff = (a.cpc ?? -1) - (b.cpc ?? -1); break;
            case 'competition': diff = (a.competitionIndex ?? -1) - (b.competitionIndex ?? -1); break;
            default: diff = (a.searchVolume ?? -1) - (b.searchVolume ?? -1); break;
        }
        return sort.dir === 'asc' ? diff : -diff;
    });

    function toggleSort(field: SortField) {
        setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' });
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sort.field !== field) return <ChevronDown size={13} style={{ opacity: 0.3 }} />;
        return sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
    }

    return (
        <Wrapper>
            <Controls>
                <SearchWrapper>
                    <SearchIcon><Search size={15} /></SearchIcon>
                    <SearchInput
                        placeholder="Szukaj słowa kluczowego..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchWrapper>
                <CountBadge>{sorted.length} z {keywords.length} fraz</CountBadge>
            </Controls>

            <TableContainer>
                <Table>
                    <thead>
                        <tr>
                            <Th $sortable $active={sort.field === 'keyword'} onClick={() => toggleSort('keyword')}>
                                <ThContent>Fraza kluczowa <SortIcon field="keyword" /></ThContent>
                            </Th>
                            <Th $sortable $active={sort.field === 'volume'} onClick={() => toggleSort('volume')}>
                                <ThContent>Wol. wyszukiwań <SortIcon field="volume" /></ThContent>
                            </Th>
                            <Th $sortable $active={sort.field === 'cpc'} onClick={() => toggleSort('cpc')}>
                                <ThContent>CPC (PLN) <SortIcon field="cpc" /></ThContent>
                            </Th>
                            <Th $sortable $active={sort.field === 'competition'} onClick={() => toggleSort('competition')}>
                                <ThContent>Konkurencja <SortIcon field="competition" /></ThContent>
                            </Th>
                            <Th>Indeks komp.</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(kw => (
                            <Tr key={kw.keyword} onClick={() => onSelect(kw.keyword)}>
                                <Td>
                                    <KeywordCell title={kw.keyword}>{kw.keyword}</KeywordCell>
                                </Td>
                                <Td>
                                    {kw.searchVolume != null
                                        ? <NumCell>{formatVolume(kw.searchVolume)}</NumCell>
                                        : <MutedCell>—</MutedCell>
                                    }
                                </Td>
                                <Td>
                                    {kw.cpc != null
                                        ? <NumCell>{kw.cpc.toFixed(2)}</NumCell>
                                        : <MutedCell>—</MutedCell>
                                    }
                                </Td>
                                <Td>
                                    {kw.competition
                                        ? <CompetitionBadge $level={kw.competition}>{kw.competition}</CompetitionBadge>
                                        : <MutedCell>—</MutedCell>
                                    }
                                </Td>
                                <Td>
                                    {kw.competitionIndex != null ? (
                                        <CompIndexBar $pct={kw.competitionIndex}>
                                            <BarTrack>
                                                <BarFill $pct={kw.competitionIndex} />
                                            </BarTrack>
                                            <NumCell>{kw.competitionIndex}</NumCell>
                                        </CompIndexBar>
                                    ) : <MutedCell>—</MutedCell>}
                                </Td>
                            </Tr>
                        ))}
                        {sorted.length === 0 && (
                            <tr>
                                <Td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                                    Brak wyników dla &quot;{search}&quot;
                                </Td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </TableContainer>
        </Wrapper>
    );
}
