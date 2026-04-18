import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleSearch } from '../hooks/useVehicleSearch';
import { useVehiclePagination } from '../hooks/useVehiclePagination';
import { useDeleteVehicle } from '../hooks/useDeleteVehicle';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { VehicleTable } from '../components/VehicleTable';
import { VehicleGrid } from '../components/VehicleGrid';
import { VehicleSearchFilter } from '../components/VehicleSearchFilter';
import { VehiclePagination } from '../components/VehiclePagination';
import { CreateVehicleModal } from '../components/CreateVehicleModal';
import { t, interpolate } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';

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

const ViewHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const TitleSection = styled.div`
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

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 9999px;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover {
        background: #0284c7;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
    }

    &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    }

    svg {
        flex-shrink: 0;
    }
`;

const ContentSection = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: ${props => props.theme.colors.textMuted};
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ErrorContainer = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    color: ${props => props.theme.colors.error};
`;

const RetryButton = styled.button`
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: transparent;
    border: 1px solid var(--brand-primary);
    color: var(--brand-primary);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: var(--brand-primary);
        color: white;
    }
`;

const EmptyStateContainer = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    margin: ${props => props.theme.spacing.lg};
`;

const EmptyIcon = styled.div`
    font-size: 64px;
    margin-bottom: ${props => props.theme.spacing.md};
    opacity: 0.5;
`;

const EmptyTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
`;

const EmptyDescription = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    margin: 0;
`;

const FilterBar = styled.div`
    border-bottom: 1px solid ${st.border};
`;

const FilterTopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    flex-wrap: wrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-wrap: nowrap;
    }
`;

const DataContainer = styled.div`
    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: 0;
    }
`;

export const VehicleListView = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { searchInput, debouncedSearch, handleSearchChange } = useVehicleSearch();
    const { page, limit, goToPage, resetPagination } = useVehiclePagination();
    const { deleteVehicle } = useDeleteVehicle();
    const isDesktop = useBreakpoint('lg');

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            sortBy: 'createdAt' as const,
            sortDirection: 'desc' as const,
        }),
        [debouncedSearch, page, limit]
    );

    const { vehicles, pagination, isLoading, isError, refetch } = useVehicles(filters);

    const handleRowClick = useCallback((vehicleId: string) => {
        navigate(`/vehicles/${vehicleId}`);
    }, [navigate]);

    const handleAddVehicle = useCallback(() => {
        setIsCreateModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsCreateModalOpen(false);
    }, []);

    const handleCreateSuccess = useCallback(() => {
        resetPagination();
    }, [resetPagination]);

    const handleDelete = useCallback((vehicleId: string) => {
        deleteVehicle(vehicleId);
    }, [deleteVehicle]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <LoadingOverlay>
                    <Spinner />
                </LoadingOverlay>
            );
        }

        if (isError) {
            return (
                <ErrorContainer>
                    <p>{t.vehicles.error.loadFailed}</p>
                    <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                </ErrorContainer>
            );
        }

        if (vehicles.length === 0) {
            return debouncedSearch ? (
                <EmptyStateContainer>
                    <EmptyIcon>🔍</EmptyIcon>
                    <EmptyTitle>{t.vehicles.emptySearch.title}</EmptyTitle>
                    <EmptyDescription>
                        {interpolate(t.vehicles.emptySearch.description, { search: debouncedSearch })}
                    </EmptyDescription>
                </EmptyStateContainer>
            ) : (
                <EmptyStateContainer>
                    <EmptyIcon>🚗</EmptyIcon>
                    <EmptyTitle>{t.vehicles.empty.title}</EmptyTitle>
                    <EmptyDescription>{t.vehicles.empty.description}</EmptyDescription>
                </EmptyStateContainer>
            );
        }

        return (
            <DataContainer>
                {isDesktop ? (
                    <VehicleTable
                        vehicles={vehicles}
                        onRowClick={handleRowClick}
                        onDelete={handleDelete}
                    />
                ) : (
                    <VehicleGrid vehicles={vehicles} onCardClick={handleRowClick} />
                )}
            </DataContainer>
        );
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>{t.vehicles.title}</PageTitle>
                    <PageMeta>
                        <PageSubtitle>{t.vehicles.subtitle}</PageSubtitle>
                        {pagination && (
                            <TotalChip>{pagination.totalItems} rekordów</TotalChip>
                        )}
                    </PageMeta>
                </TitleSection>

                <AddButton onClick={handleAddVehicle}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t.vehicles.addVehicle}
                </AddButton>
            </ViewHeader>

            <ContentSection>
                <FilterBar>
                    <FilterTopRow>
                        <VehicleSearchFilter
                            value={searchInput}
                            onChange={handleSearchChange}
                        />
                    </FilterTopRow>
                </FilterBar>

                {renderContent()}

                {pagination && pagination.totalPages > 1 && (
                    <VehiclePagination
                        pagination={pagination}
                        onPageChange={goToPage}
                    />
                )}
            </ContentSection>

            <CreateVehicleModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleCreateSuccess}
            />
        </ViewContainer>
    );
};
