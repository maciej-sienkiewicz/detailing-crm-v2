import { useState } from 'react';
import styled from 'styled-components';
import { Package, Plus, X, Search } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useVisitProducts } from '../hooks/useProducts';
import { useProducts } from '../hooks/useProducts';
import { useDebounce } from '@/common/hooks/useDebounce';

// Sekcja „Użyte produkty" osadzana w karcie wizyty. Czysto informacyjna: dopięcie
// produktu do wizyty, bez ilości i kosztu. „Dodaj produkt" ma odcień, nie wypełnienie —
// w oknie wizyty krokiem następnym jest co innego (CLAUDE.md §2).

const Wrap = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const List = styled.div` display: flex; flex-direction: column; gap: 8px; `;
const Item = styled.div`
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    background: ${st.bgCard};
`;
const Thumb = styled.div` width: 32px; height: 32px; border-radius: ${st.radiusSm}; background: ${st.bgCardAlt}; display: flex; align-items: center; justify-content: center; color: ${st.textMuted}; flex-shrink: 0; `;
const ItemMain = styled.div` flex: 1; min-width: 0; `;
const ItemTitle = styled.div` font-size: 14px; font-weight: 600; color: ${st.text}; `;
const ItemSub = styled.div` font-size: 12px; color: ${st.textMuted}; `;
const RemoveBtn = styled.button` background: none; border: none; color: ${st.textMuted}; cursor: pointer; padding: 4px; &:hover { color: ${st.accentRed}; } `;
const AddBtn = styled.button`
    align-self: flex-start;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; font-family: inherit; font-size: 13px; font-weight: 600;
    color: ${st.accentBlue}; background: ${st.bgCard}; border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm}; cursor: pointer;
    &:hover { background: ${st.accentBlueDim}; }
`;
const PickerBox = styled.div` border: 1px solid ${st.border}; border-radius: ${st.radiusSm}; overflow: hidden; `;
const SearchRow = styled.div` position: relative; svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${st.textMuted}; } `;
const SearchInput = styled.input` width: 100%; padding: 9px 10px 9px 34px; border: none; border-bottom: 1px solid ${st.border}; font-family: inherit; font-size: 14px; color: ${st.text}; &:focus { outline: none; } `;
const Result = styled.button` display: block; width: 100%; text-align: left; padding: 9px 12px; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; color: ${st.text}; &:hover { background: ${st.bgCardAlt}; } `;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;

interface Props {
    visitId: string;
    canManage: boolean;   // PRODUCTS_USAGE
}

export function VisitProductsSection({ visitId, canManage }: Props) {
    const { links, link, unlink } = useVisitProducts(visitId);
    const [picking, setPicking] = useState(false);
    const [search, setSearch] = useState('');
    const debounced = useDebounce(search, 300);
    const { products } = useProducts({ search: debounced, page: 1, limit: 8 });

    const linkedIds = new Set(links.map(l => l.productId));

    return (
        <Wrap>
            {links.length === 0 && !picking && <Empty>Nie dopięto jeszcze żadnego produktu do tej wizyty.</Empty>}
            <List>
                {links.map(l => (
                    <Item key={l.id}>
                        <Thumb><Package size={16} /></Thumb>
                        <ItemMain>
                            <ItemTitle>{l.productName}</ItemTitle>
                            <ItemSub>{[l.brand, l.packageLabel].filter(Boolean).join(' · ')}</ItemSub>
                        </ItemMain>
                        {canManage && (
                            <RemoveBtn type="button" onClick={() => unlink.mutate(l.id)} aria-label="Usuń powiązanie">
                                <X size={16} />
                            </RemoveBtn>
                        )}
                    </Item>
                ))}
            </List>
            {canManage && !picking && (
                <AddBtn type="button" onClick={() => setPicking(true)}>
                    <Plus size={16} /> Dodaj produkt
                </AddBtn>
            )}
            {canManage && picking && (
                <PickerBox>
                    <SearchRow>
                        <Search size={15} />
                        <SearchInput autoFocus placeholder="Szukaj produktu…" value={search} onChange={e => setSearch(e.target.value)} />
                    </SearchRow>
                    {products.filter(p => !linkedIds.has(p.id)).slice(0, 8).map(p => (
                        <Result
                            key={p.id}
                            type="button"
                            onClick={() => {
                                link.mutate({ productId: p.id }, { onSuccess: () => { setSearch(''); setPicking(false); } });
                            }}
                        >
                            {p.name} <span style={{ color: st.textMuted }}>· {p.brand}</span>
                        </Result>
                    ))}
                    {debounced && products.length === 0 && (
                        <Result as="div" style={{ color: st.textMuted, cursor: 'default' }}>Brak wyników.</Result>
                    )}
                </PickerBox>
            )}
        </Wrap>
    );
}
