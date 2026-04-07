import { useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../hooks/useOperations';
import { useOperationSearch } from '../hooks/useOperationSearch';
import { useOperationPagination } from '../hooks/useOperationPagination';
import { useOperationFilters } from '../hooks/useOperationFilters';
import { OperationalDataTable } from '../components/OperationalDataTable';
import { OperationFilterBar } from '../components/OperationFilterBar';
import { OperationPagination } from '../components/OperationPagination';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Styled components ────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 32px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: 40px 48px;
    }
`;

const PageHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const TitleBlock = styled.div`
    flex: 1;
    min-width: 0;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    line-height: 1.2;
`;

const PageMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
`;

const PageSubtitle = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
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

const NewButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all ${st.transition};
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);

    &:hover {
        background: #1D4ED8;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }

    &:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);
    }

    svg {
        flex-shrink: 0;
    }
`;

const ContentCard = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const OperationListView = () => {
    const navigate = useNavigate();
    const { searchInput, debouncedSearch, handleSearchChange } = useOperationSearch();
    const { page, limit, goToPage, resetPagination } = useOperationPagination();
    const {
        selectedFilter,
        selectedDate,
        handleFilterChange,
        handleDateChange,
        clearFilters,
        getApiFilters,
    } = useOperationFilters();

    const apiFilters = getApiFilters();

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            type: apiFilters.type,
            status: apiFilters.status,
            scheduledDate: selectedDate,
            sortBy: 'startDateTime' as const,
            sortDirection: 'desc' as const,
        }),
        [debouncedSearch, page, limit, apiFilters.type, apiFilters.status, selectedDate]
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
            <PageHeader>
                <TitleBlock>
                    <PageTitle>Wizyty i Rezerwacje</PageTitle>
                    <PageMeta>
                        <PageSubtitle>Zarządzaj aktywnymi operacjami w warsztacie</PageSubtitle>
                        {pagination && (
                            <TotalChip>{pagination.totalItems} rekordów</TotalChip>
                        )}
                    </PageMeta>
                </TitleBlock>

                <NewButton onClick={() => navigate('/checkin/new')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nowa wizyta
                </NewButton>
            </PageHeader>

            <ContentCard>
                <OperationFilterBar
                    search={searchInput}
                    onSearchChange={handleSearchChange}
                    selectedFilter={selectedFilter}
                    selectedDate={selectedDate}
                    onFilterChange={handleFilterChangeWithReset}
                    onDateChange={handleDateChange}
                    onClearFilters={handleClearFiltersWithReset}
                />

                <OperationalDataTable
                    search={debouncedSearch}
                    page={page}
                    limit={limit}
                    type={apiFilters.type}
                    status={apiFilters.status}
                    scheduledDate={selectedDate}
                />

                {pagination && pagination.totalPages > 1 && (
                    <OperationPagination
                        pagination={pagination}
                        onPageChange={goToPage}
                    />
                )}
            </ContentCard>
        </ViewContainer>
    );
};
