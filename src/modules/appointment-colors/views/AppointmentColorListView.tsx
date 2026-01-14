// src/modules/appointment-colors/views/AppointmentColorListView.tsx
import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useAppointmentColors, useDeleteAppointmentColor } from '../hooks/useAppointmentColors';
import { AppointmentColorTable } from '../components/AppointmentColorTable';
import { AppointmentColorFormModal } from '../components/AppointmentColorFormModal';
import { EmptyState } from '@/common/components/EmptyState';
import { Toggle } from '@/common/components/Toggle';
import { useDebounce } from '@/common/hooks';
import { t, interpolate } from '@/common/i18n';
import type { AppointmentColor } from '../types';

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

const ConfirmDialog = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ConfirmBox = styled.div`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    max-width: 400px;
    width: 90%;
    box-shadow: ${props => props.theme.shadows.xl};
`;

const ConfirmTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md} 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
`;

const ConfirmMessage = styled.p`
    margin: 0 0 ${props => props.theme.spacing.lg} 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const ConfirmActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ $variant?: 'danger' | 'secondary' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border: 1px solid ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.border};
    background: ${props => props.$variant === 'danger' ? props.theme.colors.error : 'transparent'};
    color: ${props => props.$variant === 'danger' ? 'white' : props.theme.colors.text};

    &:hover {
        opacity: 0.9;
    }
`;

export const AppointmentColorListView = () => {
    const [searchInput, setSearchInput] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<AppointmentColor | undefined>();
    const [deletingColor, setDeletingColor] = useState<AppointmentColor | null>(null);

    const debouncedSearch = useDebounce(searchInput, 300);

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            page: 1,
            limit: 50,
            showInactive,
        }),
        [debouncedSearch, showInactive]
    );

    const { colors, isLoading, isError, refetch } = useAppointmentColors(filters);
    const deleteMutation = useDeleteAppointmentColor();

    const handleAddColor = () => {
        setEditingColor(undefined);
        setIsModalOpen(true);
    };

    const handleEditColor = (color: AppointmentColor) => {
        setEditingColor(color);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingColor(undefined);
    };

    const handleDeleteClick = (color: AppointmentColor) => {
        setDeletingColor(color);
    };

    const handleConfirmDelete = async () => {
        if (!deletingColor) return;

        try {
            await deleteMutation.mutateAsync(deletingColor.id);
            setDeletingColor(null);
            refetch();
        } catch (error) {
            console.error('Failed to delete color:', error);
        }
    };

    const handleCancelDelete = () => {
        setDeletingColor(null);
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
                    <p>Nie udało się załadować kolorów wizyt</p>
                    <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                </ErrorContainer>
            );
        }

        if (colors.length === 0) {
            return debouncedSearch ? (
                <EmptyState
                    title="Nie znaleziono kolorów"
                    description={`Brak wyników dla: "${debouncedSearch}"`}
                />
            ) : (
                <EmptyState
                    title="Brak kolorów wizyt"
                    description="Dodaj pierwszy kolor, aby oznaczyć wizyty w kalendarzu"
                />
            );
        }

        return (
            <AppointmentColorTable
                colors={colors}
                onEdit={handleEditColor}
                onDelete={handleDeleteClick}
            />
        );
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Kolory wizyt</PageTitle>
                    <PageSubtitle>
                        Zarządzaj kolorami oznaczającymi różne typy wizyt w kalendarzu
                    </PageSubtitle>
                </TitleSection>

                <ActionsBar>
                    <SearchContainer>
                        <SearchInput
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Szukaj koloru..."
                        />
                    </SearchContainer>
                    <AddButton onClick={handleAddColor}>
                        <span>+</span>
                        Dodaj kolor
                    </AddButton>
                </ActionsBar>
            </ViewHeader>

            <FilterSection>
                <Toggle
                    checked={showInactive}
                    onChange={setShowInactive}
                    label="Pokaż archiwalne"
                />
            </FilterSection>

            <ContentSection>{renderContent()}</ContentSection>

            <AppointmentColorFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                color={editingColor}
                onSuccess={refetch}
            />

            {deletingColor && (
                <ConfirmDialog>
                    <ConfirmBox>
                        <ConfirmTitle>Usuń kolor wizyty</ConfirmTitle>
                        <ConfirmMessage>
                            Czy na pewno chcesz usunąć kolor "{deletingColor.name}"? Ta operacja jest nieodwracalna.
                        </ConfirmMessage>
                        <ConfirmActions>
                            <ConfirmButton $variant="secondary" onClick={handleCancelDelete}>
                                Anuluj
                            </ConfirmButton>
                            <ConfirmButton $variant="danger" onClick={handleConfirmDelete}>
                                Usuń
                            </ConfirmButton>
                        </ConfirmActions>
                    </ConfirmBox>
                </ConfirmDialog>
            )}
        </ViewContainer>
    );
};
