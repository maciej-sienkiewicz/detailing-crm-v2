// src/modules/batch-orders/views/BatchOrdersView.tsx
//
// Zlecenia zbiorcze: stos kart, po jednej na kontrahenta, każda z własnym okresem
// i listą aut.
//
// Przez kilka dni po 25.09 był tu układ „lista kontrahentów → wybrany kontrahent"
// z jednym okresem dla całego ekranu. Biznes wolał dawny wygląd - najpierw na
// telefonie, potem także na komputerze - więc wraca on na każdej szerokości. Logika
// zostaje nowa (ContractorEntriesSection): edytor auta, odblokowanie rozliczonego
// wpisu do korekty, te same okna zestawienia, historii i PDF, komunikaty po zapisie.

import { useState } from 'react';
import styled from 'styled-components';
import { Layers, Settings } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, PageHeaderPrimaryButton, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { MobilePageHeader, MobilePageHeaderButton, MobilePageHeaderIconButton, MobilePageHeaderCountValue } from '@/common/components/PageHeader';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { useBreakpoint } from '@/common/hooks';
import {
    useContractors, useCreateContractor, useDeleteContractor, useUpdateContractor,
} from '../hooks/useBatchOrders';
import { ContractorEntriesSection } from '../components/ContractorEntriesSection';
import { ContractorFormModal } from '../components/ContractorFormModal';
import { BatchServicesModal } from '../components/BatchServicesModal';
import type { BatchContractor, ContractorRequest } from '../types';
import { apiErrorMessage } from '../utils/format';

const ViewContainer = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-x: clip;
    box-sizing: border-box;

    @media (max-width: 767px) { gap: 12px; }
`;

const ContractorsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const StateBox = styled.div<{ $error?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
    border-radius: 12px;
    font-size: 14px;
    color: ${p => p.$error ? '#991b1b' : p.theme.colors.textSecondary};
    background: ${p => p.$error ? '#fef2f2' : p.theme.colors.surface};
    border: 1px ${p => p.$error ? 'solid #fecaca' : `dashed ${p.theme.colors.border}`};

    strong { font-size: 17px; color: ${p => p.theme.colors.text}; }
    p { margin: 0; max-width: 420px; line-height: 1.5; }
`;

export function BatchOrdersView() {
    const { showSuccess, showError } = useToast();
    const isDesktop = useBreakpoint('md');

    const { data: contractors, isLoading, isError, refetch } = useContractors();
    const createContractor = useCreateContractor();
    const updateContractor = useUpdateContractor();
    const deleteContractor = useDeleteContractor();

    const [showCreate, setShowCreate] = useState(false);
    const [editContractor, setEditContractor] = useState<BatchContractor | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<BatchContractor | null>(null);
    const [showServices, setShowServices] = useState(false);

    async function handleCreate(data: ContractorRequest) {
        const created = await createContractor.mutateAsync(data);
        showSuccess('Kontrahent dodany', created.name);
    }

    async function handleUpdate(data: ContractorRequest) {
        if (!editContractor) return;
        await updateContractor.mutateAsync({ contractorId: editContractor.id, data });
        showSuccess('Zapisano dane kontrahenta');
    }

    async function handleDelete(contractor: BatchContractor) {
        try {
            await deleteContractor.mutateAsync(contractor.id);
            showSuccess('Kontrahent usunięty z listy', contractor.name);
        } catch (e) {
            showError('Nie udało się usunąć kontrahenta', apiErrorMessage(e, 'Spróbuj ponownie.'));
        }
    }

    const list = contractors ?? [];
    const contractorCount = list.length;

    let content: React.ReactNode;
    if (isLoading) {
        content = <StateBox>Ładowanie kontrahentów…</StateBox>;
    } else if (isError) {
        content = (
            <StateBox $error>
                <strong>Nie udało się wczytać kontrahentów</strong>
                <SharedButton $variant="secondary" type="button" onClick={() => refetch()}>Spróbuj ponownie</SharedButton>
            </StateBox>
        );
    } else if (contractorCount === 0) {
        content = (
            <StateBox>
                <strong>Brak kontrahentów</strong>
                <p>
                    Dodaj pierwszego kontrahenta B2B, aby zacząć rejestrować zlecenia zbiorcze
                    i generować zestawienia do rozliczenia.
                </p>
                <SharedButton $variant="primary" type="button" onClick={() => setShowCreate(true)}>Dodaj kontrahenta</SharedButton>
            </StateBox>
        );
    } else {
        content = (
            <ContractorsList>
                {list.map(contractor => (
                    <ContractorEntriesSection
                        key={contractor.id}
                        contractor={contractor}
                        onEdit={() => setEditContractor(contractor)}
                        onDelete={() => setConfirmDelete(contractor)}
                    />
                ))}
            </ContractorsList>
        );
    }

    return (
        <ViewContainer>
            {isDesktop ? (
                <PageHeader
                    title="Zlecenia zbiorcze"
                    subtitle="Zarządzaj kontrahentami B2B i ich rozliczeniami"
                    actions={
                        <>
                            <PageHeaderGhostButton onClick={() => setShowServices(true)} title="Zarządzaj usługami">
                                Usługi
                            </PageHeaderGhostButton>
                            <PageHeaderPrimaryButton onClick={() => setShowCreate(true)} title="Dodaj kontrahenta">
                                + Kontrahent
                            </PageHeaderPrimaryButton>
                        </>
                    }
                />
            ) : (
                <MobilePageHeader
                    icon={<Layers />}
                    title="Zlecenia zbiorcze"
                    subtitle={!isLoading
                        ? <><MobilePageHeaderCountValue>{contractorCount}</MobilePageHeaderCountValue> {contractorCount === 1 ? 'kontrahent' : 'kontrahentów'}</>
                        : 'Wczytywanie…'}
                    actions={
                        <>
                            <MobilePageHeaderIconButton onClick={() => setShowServices(true)} title="Zarządzaj usługami" aria-label="Zarządzaj usługami">
                                <Settings />
                            </MobilePageHeaderIconButton>
                            <MobilePageHeaderButton onClick={() => setShowCreate(true)}>
                                <span aria-hidden="true">+</span>
                                Kontrahent
                            </MobilePageHeaderButton>
                        </>
                    }
                />
            )}

            {content}

            {showServices && <BatchServicesModal onClose={() => setShowServices(false)} />}

            {showCreate && (
                <ContractorFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
            )}

            {editContractor && (
                <ContractorFormModal
                    initial={editContractor}
                    onSave={handleUpdate}
                    onClose={() => setEditContractor(null)}
                />
            )}

            {/* Usunięcie jest miękkie: kontrahent znika z listy, a jego wpisy i historia
                rozliczeń zostają w bazie. Dawny komunikat („nieodwracalne, usunie wszystkie
                wpisy") straszył czymś, co się nie działo. */}
            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usunąć kontrahenta z listy?"
                message={`„${confirmDelete?.name ?? ''}" zniknie z listy zleceń zbiorczych. Jego auta i zestawienia zostaną zachowane w systemie.`}
                variant="danger"
                confirmText="Usuń z listy"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
                onCancel={() => setConfirmDelete(null)}
            />
        </ViewContainer>
    );
}
