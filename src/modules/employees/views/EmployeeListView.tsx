import { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
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

    @media (min-width: 768px) {
        padding: 32px;
    }

    @media (min-width: 1280px) {
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
`;

const AddButton = styled.button`
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

const ToggleLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    cursor: pointer;
    white-space: nowrap;
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
    const [includeTerminated, setIncludeTerminated] = useState(false);
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filters = useMemo<EmployeeFilters>(
        () => ({ search, includeTerminated, page, limit: 50 }),
        [search, includeTerminated, page]
    );

    const { employees, pagination, isLoading, isError, refetch } = useEmployees(filters);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, []);

    const handleToggleTerminated = useCallback((checked: boolean) => {
        setIncludeTerminated(checked);
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
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Pracownicy</PageTitle>
                    <PageMeta>
                        <PageSubtitle>Zarządzaj zespołem</PageSubtitle>
                        {pagination && (
                            <TotalChip>{pagination.totalItems} pracowników</TotalChip>
                        )}
                    </PageMeta>
                </TitleSection>

                <AddButton onClick={() => setIsModalOpen(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj pracownika
                </AddButton>
            </ViewHeader>

            <ContentSection>
                <FilterBar>
                    <SearchInput
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Szukaj po nazwisku, emailu lub stanowisku..."
                    />
                    <ToggleLabel>
                        <input
                            type="checkbox"
                            checked={includeTerminated}
                            onChange={e => handleToggleTerminated(e.target.checked)}
                        />
                        Pokaż zwolnionych
                    </ToggleLabel>
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
