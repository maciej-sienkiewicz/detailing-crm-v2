import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Search, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { InputShell, BareInput } from '@/common/components/Form';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useProductVisits } from '../hooks/useProducts';

// „Wykorzystano podczas wizyty" — wizyty, do których dopięto ten produkt.
// Stronicowana i z wyszukiwarką, bo przy produkcie używanym na co dzień lista rośnie
// szybciej niż karta produktu jest w stanie pokazać. Klik w wiersz prowadzi do wizyty.

const PAGE_SIZE = 8;

const Wrap = styled.section` display: flex; flex-direction: column; gap: 12px; min-width: 0; `;
const Head = styled.div` display: flex; align-items: center; gap: 8px; flex-wrap: wrap; `;
const Title = styled.h2` margin: 0; font-size: 15px; font-weight: 700; color: ${st.text}; display: flex; align-items: center; gap: 8px; `;
const Count = styled.span`
    font-size: 11px; font-weight: 700; color: ${st.textMuted};
    background: ${st.bgCardAlt}; border: 1px solid ${st.border};
    padding: 2px 8px; border-radius: ${st.radiusFull};
`;
const LeadIcon = styled.span` display: inline-flex; padding-left: 12px; color: ${st.textMuted}; flex-shrink: 0; `;
const List = styled.div` display: flex; flex-direction: column; gap: 8px; min-width: 0; `;
const Row = styled.button`
    display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
    width: 100%; min-width: 0; text-align: left;
    padding: 10px 12px; font-family: inherit;
    background: ${st.bgCard}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    cursor: pointer;
    &:hover { background: ${st.bgCardAlt}; }
`;
const RowTop = styled.div`
    display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
    width: 100%; min-width: 0;
    font-size: 13.5px; font-weight: 600; color: ${st.text};
`;
const RowSub = styled.div`
    font-size: 12px; color: ${st.textMuted};
    /* Notatka bywa wklejonym adresem — ma się zawijać, a nie rozpychać karty. */
    overflow-wrap: anywhere; word-break: break-word; min-width: 0; width: 100%;
`;
const Pager = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 8px; `;
const PageBtn = styled.button`
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 10px; font-family: inherit; font-size: 12.5px; font-weight: 600;
    color: ${st.textSecondary}; background: ${st.bgCard};
    border: 1px solid ${st.border}; border-radius: ${st.radiusSm}; cursor: pointer;
    &:disabled { opacity: 0.45; cursor: default; }
    &:hover:not(:disabled) { background: ${st.bgCardAlt}; }
`;
const PageInfo = styled.span` font-size: 12.5px; color: ${st.textMuted}; `;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;

function formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ProductVisitsSection({ productId }: { productId: string }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debounced = useDebounce(search, 300);
    const { items, totalItems, totalPages, isLoading } = useProductVisits(productId, {
        search: debounced,
        page,
        limit: PAGE_SIZE,
    });

    const onSearch = (value: string) => {
        setSearch(value);
        setPage(1); // nowa fraza zaczyna od pierwszej strony, inaczej trafiłbyś w pustkę
    };

    return (
        <Wrap>
            <Head>
                <Title><CalendarCheck size={16} /> Wykorzystano podczas wizyty</Title>
                {totalItems > 0 && <Count>{totalItems}</Count>}
            </Head>

            <InputShell $compact>
                <LeadIcon><Search size={14} /></LeadIcon>
                <BareInput
                    $compact
                    placeholder="Szukaj po numerze, pojeździe lub notatce…"
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                />
            </InputShell>

            {isLoading && items.length === 0 ? (
                <Empty>Ładowanie…</Empty>
            ) : items.length === 0 ? (
                <Empty>
                    {debounced
                        ? 'Żadna wizyta nie pasuje do tej frazy.'
                        : 'Ten produkt nie został jeszcze dopięty do żadnej wizyty.'}
                </Empty>
            ) : (
                <List>
                    {items.map(v => (
                        <Row key={v.linkId} type="button" onClick={() => navigate(`/visits/${v.visitId}`)}>
                            <RowTop>
                                <span>{v.visitNumber}</span>
                                {v.vehicle && <span style={{ color: st.textSecondary, fontWeight: 500 }}>{v.vehicle}</span>}
                                <span style={{ marginLeft: 'auto', color: st.textMuted, fontWeight: 500 }}>
                                    {formatDate(v.scheduledDate)}
                                </span>
                            </RowTop>
                            {(v.title || v.note) && <RowSub>{v.title || v.note}</RowSub>}
                            <RowSub>dopiął: {v.addedByName}</RowSub>
                        </Row>
                    ))}
                </List>
            )}

            {totalPages > 1 && (
                <Pager>
                    <PageBtn type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft size={14} /> Poprzednia
                    </PageBtn>
                    <PageInfo>{page} z {totalPages}</PageInfo>
                    <PageBtn type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        Następna <ChevronRight size={14} />
                    </PageBtn>
                </Pager>
            )}
        </Wrap>
    );
}
