import { useState } from 'react';
import styled from 'styled-components';
import {
    useContractors,
    useCreateContractor,
    useUpdateContractor,
    useDeleteContractor,
} from '../hooks/useBatchOrders';
import { ContractorFormModal } from '../components/ContractorFormModal';
import { ContractorEntriesSection } from '../components/ContractorEntriesSection';
import type { BatchContractor, ContractorRequest } from '../types';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
    padding: ${p => p.theme.spacing.lg};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.theme.spacing.xl};
    }
`;

const ViewHeader = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
`;

const TitleSection = styled.div``;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const PageSubtitle = styled.p`
    margin: ${p => p.theme.spacing.xs} 0 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
`;

const AddContractorBtn = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: ${p => p.theme.colors.primary};
    color: #fff;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:hover { opacity: 0.9; }
`;

const ContractorsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const EmptyState = styled.div`
    padding: 60px 32px;
    text-align: center;
    background: ${p => p.theme.colors.surface};
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: 12px;
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
    margin: 0 0 8px;
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const EmptyDesc = styled.p`
    margin: 0 0 24px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
`;

const EmptyBtn = styled.button`
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: ${p => p.theme.colors.primary};
    color: #fff;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;

    &:hover { opacity: 0.9; }
`;

const LoadingState = styled.div`
    padding: 40px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
`;

const ErrorState = styled.div`
    padding: 24px;
    text-align: center;
    color: #e53e3e;
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 8px;
`;

export function BatchOrdersView() {
    const { data: contractors, isLoading, isError } = useContractors();
    const createContractor = useCreateContractor();
    const updateContractor = useUpdateContractor();
    const deleteContractor = useDeleteContractor();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editContractor, setEditContractor] = useState<BatchContractor | null>(null);

    async function handleCreateContractor(data: ContractorRequest) {
        await createContractor.mutateAsync(data);
    }

    async function handleUpdateContractor(data: ContractorRequest) {
        if (!editContractor) return;
        await updateContractor.mutateAsync({ contractorId: editContractor.id, data });
    }

    async function handleDeleteContractor(contractor: BatchContractor) {
        if (!window.confirm(`Usunąć kontrahenta "${contractor.name}"? Operacja jest nieodwracalna.`)) return;
        await deleteContractor.mutateAsync(contractor.id);
    }

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Zlecenia zbiorcze</PageTitle>
                    <PageSubtitle>
                        Zarządzaj kontrahentami B2B i rozliczeniami miesięcznymi
                    </PageSubtitle>
                </TitleSection>
                <AddContractorBtn onClick={() => setShowCreateModal(true)}>
                    + Dodaj kontrahenta
                </AddContractorBtn>
            </ViewHeader>

            {isLoading && <LoadingState>Ładowanie kontrahentów...</LoadingState>}

            {isError && (
                <ErrorState>Nie udało się załadować danych. Odśwież stronę.</ErrorState>
            )}

            {!isLoading && !isError && contractors?.length === 0 && (
                <EmptyState>
                    <EmptyIcon>🤝</EmptyIcon>
                    <EmptyTitle>Brak kontrahentów</EmptyTitle>
                    <EmptyDesc>
                        Dodaj pierwszego kontrahenta B2B, aby zacząć rejestrować zlecenia zbiorcze i generować miesięczne raporty.
                    </EmptyDesc>
                    <EmptyBtn onClick={() => setShowCreateModal(true)}>
                        Dodaj kontrahenta
                    </EmptyBtn>
                </EmptyState>
            )}

            {!isLoading && !isError && contractors && contractors.length > 0 && (
                <ContractorsList>
                    {contractors.map(contractor => (
                        <ContractorEntriesSection
                            key={contractor.id}
                            contractor={contractor}
                            onEdit={() => setEditContractor(contractor)}
                            onDelete={() => handleDeleteContractor(contractor)}
                        />
                    ))}
                </ContractorsList>
            )}

            {showCreateModal && (
                <ContractorFormModal
                    onSave={handleCreateContractor}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {editContractor && (
                <ContractorFormModal
                    initial={editContractor}
                    onSave={handleUpdateContractor}
                    onClose={() => setEditContractor(null)}
                />
            )}
        </ViewContainer>
    );
}
