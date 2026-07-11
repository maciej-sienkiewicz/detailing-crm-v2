import { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader/PageHeader';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeTable } from '../components/EmployeeTable';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import type { EmployeeFilters } from '../types';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};
    ${hexBackdrop}

    @media (min-width: 768px) {
        padding: 32px;
    }

    @media (min-width: 1280px) {
        padding: 40px 48px;
    }
`;

const ContentSection = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 200px;
    max-width: 360px;
    padding: 9px 14px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition};

    &:focus {
        border-color: ${st.accentBlue};
    }

    &::placeholder {
        color: ${st.textMuted};
    }
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorContainer = styled.div`
    padding: 48px 24px;
    text-align: center;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
`;

const RetryButton = styled.button`
    margin-top: 12px;
    padding: 8px 20px;
    background: none;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    cursor: pointer;
    display: block;
    margin-left: auto;
    margin-right: auto;

    &:hover {
        background: ${st.accentBlueDim};
    }
`;

const PaginationRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid ${st.border};
`;

const PaginationInfo = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const PaginationButtons = styled.div`
    display: flex;
    gap: 6px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    padding: 5px 10px;
    border: 1px solid ${({ $active }) => ($active ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: ${({ $active }) => ($active ? '700' : '400')};
    color: ${({ $active }) => ($active ? st.accentBlue : st.textSecondary)};
    background: ${({ $active }) => ($active ? st.accentBlueDim : 'none')};
    cursor: pointer;
    transition: all ${st.transition};

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

export const EmployeeListView = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filters = useMemo<EmployeeFilters>(
        () => ({ search, page, limit: 50 }),
        [search, page]
    );

    const { employees, pagination, isLoading, isError, refetch } = useEmployees(filters);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, []);

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
                    <p>Nie udało się załadować listy pracowników.</p>
                    <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
                </ErrorContainer>
            );
        }

        return <EmployeeTable employees={employees} />;
    };

    return (
        <ViewContainer>
            <PageHeader
                title="Pracownicy"
                subtitle={
                    pagination
                        ? `Zarządzaj zespołem · ${pagination.totalItems} ${pagination.totalItems === 1 ? 'pracownik' : 'pracowników'}`
                        : 'Zarządzaj zespołem'
                }
                actions={
                    <PageHeaderPrimaryButton onClick={() => setIsModalOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Dodaj pracownika
                    </PageHeaderPrimaryButton>
                }
            />

            <ContentSection>
                <FilterBar>
                    <SearchInput
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Szukaj po imieniu, nazwisku lub emailu..."
                    />
                </FilterBar>

                {renderContent()}

                {pagination && pagination.totalPages > 1 && (
                    <PaginationRow>
                        <PaginationInfo>
                            Strona {pagination.currentPage} z {pagination.totalPages} ({pagination.totalItems} pracowników)
                        </PaginationInfo>
                        <PaginationButtons>
                            <PageBtn
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Poprzednia
                            </PageBtn>
                            <PageBtn
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Następna
                            </PageBtn>
                        </PaginationButtons>
                    </PaginationRow>
                )}
            </ContentSection>

            <AddEmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => setIsModalOpen(false)}
            />
        </ViewContainer>
    );
};
