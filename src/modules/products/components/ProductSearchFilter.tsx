import styled from 'styled-components';
import { Search } from 'lucide-react';
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

// Filtry są listami wyboru, nie przełącznikami: „tylko nasze" i ocena mają po
// kilka stanów, a chip potrafi pokazać tylko dwa. Wygląd celowo taki sam jak pole
// wyszukiwania — to jeden pasek narzędzi, więc nic w nim nie jest wypełnione
// kolorem (CLAUDE.md §2); krokiem następnym na tej stronie jest „Dodaj produkt".
const Combo = styled.select`
    flex: 0 1 auto;
    padding: 10px 38px 10px 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: ${st.text};
    background-color: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    &:hover { border-color: ${st.borderHover}; }
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

/** Ocena jako tekst, bo „bez oceny" i „nie filtruj" to dwa różne stany — number ich nie rozróżni. */
export type RatingFilter = '' | '5' | '4' | '3' | '2' | '1' | 'none';

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
    { value: '', label: 'Wszystkie oceny' },
    { value: '5', label: '5 gwiazdek' },
    { value: '4', label: '4 gwiazdki' },
    { value: '3', label: '3 gwiazdki' },
    { value: '2', label: '2 gwiazdki' },
    { value: '1', label: '1 gwiazdka' },
    { value: 'none', label: 'Bez oceny' },
];

interface Props {
    search: string;
    onSearch: (v: string) => void;
    onlyOurs: boolean;
    onChangeOurs: (v: boolean) => void;
    rating: RatingFilter;
    onChangeRating: (v: RatingFilter) => void;
}

export function ProductSearchFilter({
    search, onSearch, onlyOurs, onChangeOurs, rating, onChangeRating,
}: Props) {
    return (
        <Bar>
            <SearchBox>
                <Search size={16} />
                <Input
                    placeholder="Szukaj po nazwie, marce lub kodzie…"
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                />
            </SearchBox>

            <Combo
                aria-label="Zakres katalogu"
                value={onlyOurs ? 'ours' : 'all'}
                onChange={e => onChangeOurs(e.target.value === 'ours')}
            >
                <option value="all">Wszystkie</option>
                <option value="ours">Tylko nasze</option>
            </Combo>

            <Combo
                aria-label="Ocena"
                value={rating}
                onChange={e => onChangeRating(e.target.value as RatingFilter)}
            >
                {RATING_OPTIONS.map(o => (
                    <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
            </Combo>
        </Bar>
    );
}
