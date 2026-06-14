import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
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
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};
    ${hexBackdrop}

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

const TabGroup = styled.div`
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
    flex-shrink: 0;
`;

const TabBtn = styled.button<{ $active: boolean }>`
    border: none;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    padding: 6px 14px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.$active ? '#0f172a' : '#64748b'};
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'};

    &:hover {
        color: ${p => p.$active ? '#0f172a' : '#475569'};
    }
`;

const Spacer = styled.div`
    flex: 1;
`;

const SecondaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f1f5f9;
    color: #475569;
    border: 1.5px solid #e2e8f0;
    border-radius: 9999px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 180ms ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }

    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const DataContainer = styled.div`
    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: 0;
    }
`;

type VehicleTab = 'all' | 'active' | 'sold' | 'archived';

const TABS: { id: VehicleTab; label: string }[] = [
    { id: 'all',      label: 'Wszystkie' },
    { id: 'active',   label: 'Aktywne'   },
    { id: 'sold',     label: 'Sprzedane' },
    { id: 'archived', label: 'Archiwum'  },
];

export const VehicleListView = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<VehicleTab>('all');
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
            <PageHeader
                title={t.vehicles.title}
                subtitle={
                    <>
                        {t.vehicles.subtitle}
                        {pagination && (
                            <TotalChip>{pagination.totalItems} rekordów</TotalChip>
                        )}
                    </>
                }
                actions={
                    <PageHeaderPrimaryButton onClick={handleAddVehicle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t.vehicles.addVehicle}
                    </PageHeaderPrimaryButton>
                }
            />

            <ContentSection>
                <FilterBar>
                    <FilterTopRow>
                        <VehicleSearchFilter
                            value={searchInput}
                            onChange={handleSearchChange}
                        />
                        <Spacer />
                        <SecondaryBtn>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Filtry
                        </SecondaryBtn>
                        <SecondaryBtn>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Eksport
                        </SecondaryBtn>
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
