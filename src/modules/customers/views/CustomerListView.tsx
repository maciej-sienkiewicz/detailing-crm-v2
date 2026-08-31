import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { useCustomers } from '../hooks/useCustomers';
import { useDeleteCustomer } from '../hooks/useDeleteCustomer';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { useCustomerPagination } from '../hooks/useCustomerPagination';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { CustomerSearchFilter } from '../components/CustomerSearchFilter';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerGrid } from '../components/CustomerGrid';
import { CustomerPagination } from '../components/CustomerPagination';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { CustomerFilterPanel } from '../components/CustomerFilterPanel';
import { ExportModal } from '../components/ExportModal';
import { ImportContactsModal } from '../components/ImportContactsModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { EmptyState } from '../components/EmptyState';
import { t, interpolate } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CustomerAdvancedFilters, CustomerSortField, SortDirection } from '../types';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';

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

    /* Wyszukiwarka i filtry w jednym wierszu: pole bierze tyle, ile zostaje
       po przycisku ikonowym. */
    @media (max-width: 767px) {
        flex-wrap: nowrap;
        gap: 8px;
        padding: 12px 14px;
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

    /* Na telefonie to pole wyszukiwania ma zająć wolne miejsce, nie odstęp. */
    @media (max-width: 767px) {
        display: none;
    }
`;

const SecondaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    @media (max-width: 767px) { padding: 10px 12px; }
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

/* Eksport to operacja biurkowa — plik i tak trafia na dysk, a na telefonie
   przycisk tylko zabierał miejsce w wierszu filtrów. */
const DesktopOnlyBtn = styled(SecondaryBtn)`
    @media (max-width: 767px) {
        display: none;
    }
`;

/* Sama ikonka lejka mówi to samo co ikonka z napisem, a zwalnia miejsce,
   żeby wyszukiwarka i filtry zmieściły się w jednym wierszu. */
const SecondaryBtnLabel = styled.span`
    @media (max-width: 767px) {
        display: none;
    }
`;

const FilterBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: #0ea5e9;
    color: #fff;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
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
];

const EMPTY_ADVANCED_FILTERS: CustomerAdvancedFilters = {};

const countActiveFilters = (f: CustomerAdvancedFilters): number => {
    let n = 0;
    if (f.customerType && f.customerType !== 'all') n++;
    if (f.services?.length) n++;
    if (f.lastVisitWithinDays) n++;
    if (f.notVisitedSinceDays) n++;
    if (f.vehicleBrand) n++;
    if (f.vehicleModel) n++;
    if (f.minRevenue) n++;
    if (f.maxRevenue) n++;
    if (f.minVisits) n++;
    if (f.maxVisits) n++;
    return n;
};

export const CustomerListView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<CustomerAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const deleteCustomer = useDeleteCustomer();
    const [activeTab, setActiveTab] = useState<CustomerTab>('all');
    const [sortBy, setSortBy] = useState<CustomerSortField>('lastActivity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const { searchInput, debouncedSearch, handleSearchChange } = useCustomerSearch();
    const { page, limit, goToPage, resetPagination } = useCustomerPagination();
    const isDesktop = useBreakpoint('lg');

    const activeFilterCount = countActiveFilters(appliedFilters);

    const handleSort = useCallback((field: CustomerSortField) => {
        if (field === sortBy) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
        resetPagination();
    }, [sortBy, resetPagination]);

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page,
            limit,
            sortBy,
            sortDirection,
            ...appliedFilters,
        }),
        [debouncedSearch, page, limit, sortBy, sortDirection, appliedFilters]
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
                    <CustomerTable
                        customers={customers}
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onDelete={id => setPendingDeleteId(id)}
                    />
                ) : (
                    <CustomerGrid customers={customers} />
                )}
            </DataContainer>
        );
    };

    return (
        <ViewContainer>
            <PageHeader
                title={t.customers.title}
                subtitle={
                    <>
                        {t.customers.subtitle}
                        {pagination && (
                            <TotalChip>{pagination.totalItems} rekordów</TotalChip>
                        )}
                    </>
                }
                actions={
                    <PageHeaderPrimaryButton onClick={handleOpenModal}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t.customers.addCustomer}
                    </PageHeaderPrimaryButton>
                }
            />

            <ContentSection>
                <FilterBar>
                    <FilterTopRow>
                        <CustomerSearchFilter
                            value={searchInput}
                            onChange={handleSearchChange}
                        />
                        <Spacer />
                        <SecondaryBtn
                            onClick={() => setIsFilterPanelOpen(true)}
                            aria-label="Filtry"
                            title="Filtry"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <SecondaryBtnLabel>Filtry</SecondaryBtnLabel>
                            {activeFilterCount > 0 && (
                                <FilterBadge>{activeFilterCount}</FilterBadge>
                            )}
                        </SecondaryBtn>
                        {/* Import stoi obok eksportu i tak samo jest schowany na telefonie:
                            przeglądanie kilkuset kontaktów i odznaczanie ich to praca na
                            duży ekran — telefon w tym przebiegu tylko wysyła dane. */}
                        <DesktopOnlyBtn onClick={() => setIsImportModalOpen(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 18h.01M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
                            </svg>
                            Import z telefonu
                        </DesktopOnlyBtn>
                        <DesktopOnlyBtn onClick={() => setIsExportModalOpen(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Eksport
                        </DesktopOnlyBtn>
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

            <CustomerFilterPanel
                isOpen={isFilterPanelOpen}
                initialFilters={appliedFilters}
                onApply={filters => {
                    setAppliedFilters(filters);
                    resetPagination();
                }}
                onClose={() => setIsFilterPanelOpen(false)}
            />

            {/* Montowane warunkowo, nie sterowane `isOpen`: kreator importu ma kilka
                kroków i sesję po stronie serwera, więc każde otwarcie musi zaczynać się
                od czystego stanu — odmontowanie załatwia to bez ani jednego efektu. */}
            {isImportModalOpen && (
                <ImportContactsModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImported={() => handleCustomerCreated()}
                />
            )}

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                currentFilters={{
                    search: debouncedSearch,
                    sortBy,
                    sortDirection,
                    ...appliedFilters,
                }}
                filteredCount={pagination?.totalItems ?? 0}
            />

            {/* Usunięcie = anonimizacja RODO. Komunikat mówi wprost, co znika,
                a co zostaje — „nie można cofnąć" bez tej informacji brzmiałoby
                jak skasowanie całej historii współpracy. */}
            <ConfirmationModal
                isOpen={pendingDeleteId !== null}
                title="Usunąć tego klienta?"
                message="Dane osobowe (imię i nazwisko, kontakt, adresy) zostaną nieodwracalnie wymazane, a powiązania z pojazdami usunięte. Historia wizyt, statystyki i podpisane dokumenty zostaną zachowane — wymaga tego prawo."
                variant="danger"
                confirmText="Usuń dane klienta"
                cancelText="Anuluj"
                onConfirm={() => {
                    const id = pendingDeleteId;
                    setPendingDeleteId(null);
                    if (id) deleteCustomer.mutate(id);
                }}
                onCancel={() => setPendingDeleteId(null)}
            />
        </ViewContainer>
    );
};