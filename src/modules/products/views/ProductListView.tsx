import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Package } from 'lucide-react';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageContainer } from '@/common/components/PageContainer';
import {
    PageHeader, PageHeaderPrimaryButton,
    MobilePageHeader, MobilePageHeaderButton,
} from '@/common/components/PageHeader';
import { EmptyState } from '@/common/components/EmptyState';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { useDebounce } from '@/common/hooks/useDebounce';
import { usePermissions } from '@/core/permissions';
import { useProducts } from '../hooks/useProducts';
import { ProductSearchFilter } from '../components/ProductSearchFilter';
import { ProductTable } from '../components/ProductTable';
import { ProductGrid } from '../components/ProductGrid';
import { AddProductModal } from '../components/AddProductModal';

const ViewContainer = styled.div`
    min-height: 100vh;
    background: ${st.bg};
    ${hexBackdrop}
`;
const PageBody = styled(PageContainer)` display: flex; flex-direction: column; gap: 20px; `;
const TotalChip = styled.span`
    display: inline-flex; align-items: center; padding: 2px 10px;
    background: ${st.accentBlueDim}; color: ${st.accentBlue};
    border-radius: ${st.radiusFull}; font-size: 12px; font-weight: 600;
`;
const ContentSection = styled.section`
    background: ${st.bgCard}; border: 1px solid ${st.border};
    border-radius: ${st.radius}; box-shadow: ${st.shadowSm}; overflow: hidden;
`;
const Loading = styled.div` display: flex; align-items: center; justify-content: center; min-height: 320px; color: ${st.textMuted}; `;

export function ProductListView() {
    const navigate = useNavigate();
    const isDesktop = useBreakpoint('lg');
    const { can } = usePermissions();
    const canManage = can('PRODUCTS_MANAGE');
    const canSeeCosts = can('PRODUCTS_COSTS');

    const [search, setSearch] = useState('');
    const [onlyOurs, setOnlyOurs] = useState(false);
    const [onlyFavourite, setOnlyFavourite] = useState(false);
    const [page, setPage] = useState(1);
    const [adding, setAdding] = useState(false);
    const debounced = useDebounce(search, 300);

    const { products, pagination, isLoading } = useProducts({
        search: debounced, onlyOurs, onlyFavourite, page, limit: 50, sortBy: 'name', sortDirection: 'asc',
    });

    const open = (id: string) => navigate(`/products/${id}`);
    const total = pagination?.totalItems ?? products.length;

    return (
        <ViewContainer>
            <PageBody>
                {isDesktop ? (
                    <PageHeader
                        title="Produkty"
                        subtitle="Katalog preparatów używanych w studiu"
                        actions={
                            <>
                                <TotalChip>{total}</TotalChip>
                                {canManage && (
                                    <PageHeaderPrimaryButton onClick={() => setAdding(true)}>
                                        Dodaj produkt
                                    </PageHeaderPrimaryButton>
                                )}
                            </>
                        }
                    />
                ) : (
                    <MobilePageHeader
                        icon={<Package size={18} />}
                        title="Produkty"
                        actions={canManage && (
                            <MobilePageHeaderButton onClick={() => setAdding(true)}>Dodaj</MobilePageHeaderButton>
                        )}
                    />
                )}

                <ProductSearchFilter
                    search={search}
                    onSearch={v => { setSearch(v); setPage(1); }}
                    onlyOurs={onlyOurs}
                    onlyFavourite={onlyFavourite}
                    onToggleOurs={() => { setOnlyOurs(v => !v); setPage(1); }}
                    onToggleFavourite={() => { setOnlyFavourite(v => !v); setPage(1); }}
                    onScan={canManage ? () => setAdding(true) : undefined}
                />

                <ContentSection>
                    {isLoading ? (
                        <Loading>Ładowanie…</Loading>
                    ) : products.length === 0 ? (
                        <EmptyState
                            icon={<Package size={40} />}
                            title={debounced ? 'Nic nie znaleziono' : 'Katalog jest pusty'}
                            description={debounced
                                ? 'Zmień frazy wyszukiwania albo dodaj nowy produkt.'
                                : 'Dodaj pierwszy produkt — ręcznie, z kodu kreskowego albo skanując telefonem.'}
                        />
                    ) : isDesktop ? (
                        <ProductTable products={products} canSeeCosts={canSeeCosts} onOpen={open} />
                    ) : (
                        <ProductGrid products={products} canSeeCosts={canSeeCosts} onOpen={open} />
                    )}
                </ContentSection>
            </PageBody>

            {adding && (
                <AddProductModal
                    isOpen={adding}
                    onClose={() => setAdding(false)}
                    canSeeCosts={canSeeCosts}
                    onCreated={id => { setAdding(false); open(id); }}
                />
            )}
        </ViewContainer>
    );
}
