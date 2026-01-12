// src/modules/services/views/ServiceListView.tsx
import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useServices } from '../hooks/useServices';
import { ServiceTable } from '../components/ServiceTable';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { EmptyState } from '@/common/components/EmptyState';
import { Toggle } from '@/common/components/Toggle';
import { useDebounce } from '@/common/hooks';
import { t, interpolate } from '@/common/i18n';
import type { Service } from '../types';

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

const SearchContainer = styled.div`
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        max-width: 320px;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    transition: border-color ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
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
    transition: opacity ${props => props.theme.transitions.fast};
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }
`;

const FilterSection = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
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
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
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
    border: 1px solid ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.primary};
        color: white;
    }
`;

export const ServiceListView = () => {
    const [searchInput, setSearchInput] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>();

    const debouncedSearch = useDebounce(searchInput, 300);

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page: 1,
            limit: 50,
            sortBy: 'name' as const,
            sortDirection: 'asc' as const,
            showInactive,
        }),
        [debouncedSearch, showInactive]
    );

    const { services, isLoading, isError, refetch } = useServices(filters);

    const handleAddService = () => {
        setEditingService(undefined);
        setIsModalOpen(true);
    };

    const handleEditService = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(undefined);
    };

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
                    <p>{t.services.error.loadFailed}</p>
                    <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                </ErrorContainer>
            );
        }

        if (services.length === 0) {
            return debouncedSearch ? (
                <EmptyState
                    title={t.services.emptySearch.title}
                    description={interpolate(t.services.emptySearch.description, { search: debouncedSearch })}
                />
            ) : (
                <EmptyState
                    title={t.services.empty.title}
                    description={t.services.empty.description}
                />
            );
        }

        return <ServiceTable services={services} onEdit={handleEditService} />;
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>{t.services.title}</PageTitle>
                    <PageSubtitle>{t.services.subtitle}</PageSubtitle>
                </TitleSection>

                <ActionsBar>
                    <SearchContainer>
                        <SearchInput
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t.services.searchPlaceholder}
                        />
                    </SearchContainer>
                    <AddButton onClick={handleAddService}>
                        <span>+</span>
                        {t.services.addService}
                    </AddButton>
                </ActionsBar>
            </ViewHeader>

            <FilterSection>
                <Toggle
                    checked={showInactive}
                    onChange={setShowInactive}
                    label={t.services.showInactive}
                />
            </FilterSection>

            <ContentSection>
                {renderContent()}
            </ContentSection>

            <ServiceFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                service={editingService}
                onSuccess={refetch}
            />
        </ViewContainer>
    );
};