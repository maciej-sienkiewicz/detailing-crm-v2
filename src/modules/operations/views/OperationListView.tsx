import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOperations } from '../hooks/useOperations';
import { useOperationSearch } from '../hooks/useOperationSearch';
import { useOperationPagination } from '../hooks/useOperationPagination';
import { useOperationFilters } from '../hooks/useOperationFilters';
import { OperationalDataTable } from '../components/OperationalDataTable';
import { OperationFilterBar } from '../components/OperationFilterBar';
import { OperationFilterPanel } from '../components/OperationFilterPanel';
import { OperationPagination } from '../components/OperationPagination';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';
import { useBreakpoint } from '@/common/hooks';
import { UnfinishedCheckInsPanel } from '@/modules/checkin';

// ─── Styled components ────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};
    ${hexBackdrop}

    @media (max-width: 639px) {
        padding: 16px;
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 32px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: 40px 48px;
    }
`;

const TotalChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1px;
`;

const ContentCard = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

// ─── Component ────────────────────────────────────────────────────────────────

const SeriesBanner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: rgba(139, 92, 246, 0.08);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 13px;
    color: #5B21B6;
`;

const SeriesBannerBtn = styled.button`
    font-size: 12px;
    font-weight: 600;
    color: #7C3AED;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    flex-shrink: 0;
`;

/**
 * Mobilny rząd akcji nad listą - w miejscu, gdzie na desktopie stoi gradientowy
 * hero. Ma być cichy: jasne tło strony, żadnej karty, tyle pikseli ile trzeba,
 * żeby licznik i "+ Wizyta" były pod ręką. Zasada: 1 piksel na mobile = 1
 * informacja albo 1 akcja.
 */
const MobileActionRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const MobileCountChip = styled.span`
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    color: ${st.textSecondary};
    font-size: 13px;
    font-weight: 500;

    strong {
        color: ${st.text};
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
`;

const MobileNewVisitBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms ease, box-shadow 150ms ease;

    &:active {
        background: #0284c7;
        box-shadow: 0 1px 4px rgba(14, 165, 233, 0.32);
    }

    span[aria-hidden='true'] {
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
    }
`;

export const OperationListView = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const seriesIdFilter = searchParams.get('seriesId');
    const { searchInput, debouncedSearch, handleSearchChange } = useOperationSearch();
    const { page, limit, goToPage, resetPagination } = useOperationPagination();
    const {
        selectedFilter,
        selectedDate,
        advancedFilters,
        activeAdvancedFilterCount,
        handleFilterChange,
        handleDateChange,
        setAdvancedFilters,
        clearFilters,
        getApiFilters,
    } = useOperationFilters();

    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const isDesktop = useBreakpoint('md');

    const apiFilters = getApiFilters();

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            type: apiFilters.type,
            status: apiFilters.status,
            deleted: apiFilters.deleted,
            scheduledDate: selectedDate,
            sortBy: 'startDateTime' as const,
            sortDirection: 'desc' as const,
            ...advancedFilters,
        }),
        [debouncedSearch, page, limit, apiFilters.type, apiFilters.status, apiFilters.deleted, selectedDate, advancedFilters]
    );

    const { pagination } = useOperations(filters);

    const handleFilterChangeWithReset = (filter: typeof selectedFilter) => {
        handleFilterChange(filter);
        resetPagination();
    };

    const handleClearFiltersWithReset = () => {
        clearFilters();
        resetPagination();
    };

    return (
        <ViewContainer>
            {isDesktop ? (
                <PageHeader
                    title="Wizyty i Rezerwacje"
                    subtitle={
                        pagination ? <TotalChip>{pagination.totalItems} rekordów</TotalChip> : undefined
                    }
                    actions={
                        <PageHeaderPrimaryButton onClick={() => navigate('/checkin/new')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nowa wizyta
                        </PageHeaderPrimaryButton>
                    }
                />
            ) : (
                /* Mobile: gradient hero znika. Zamiast tego wąski, płaski rząd -
                   licznik po lewej (kontekst listy, nie tytuł widoku), "+ Wizyta"
                   po prawej (jedyna akcja, którą hero niósł na desktopie). */
                <MobileActionRow>
                    <MobileCountChip>
                        {pagination
                            ? <><strong>{pagination.totalItems}</strong> rekordów</>
                            : <>&nbsp;</>}
                    </MobileCountChip>
                    <MobileNewVisitBtn onClick={() => navigate('/checkin/new')}>
                        <span aria-hidden="true">+</span>
                        Wizyta
                    </MobileNewVisitBtn>
                </MobileActionRow>
            )}

            {/*
              * Nad listą, nie w niej: to nie są wizyty, tylko przyjęcia w toku - auta,
              * które fizycznie stoją w warsztacie, choć ich wizyty jeszcze się nie
              * zaczęły. Panel sam się nie pokazuje, gdy nie ma czego dokańczać.
              */}
            <UnfinishedCheckInsPanel />

            {seriesIdFilter && (
                <SeriesBanner>
                    <span>🔁 Wyświetlasz wizyty z jednej serii cyklicznej</span>
                    <SeriesBannerBtn onClick={() => navigate('/operations')}>
                        Pokaż wszystkie
                    </SeriesBannerBtn>
                </SeriesBanner>
            )}

            <ContentCard>
                <OperationFilterBar
                    search={searchInput}
                    onSearchChange={handleSearchChange}
                    selectedFilter={selectedFilter}
                    selectedDate={selectedDate}
                    onFilterChange={handleFilterChangeWithReset}
                    onDateChange={handleDateChange}
                    onClearFilters={handleClearFiltersWithReset}
                    activeAdvancedFilterCount={activeAdvancedFilterCount}
                    onOpenAdvancedFilters={() => setIsFilterPanelOpen(true)}
                />

                <OperationalDataTable
                    search={debouncedSearch}
                    page={page}
                    limit={limit}
                    type={apiFilters.type}
                    status={apiFilters.status}
                    deleted={apiFilters.deleted}
                    scheduledDate={selectedDate}
                    seriesId={seriesIdFilter ?? undefined}
                />

                {pagination && pagination.totalPages > 1 && (
                    <OperationPagination
                        pagination={pagination}
                        onPageChange={goToPage}
                    />
                )}
            </ContentCard>
            <OperationFilterPanel
                isOpen={isFilterPanelOpen}
                initialFilters={advancedFilters}
                onApply={filters => { setAdvancedFilters(filters); resetPagination(); }}
                onClose={() => setIsFilterPanelOpen(false)}
            />
        </ViewContainer>
    );
};
