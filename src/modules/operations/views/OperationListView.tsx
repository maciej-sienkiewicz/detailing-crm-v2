import { useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../hooks/useOperations';
import { useOperationSearch } from '../hooks/useOperationSearch';
import { useOperationPagination } from '../hooks/useOperationPagination';
import { useOperationFilters } from '../hooks/useOperationFilters';
import { OperationalDataTable } from '../components/OperationalDataTable';
import { OperationSearchFilter } from '../components/OperationSearchFilter';
import { OperationFilterBar } from '../components/OperationFilterBar';
import { OperationPagination } from '../components/OperationPagination';
import { Button } from '@/common/components/Button';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 32px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: 48px;
    }
`;

const ViewHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
    }
`;

const TitleSection = styled.div`
    flex: 1;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
`;

const PageSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: 14px;
    color: #64748b;
`;

const HeaderActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    align-items: center;
    flex-wrap: wrap;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
        flex-direction: column;
    }
`;

const ContentSection = styled.section`
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
`;

export const OperationListView = () => {
    const navigate = useNavigate();
    const { searchInput, debouncedSearch, handleSearchChange } = useOperationSearch();
    const { page, limit, goToPage, resetPagination } = useOperationPagination();
    const {
        selectedFilter,
        handleFilterChange,
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
            sortBy: 'startDateTime' as const,
            sortDirection: 'desc' as const,
        }),
        [debouncedSearch, page, limit, apiFilters.type, apiFilters.status]
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
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Wizyty i Rezerwacje</PageTitle>
                    <PageSubtitle>Zarządzaj aktywnymi operacjami w warsztacie</PageSubtitle>
                </TitleSection>

                <HeaderActions>
                    <OperationSearchFilter
                        value={searchInput}
                        onChange={handleSearchChange}
                    />
                    <Button
                        $variant="primary"
                        onClick={() => navigate('/appointments/create')}
                    >
                        Stwórz rezerwację
                    </Button>
                </HeaderActions>
            </ViewHeader>

            <ContentSection>
                <OperationFilterBar
                    selectedFilter={selectedFilter}
                    onFilterChange={handleFilterChangeWithReset}
                    onClearFilters={handleClearFiltersWithReset}
                />

                <OperationalDataTable
                    search={debouncedSearch}
                    page={page}
                    limit={limit}
                    type={apiFilters.type}
                    status={apiFilters.status}
                />

                {pagination && pagination.totalPages > 1 && (
                    <OperationPagination
                        pagination={pagination}
                        onPageChange={goToPage}
                    />
                )}
            </ContentSection>
        </ViewContainer>
    );
};