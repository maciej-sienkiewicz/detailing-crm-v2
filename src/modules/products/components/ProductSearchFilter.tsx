import styled from 'styled-components';
import { Search, ScanLine } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Bar = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
`;

const SearchBox = styled.div`
    position: relative;
    flex: 1 1 260px;
    min-width: 0;
    svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${st.textMuted}; }
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px 10px 38px;
    font-family: inherit;
    font-size: 14px;
    color: ${st.text};
    background: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

// Chipy filtrów: odcień bez wypełnienia, wyróżnienie aktywnego obwódką i tłem (CLAUDE.md §2).
const Chip = styled.button<{ $active: boolean }>`
    padding: 8px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    transition: all 150ms ease;
    &:hover { border-color: ${st.borderHover}; }
`;

// „Skanuj" ma odcień akcji, ale nie wypełnienie — krokiem następnym na liście jest
// „Dodaj produkt" w nagłówku, nie to.
const ScanBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${st.accentBlue};
    background: ${st.bgCard};
    border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    &:hover { background: ${st.accentBlueDim}; }
`;

interface Props {
    search: string;
    onSearch: (v: string) => void;
    onlyOurs: boolean;
    onToggleOurs: () => void;
    onScan?: () => void;
}

export function ProductSearchFilter({
    search, onSearch, onlyOurs, onToggleOurs, onScan,
}: Props) {
    return (
        <Bar>
            <SearchBox>
                <Search size={16} />
                <Input
                    placeholder="Szukaj po nazwie, marce, producencie lub kodzie…"
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                />
            </SearchBox>
            <Chip type="button" $active={onlyOurs} onClick={onToggleOurs}>Nasze</Chip>
            {onScan && (
                <ScanBtn type="button" onClick={onScan}>
                    <ScanLine size={16} /> Skanuj
                </ScanBtn>
            )}
        </Bar>
    );
}
