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

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const ViewHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const TitleSection = styled.div``;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const PageSubtitle = styled.p`
    margin: ${props => props.theme.spacing.xs} 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const ActionsBar = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        width: auto;
    }
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s ease;
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }
`;

const ContentSection = styled.section`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    border: 1px solid ${props => props.theme.colors.border};
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
                    <PageSubtitle>{t.vehicles.subtitle}</PageSubtitle>
                </TitleSection>

                <ActionsBar>
                    <VehicleSearchFilter
                        value={searchInput}
                        onChange={handleSearchChange}
                    />
                    <AddButton onClick={handleAddVehicle}>
                        <span>+</span>
                        {t.vehicles.addVehicle}
                    </AddButton>
                </ActionsBar>
            </ViewHeader>

            <ContentSection>
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
