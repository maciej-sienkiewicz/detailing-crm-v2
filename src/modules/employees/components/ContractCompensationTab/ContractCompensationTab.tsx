import { useState } from 'react';
import type { EndContractPayload } from '../../types';
import { useContracts, useCreateContract, useEndContract } from '../../hooks/useContracts';
import { useCompensationHistory } from '../../hooks/useCompensation';
import { ContractCard } from './ContractCard';
import { ContractForm } from './ContractForm';
import {
    TabContainer, TabHeaderRow, TabTitle,
    AddContractBtn, EmptyState, EmptyStateAction, Spinner,
} from './styles';

interface Props {
    employeeId: string;
}

export const ContractCompensationTab = ({ employeeId }: Props) => {
    const { contracts, isLoading: contractsLoading } = useContracts(employeeId);
    const { history: compensationHistory, isLoading: compensationLoading } = useCompensationHistory(employeeId);
    const createMutation = useCreateContract(employeeId);
    const endMutation = useEndContract(employeeId);

    const [showContractForm, setShowContractForm] = useState(false);

    const isLoading = contractsLoading || compensationLoading;

    const handleEndContract = async (contractId: string, payload: EndContractPayload) => {
        await endMutation.mutateAsync({ contractId, payload });
    };

    // Sort: active contracts first, then by startDate descending
    const sortedContracts = [...contracts].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    if (isLoading) return <Spinner />;

    return (
        <TabContainer>
            <TabHeaderRow>
                <TabTitle>Umowy i wynagrodzenie</TabTitle>
                {!showContractForm && (
                    <AddContractBtn onClick={() => setShowContractForm(true)}>
                        + Dodaj umowę
                    </AddContractBtn>
                )}
            </TabHeaderRow>

            {showContractForm && (
                <ContractForm
                    onSave={async payload => {
                        await createMutation.mutateAsync(payload);
                        setShowContractForm(false);
                    }}
                    onCancel={() => setShowContractForm(false)}
                    isPending={createMutation.isPending}
                />
            )}

            {sortedContracts.length === 0 && !showContractForm ? (
                <EmptyState>
                    Brak umów dla tego pracownika.
                    <EmptyStateAction>Kliknij „+ Dodaj umowę" aby dodać pierwszą.</EmptyStateAction>
                </EmptyState>
            ) : (
                sortedContracts.map(contract => (
                    <ContractCard
                        key={contract.id}
                        contract={contract}
                        employeeId={employeeId}
                        compensationConfigs={compensationHistory.filter(
                            c => c.contractId === contract.id,
                        )}
                        onEndContract={handleEndContract}
                        endPending={endMutation.isPending}
                    />
                ))
            )}
        </TabContainer>
    );
};
