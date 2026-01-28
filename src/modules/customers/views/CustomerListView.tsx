import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { useCustomerPagination } from '../hooks/useCustomerPagination';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { CustomerSearchFilter } from '../components/CustomerSearchFilter';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerGrid } from '../components/CustomerGrid';
import { CustomerPagination } from '../components/CustomerPagination';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { EmptyState } from '../components/EmptyState';
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

const DataContainer = styled.div`
    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: 0;
    }
`;

export const CustomerListView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { searchInput, debouncedSearch, handleSearchChange } = useCustomerSearch();
    const { page, limit, goToPage, resetPagination } = useCustomerPagination();
    const isDesktop = useBreakpoint('lg');

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            sortBy: 'lastName' as const,
            sortDirection: 'asc' as const,
        }),
        [debouncedSearch, page, limit]
    );

    const { customers, pagination, isLoading, isError, refetch } = useCustomers(filters);

    const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
    const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

    const handleCustomerCreated = useCallback(() => {
        resetPagination();
        handleSearchChange('');
    }, [resetPagination, handleSearchChange]);

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
                    <p>{t.customers.error.loadFailed}</p>
                    <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                </ErrorContainer>
            );
        }

        if (customers.length === 0) {
            return debouncedSearch ? (
                <EmptyState
                    title={t.customers.emptySearch.title}
                    description={interpolate(t.customers.emptySearch.description, { search: debouncedSearch })}
                />
            ) : (
                <EmptyState
                    title={t.customers.empty.title}
                    description={t.customers.empty.description}
                />
            );
        }

        return (
            <DataContainer>
                {isDesktop ? (
                    <CustomerTable customers={customers} />
                ) : (
                    <CustomerGrid customers={customers} />
                )}
            </DataContainer>
        );
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>{t.customers.title}</PageTitle>
                    <PageSubtitle>{t.customers.subtitle}</PageSubtitle>
                </TitleSection>

                <ActionsBar>
                    <CustomerSearchFilter
                        value={searchInput}
                        onChange={handleSearchChange}
                    />
                    <AddButton onClick={handleOpenModal}>
                        <span>+</span>
                        {t.customers.addCustomer}
                    </AddButton>
                </ActionsBar>
            </ViewHeader>

            <ContentSection>
                {renderContent()}

                {pagination && pagination.totalPages > 1 && (
                    <CustomerPagination
                        pagination={pagination}
                        onPageChange={goToPage}
                    />
                )}
            </ContentSection>

            <AddCustomerModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={() => handleCustomerCreated()}
            />
        </ViewContainer>
    );
};