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
import { Archive, Layers, MoreHorizontal, Tag } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, PageHeaderPrimaryButton, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { MobilePageHeader, MobilePageHeaderButton, MobilePageHeaderIconButton, MobilePageHeaderCountValue } from '@/common/components/PageHeader';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { SharedButton } from '@/common/styles';
import { ActionMenu, MenuItem, useActionMenu } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useBreakpoint } from '@/common/hooks';
import {
    useContractors, useCreateContractor, useDeleteContractor, useUpdateContractor,
} from '../hooks/useBatchOrders';
import { ContractorEntriesSection } from '../components/ContractorEntriesSection';
import { ContractorFormModal } from '../components/ContractorFormModal';
import { BatchServicesModal } from '../components/BatchServicesModal';
import { ArchivedContractorsModal } from '../components/ArchivedContractorsModal';
import type { BatchContractor, ContractorRequest } from '../types';
import { carsLabel, formatMoney } from '../utils/format';
import { problemDetail } from '@/core/problem';

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

/** Kontrahent idzie do archiwum; nierozliczone auta nie trafią do zestawienia, dopóki tam jest. */
function archiveMessage(contractor: BatchContractor): string {
    const open = contractor.openEntryCount ?? 0;
    const unsettled = open > 0
        ? ` Ma ${carsLabel(open)} za ${formatMoney(contractor.openGrossCents ?? 0)} poza zestawieniami - nie trafią do zestawienia, dopóki go nie przywrócisz.`
        : '';
    return `„${contractor.name}” zniknie z listy. Jego auta i zestawienia zobaczysz w archiwum, skąd go przywrócisz.${unsettled}`;
}

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
    const [showArchive, setShowArchive] = useState(false);
    const moreMenu = useActionMenu();

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
            showSuccess('Kontrahent w archiwum', `${contractor.name}. Przywrócisz go z archiwum u góry strony.`);
        } catch (e) {
            showError('Nie udało się przenieść kontrahenta do archiwum', problemDetail(e, 'Spróbuj ponownie.'));
        }
    }

    const list = contractors ?? [];
    const contractorCount = list.length;

    let content: React.ReactNode;
    if (isLoading) {
        content = <StateBox>Wczytywanie kontrahentów…</StateBox>;
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
                    Dodaj pierwszego kontrahenta, żeby zapisywać jego auta i rozliczać je jednym
                    zestawieniem.
                </p>
                <SharedButton $variant="secondary" type="button" onClick={() => setShowCreate(true)}>Dodaj kontrahenta</SharedButton>
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
                    subtitle="Kontrahenci flotowi i ich miesięczne zestawienia"
                    actions={
                        <>
                            <PageHeaderGhostButton onClick={() => setShowArchive(true)} title="Archiwum kontrahentów">
                                Archiwum
                            </PageHeaderGhostButton>
                            <PageHeaderGhostButton onClick={() => setShowServices(true)} title="Cennik usług">
                                Cennik
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
                            {/* Cennik i Archiwum w jednym menu: dwie ikony obok „+ Kontrahent"
                                ucinały tytuł przy 375 px do „Zle…". */}
                            <MobilePageHeaderIconButton
                                type="button"
                                aria-label="Więcej akcji"
                                aria-haspopup="menu"
                                aria-expanded={moreMenu.isOpen()}
                                onClick={e => moreMenu.toggle(e, null)}
                            >
                                <MoreHorizontal />
                            </MobilePageHeaderIconButton>
                            <MobilePageHeaderButton onClick={() => setShowCreate(true)}>
                                <span aria-hidden="true">+</span>
                                Kontrahent
                            </MobilePageHeaderButton>
                        </>
                    }
                />
            )}
            {!isDesktop && (
                <ActionMenu anchor={moreMenu.menu?.anchor ?? null} onClose={moreMenu.close} label="Więcej akcji">
                    <MenuItem icon={<Tag />} onClick={() => setShowServices(true)}>Cennik usług</MenuItem>
                    <MenuItem icon={<Archive />} onClick={() => setShowArchive(true)}>Archiwum kontrahentów</MenuItem>
                </ActionMenu>
            )}

            {content}

            {showServices && <BatchServicesModal onClose={() => setShowServices(false)} />}
            {showArchive && <ArchivedContractorsModal onClose={() => setShowArchive(false)} />}

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
                title="Przenieść kontrahenta do archiwum?"
                message={confirmDelete ? archiveMessage(confirmDelete) : ''}
                variant="danger"
                confirmText="Przenieś do archiwum"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
                onCancel={() => setConfirmDelete(null)}
            />
        </ViewContainer>
    );
}
