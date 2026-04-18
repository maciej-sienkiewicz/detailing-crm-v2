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

    &:hover:not([disabled]) {
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

type CustomerTab = 'all' | 'active' | 'overdue' | 'fleet';

const TABS: { id: CustomerTab; label: string }[] = [
    { id: 'all',     label: 'Wszyscy'    },
    { id: 'active',  label: 'Aktywni'    },
    { id: 'overdue', label: 'Zaległości' },
    { id: 'fleet',   label: 'Flota'      },
];

export const CustomerListView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<CustomerTab>('all');
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
                    <PageMeta>
                        <PageSubtitle>{t.customers.subtitle}</PageSubtitle>
                        {pagination && (
                            <TotalChip>{pagination.totalItems} rekordów</TotalChip>
                        )}
                    </PageMeta>
                </TitleSection>

                <AddButton onClick={handleOpenModal}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t.customers.addCustomer}
                </AddButton>
            </ViewHeader>

            <ContentSection>
                <FilterBar>
                    <FilterTopRow>
                        <CustomerSearchFilter
                            value={searchInput}
                            onChange={handleSearchChange}
                        />
                        <TabGroup>
                            {TABS.map(tab => (
                                <TabBtn
                                    key={tab.id}
                                    $active={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </TabBtn>
                            ))}
                        </TabGroup>
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