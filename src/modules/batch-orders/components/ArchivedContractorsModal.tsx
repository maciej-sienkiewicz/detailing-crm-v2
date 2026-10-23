// src/modules/batch-orders/components/ArchivedContractorsModal.tsx
//
// Archiwum kontrahentów. Usunięcie kontrahenta zawsze było miękkie, ale nic nie
// pozwalało potem zajrzeć do jego zestawień ani go przywrócić - okno obiecywało
// „auta i zestawienia zostaną zachowane", a w aplikacji znikały bez śladu
// (decyzja biznesu z 23.10.2026: archiwum z wglądem i przywracaniem).

import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { problemDetail } from '@/core/problem';
import { pluralPl } from '@/common/utils/plural';
import { useArchivedContractors, useRestoreContractor } from '../hooks/useBatchOrders';
import { SettlementHistoryModal } from './SettlementHistoryModal';
import type { ArchivedContractor, BatchContractor } from '../types';
import { carsLabel, formatMoney } from '../utils/format';
import { formatInstantDay } from '../utils/period';

const EmptyMsg = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding: 14px 0;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    &:last-child { border-bottom: none; }
`;

const Who = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    strong { font-size: 15px; color: ${p => p.theme.colors.text}; }
`;

const Facts = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
`;

/* Bursztyn = „przeczytaj": nierozliczone auta u kontrahenta z archiwum nie trafią do
   żadnego zestawienia, dopóki ktoś go nie przywróci. */
const OpenWarning = styled.span`
    color: #b45309;
    font-weight: 600;
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
`;

interface Props {
    onClose: () => void;
}

export function ArchivedContractorsModal({ onClose }: Props) {
    const { data: archived, isLoading, isError } = useArchivedContractors(true);
    const restore = useRestoreContractor();
    const { showSuccess, showError } = useToast();
    const [historyFor, setHistoryFor] = useState<BatchContractor | null>(null);

    async function handleRestore(item: ArchivedContractor) {
        try {
            await restore.mutateAsync(item.contractor.id);
            showSuccess('Kontrahent przywrócony', `${item.contractor.name} jest z powrotem na liście zleceń zbiorczych.`);
        } catch (e) {
            showError('Nie udało się przywrócić kontrahenta', problemDetail(e, 'Spróbuj ponownie.'));
        }
    }

    return (
        <>
            <ModalShell isOpen onClose={onClose} size="md">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Archiwum kontrahentów</ModalTitle>
                        <ModalSubtitle>Kontrahenci przeniesieni z listy, z ich autami i zestawieniami</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>
                <ModalContent>
                    {isLoading ? (
                        <EmptyMsg>Wczytywanie…</EmptyMsg>
                    ) : isError ? (
                        <EmptyMsg>Nie udało się wczytać archiwum.</EmptyMsg>
                    ) : !archived?.length ? (
                        <EmptyMsg>Archiwum jest puste.</EmptyMsg>
                    ) : (
                        <List>
                            {archived.map(item => {
                                const open = item.contractor.openEntryCount ?? 0;
                                return (
                                    <Row key={item.contractor.id}>
                                        <Who>
                                            <strong>{item.contractor.name}</strong>
                                            <Facts>
                                                <span>W archiwum od {formatInstantDay(item.contractor.updatedAt)}</span>
                                                <span>{carsLabel(item.contractor.entryCount)}</span>
                                                <span>
                                                    {item.settlementCount} {pluralPl(item.settlementCount, 'zestawienie', 'zestawienia', 'zestawień')}
                                                    {item.lastSettledAt ? `, ostatnie z ${formatInstantDay(item.lastSettledAt)}` : ''}
                                                </span>
                                                {open > 0 && (
                                                    <OpenWarning>
                                                        Nierozliczone: {carsLabel(open)} za {formatMoney(item.contractor.openGrossCents ?? 0)}
                                                    </OpenWarning>
                                                )}
                                            </Facts>
                                        </Who>
                                        <Actions>
                                            <SharedButton
                                                $variant="secondary"
                                                $size="sm"
                                                type="button"
                                                onClick={() => setHistoryFor(item.contractor)}
                                                disabled={item.settlementCount === 0}
                                            >
                                                Zestawienia
                                            </SharedButton>
                                            <SharedButton
                                                $variant="secondary"
                                                $size="sm"
                                                type="button"
                                                onClick={() => handleRestore(item)}
                                                disabled={restore.isPending}
                                            >
                                                Przywróć
                                            </SharedButton>
                                        </Actions>
                                    </Row>
                                );
                            })}
                        </List>
                    )}
                </ModalContent>
            </ModalShell>

            {historyFor && (
                <SettlementHistoryModal contractor={historyFor} onClose={() => setHistoryFor(null)} />
            )}
        </>
    );
}
