import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Package, X, Search, Camera, Plus, Loader2 } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { InputShell, BareInput } from '@/common/components/Form';
import { useVisitProducts, useProducts } from '../hooks/useProducts';
import { useDebounce } from '@/common/hooks/useDebounce';
import { AddProductModal } from './AddProductModal';

// Sekcja „Użyte produkty" osadzana w karcie wizyty. Czysto informacyjna: dopięcie
// produktu do wizyty, bez ilości i kosztu.
//
// JEDNO pole (nie dwa przyciski) — wzorzec z pól wyszukiwarki: wpisujesz nazwę,
// dostajesz podpowiedzi z katalogu, a gdy pozycji nie ma, ta sama lista oferuje
// „Dodaj nowy produkt". Aparat siedzi wmontowany w polu (jak w oknie nowego
// produktu) i uruchamia skan — na telefonie aparat, na desktopie kod QR.
// W oknie wizyty żadne z tych działań nie jest KROKIEM NASTĘPNYM, więc pole i jego
// przyciski noszą odcień bez wypełnienia (CLAUDE.md §2); jedyny wypełniony przycisk
// pojawia się dopiero w otwartym oknie „Nowy produkt" (wyjątek otwartego edytora).

const Wrap = styled.div` display: flex; flex-direction: column; gap: 12px; `;
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

// Pole „wyszukaj lub dodaj" — kreska pod ikoną lupy po lewej, aparat wmontowany po prawej.
const Combo = styled.div` position: relative; `;
const LeadIcon = styled.span` display: inline-flex; padding-left: 12px; color: ${st.textMuted}; flex-shrink: 0; `;
const CamBtn = styled.button`
    display: flex; align-items: center; align-self: stretch;
    padding: 0 12px; border: none; border-left: 1px solid ${st.border}; background: none;
    color: ${st.accentBlue}; cursor: pointer; border-radius: 0 8px 8px 0;
    transition: background 0.15s ease;
    &:hover { background: ${st.accentBlueDim}; }
`;
// Lista podpowiedzi żyje w PORTALU (document.body) z pozycją `fixed` mierzoną od pola.
// Sekcja wizyty ma `overflow: hidden` (zaokrąglone rogi karty), więc zwykły `absolute`
// wewnątrz niej ucinał listę razem z komponentem — żaden z-index tego nie obchodzi,
// bo przycięcie robi rodzic, nie warstwa.
const Menu = styled.div`
    position: fixed; z-index: 1200;
    background: ${st.bgCard}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd}; overflow: hidden; max-height: 280px; overflow-y: auto;
`;
const Option = styled.button`
    display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
    padding: 10px 12px; background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 13px; color: ${st.text};
    &:hover { background: ${st.bgCardAlt}; }
    & + & { border-top: 1px solid ${st.border}; }
`;
const AddNew = styled(Option)` color: ${st.accentBlue}; font-weight: 600; `;
const MenuHint = styled.div` padding: 10px 12px; font-size: 12.5px; color: ${st.textMuted}; `;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;

interface Props {
    visitId: string;
    /** PRODUCTS_USAGE — dopinanie/odpinanie produktów wizyty. */
    canUsage: boolean;
    /** PRODUCTS_MANAGE — dodawanie zupełnie nowego produktu (ręcznie/kod/skan). */
    canManageProducts: boolean;
    /** PRODUCTS_COSTS — czy w oknie nowego produktu pokazać cenę jednostkową. */
    canSeeCosts: boolean;
}

type Adding = { name?: string; scan?: boolean } | null;

export function VisitProductsSection({ visitId, canUsage, canManageProducts, canSeeCosts }: Props) {
    const { links, link, unlink } = useVisitProducts(visitId);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState<Adding>(null);
    const debounced = useDebounce(search, 250);
    const { products, isLoading } = useProducts({ search: debounced, page: 1, limit: 8 });
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

    const linkedIds = new Set(links.map(l => l.productId));
    const suggestions = products.filter(p => !linkedIds.has(p.id)).slice(0, 8);
    const trimmed = search.trim();
    const exactHit = suggestions.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
    const showAddNew = canManageProducts && trimmed.length >= 2 && !exactHit;

    // Klik poza polem I poza listą zamyka ją. Lista jest w portalu, więc DOM-owo nie
    // siedzi w wrapRef — bez menuRef mousedown na opcji zamykałby listę, zanim doszłoby
    // do click, i wybór przepadałby.
    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const linkProduct = (productId: string) =>
        link.mutate({ productId }, { onSuccess: () => { setSearch(''); setOpen(false); } });

    const menuVisible = open && trimmed.length > 0;

    // Pozycja listy = dolna krawędź pola w układzie okna. Mierzymy przy otwarciu i przy
    // każdym przewinięciu/zmianie rozmiaru (capture: true łapie scroll w kontenerach).
    const measure = useCallback(() => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (r) setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }, []);
    useLayoutEffect(() => {
        if (!menuVisible) return;
        measure();
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [menuVisible, measure]);

    return (
        <Wrap>
            {links.length === 0 && (
                <Empty>Nie dopięto jeszcze żadnego produktu do tej wizyty.</Empty>
            )}
            {links.length > 0 && (
                <List>
                    {links.map(l => (
                        <Item key={l.id}>
                            <Thumb><Package size={16} /></Thumb>
                            <ItemMain>
                                <ItemTitle>{l.productName}</ItemTitle>
                                <ItemSub>{[l.brand, l.packageLabel].filter(Boolean).join(' · ')}</ItemSub>
                            </ItemMain>
                            {canUsage && (
                                <RemoveBtn type="button" onClick={() => unlink.mutate(l.id)} aria-label="Usuń powiązanie">
                                    <X size={16} />
                                </RemoveBtn>
                            )}
                        </Item>
                    ))}
                </List>
            )}

            {canUsage && (
                <Combo ref={wrapRef}>
                    <InputShell>
                        <LeadIcon><Search size={15} /></LeadIcon>
                        <BareInput
                            placeholder="Wpisz nazwę produktu, aby dopiąć lub dodać nowy…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setOpen(true); }}
                            onFocus={() => setOpen(true)}
                        />
                        {canManageProducts && (
                            <CamBtn
                                type="button"
                                onClick={() => setAdding({ scan: true })}
                                aria-label="Zeskanuj kod produktu"
                                title="Zeskanuj kod (telefonem lub aparatem)"
                            >
                                <Camera size={16} />
                            </CamBtn>
                        )}
                    </InputShell>

                    {menuVisible && menuRect && createPortal(
                        <Menu ref={menuRef} style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}>
                            {suggestions.map(p => (
                                <Option key={p.id} type="button" onClick={() => linkProduct(p.id)}>
                                    <Package size={14} color={st.textMuted} />
                                    <span>{p.name} <span style={{ color: st.textMuted }}>· {p.brand}</span></span>
                                </Option>
                            ))}
                            {isLoading && suggestions.length === 0 && (
                                <MenuHint><Loader2 size={13} style={{ verticalAlign: '-2px' }} /> Szukam…</MenuHint>
                            )}
                            {showAddNew && (
                                <AddNew type="button" onClick={() => { setAdding({ name: trimmed }); setOpen(false); }}>
                                    <Plus size={14} /> Dodaj nowy produkt „{trimmed}"
                                </AddNew>
                            )}
                            {!isLoading && suggestions.length === 0 && !showAddNew && (
                                <MenuHint>
                                    {canManageProducts
                                        ? 'Brak produktów w katalogu.'
                                        : 'Brak wyników — dodanie nowego produktu wymaga uprawnienia.'}
                                </MenuHint>
                            )}
                        </Menu>,
                        document.body,
                    )}
                </Combo>
            )}

            {adding && (
                <AddProductModal
                    isOpen
                    onClose={() => setAdding(null)}
                    canSeeCosts={canSeeCosts}
                    initialName={adding.name}
                    autoScan={adding.scan}
                    onCreated={(id) => {
                        // Nowy (lub rozpoznany) produkt trafił do katalogu — od razu podpinamy go do wizyty.
                        setAdding(null);
                        setSearch('');
                        link.mutate({ productId: id });
                    }}
                />
            )}
        </Wrap>
    );
}
