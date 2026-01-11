import { useMemo } from 'react';
import styled from 'styled-components';
import { useOperations } from '../hooks/useOperations';
import { useOperationSearch } from '../hooks/useOperationSearch';
import { useOperationPagination } from '../hooks/useOperationPagination';
import { useOperationFilters } from '../hooks/useOperationFilters';
import { OperationalDataTable } from '../components/OperationalDataTable';
import { OperationSearchFilter } from '../components/OperationSearchFilter';
import { OperationFilterBar } from '../components/OperationFilterBar';
import { OperationPagination } from '../components/OperationPagination';

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
        align-items: center;
    }
`;

const TitleSection = styled.div``;

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

const ContentSection = styled.section`
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
`;

export const OperationListView = () => {
    const { searchInput, debouncedSearch, handleSearchChange } = useOperationSearch();
    const { page, limit, goToPage, resetPagination } = useOperationPagination();
    const {
        selectedType,
        selectedStatus,
        handleTypeChange,
        handleStatusChange,
        clearFilters,
    } = useOperationFilters();

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            type: selectedType,
            status: selectedStatus,
            sortBy: 'startDateTime' as const,
            sortDirection: 'desc' as const,
        }),
        [debouncedSearch, page, limit, selectedType, selectedStatus]
    );

    const { pagination } = useOperations(filters);

    const handleFilterChange = () => {
        resetPagination();
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Wizyty i Rezerwacje</PageTitle>
                    <PageSubtitle>Zarządzaj aktywnymi operacjami w warsztacie</PageSubtitle>
                </TitleSection>

                <OperationSearchFilter
                    value={searchInput}
                    onChange={handleSearchChange}
                />
            </ViewHeader>

            <ContentSection>
                <OperationFilterBar
                    selectedType={selectedType}
                    selectedStatus={selectedStatus}
                    onTypeChange={(type) => {
                        handleTypeChange(type);
                        handleFilterChange();
                    }}
                    onStatusChange={(status) => {
                        handleStatusChange(status);
                        handleFilterChange();
                    }}
                    onClearFilters={() => {
                        clearFilters();
                        handleFilterChange();
                    }}
                />

                <OperationalDataTable
                    search={debouncedSearch}
                    page={page}
                    limit={limit}
                    type={selectedType}
                    status={selectedStatus}
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