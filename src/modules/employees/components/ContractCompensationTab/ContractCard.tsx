import { useState } from 'react';
import type {
    EmploymentContract,
    CompensationConfig,
    CompensationComponent,
    CompensationComponentPayload,
    CreateAmendmentPayload,
    EndContractPayload,
} from '../../types';
import { useAmendments, useCreateAmendment } from '../../hooks/useContracts';
import { useSetCompensation } from '../../hooks/useCompensation';
import { todayISO, formatCents, formatDate, calcHourlyFromMonthlyCents, formatComponentValue } from './helpers';
import {
    CONTRACT_TYPE_LABELS, ETAT_LABELS, ETAT_SHORT,
    COMPONENT_TYPE_LABELS, CALC_BASE_LABELS, FREQUENCY_LABELS,
} from './constants';
import { AmendmentForm } from './AmendmentForm';
import { EndContractForm } from './EndContractForm';
import { AddComponentModal } from './AddComponentModal';
import {
    ContractCardWrapper,
    ContractCardHeader, ContractHeaderLeft,
    ContractBadgeRow, ContractTypeBadge, ContractStatusPill,
    ContractDateRange, ContractEtatInfo,
    CardActionGroup, AmendBtn, EndBtn,
    ContractBody,
    SalarySection, SalarySectionLabel,
    SalaryAmountBlock, SalaryAmountValue, SalaryAmountLabel,
    SalaryMetaList, SalaryMetaRow, SalaryMetaLabel, SalaryMetaValue,
    ComponentsSection, ComponentsSectionHeader, ComponentsSectionLabel, AddComponentBtn,
    ComponentRow, ComponentDot, ComponentInfo, ComponentName, ComponentMeta,
    ComponentValueBadge, TypePill, ComponentActionGroup, ToggleBtn, DeleteComponentBtn,
    ComponentsEmpty,
    InactiveSummary, InactiveSalarySummary, TerminationInfo,
    HistorySection, HistoryToggle, HistoryToggleIcon, HistoryList,
    HistoryRow, HistoryAmountText, HistoryPeriod, HistorySep, CurrentTag,
    ErrorMsg,
} from './styles';

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    contract: EmploymentContract;
    employeeId: string;
    compensationConfigs: CompensationConfig[];
    onEndContract: (contractId: string, payload: EndContractPayload) => Promise<void>;
    endPending: boolean;
}

export const ContractCard = ({
    contract,
    employeeId,
    compensationConfigs,
    onEndContract,
    endPending,
}: Props) => {
    const { amendments } = useAmendments(employeeId, contract.id);
    const amendMutation = useCreateAmendment(employeeId, contract.id);
    const setCompensation = useSetCompensation(employeeId);

    const [showAmendForm, setShowAmendForm] = useState(false);
    const [showEndForm, setShowEndForm] = useState(false);
    const [showAddComponent, setShowAddComponent] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [componentError, setComponentError] = useState('');

    const currentConfig = compensationConfigs[0] ?? null;
    const latestAmendment = amendments[0] ?? null;

    // Build a new SetCompensationPayload preserving base salary, only changing components
    const buildComponentPayload = (
        updatedComponents: CompensationComponentPayload[],
        effectiveFrom = todayISO(),
    ) => {
        if (!currentConfig) return null;
        return {
            contractId: contract.id,
            effectiveFrom,
            employmentMode: currentConfig.employmentMode,
            etatFraction: currentConfig.etatFraction,
            monthlySalaryGrossCents: currentConfig.monthlySalaryGrossCents,
            hourlyRateGrossCents: currentConfig.hourlyRateGrossCents,
            hourlyRateNetCents: currentConfig.hourlyRateNetCents,
            baseSalaryGrossCents: currentConfig.baseSalaryGrossCents,
            components: updatedComponents,
        };
    };

    const toPayload = (c: CompensationComponent): CompensationComponentPayload => ({
        name: c.name,
        type: c.type,
        calculationBase: c.calculationBase,
        value: c.value,
        thresholds: [],
        frequency: c.frequency,
        isActive: c.isActive,
        description: c.description,
    });

    const handleAddComponent = async (newComp: CompensationComponentPayload, effectiveFrom: string) => {
        const existing = (currentConfig?.components ?? []).map(toPayload);
        const payload = buildComponentPayload([...existing, newComp], effectiveFrom);
        if (!payload) throw new Error('Brak konfiguracji wynagrodzenia.');
        await setCompensation.mutateAsync(payload);
    };

    const handleToggleComponent = async (comp: CompensationComponent) => {
        if (!currentConfig) return;
        setMutatingId(comp.id);
        setComponentError('');
        const updated = currentConfig.components.map(c => ({
            ...toPayload(c),
            isActive: c.id === comp.id ? !c.isActive : c.isActive,
        }));
        const payload = buildComponentPayload(updated);
        if (!payload) return;
        try {
            await setCompensation.mutateAsync(payload);
        } catch {
            setComponentError('Nie udało się zaktualizować składnika.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleDeleteComponent = async (comp: CompensationComponent) => {
        if (!currentConfig) return;
        setMutatingId(comp.id);
        setComponentError('');
        const updated = currentConfig.components
            .filter(c => c.id !== comp.id)
            .map(toPayload);
        const payload = buildComponentPayload(updated);
        if (!payload) return;
        try {
            await setCompensation.mutateAsync(payload);
        } catch {
            setComponentError('Nie udało się usunąć składnika.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleAmendmentSave = async (payload: CreateAmendmentPayload) => {
        await amendMutation.mutateAsync(payload);
        setShowAmendForm(false);
    };

    const handleEndContractSave = async (payload: EndContractPayload) => {
        await onEndContract(contract.id, payload);
        setShowEndForm(false);
    };

    // ── Salary display helpers ──
    const renderSalaryAmount = () => {
        const sb = contract.salaryBasis;
        if (!sb) return <SalaryAmountValue>—</SalaryAmountValue>;
        if (sb.monthlySalaryGrossCents != null) {
            return (
                <>
                    <SalaryAmountValue>{formatCents(sb.monthlySalaryGrossCents)}</SalaryAmountValue>
                    <SalaryAmountLabel>brutto / mies.</SalaryAmountLabel>
                </>
            );
        }
        if (sb.hourlyRateGrossCents != null) {
            return (
                <>
                    <SalaryAmountValue>{formatCents(sb.hourlyRateGrossCents)}</SalaryAmountValue>
                    <SalaryAmountLabel>brutto / godz.</SalaryAmountLabel>
                </>
            );
        }
        return <SalaryAmountValue>—</SalaryAmountValue>;
    };

    // ── Inactive summary salary text ──
    const inactiveSalarySummary = (): string => {
        const sb = contract.salaryBasis;
        if (!sb) return '';
        if (sb.monthlySalaryGrossCents != null) return `${formatCents(sb.monthlySalaryGrossCents)}/mies. brutto`;
        if (sb.baseSalaryGrossCents != null) return `${formatCents(sb.baseSalaryGrossCents)}/h brutto`;
        return '';
    };

    // ── Amendment history row amount text ──
    const amendmentAmountText = (a: typeof amendments[0]): string => {
        if (a.monthlySalaryGrossCents != null) return formatCents(a.monthlySalaryGrossCents) + '/mies.';
        if (a.hourlyRateNetCents != null) return formatCents(a.hourlyRateNetCents) + '/h netto';
        if (a.hourlyRateGrossCents != null) return formatCents(a.hourlyRateGrossCents) + '/h brutto';
        return '—';
    };

    // ── Header date range ──
    const dateRange = `${formatDate(contract.startDate)} → ${contract.endDate ? formatDate(contract.endDate) : 'bezterminowo'}`;

    return (
        <ContractCardWrapper $active={contract.isActive}>
            {/* ── Header ── */}
            <ContractCardHeader>
                <ContractHeaderLeft>
                    <ContractBadgeRow>
                        <ContractTypeBadge>
                            {CONTRACT_TYPE_LABELS[contract.contractType]}
                        </ContractTypeBadge>
                        <ContractStatusPill $active={contract.isActive}>
                            {contract.isActive ? 'Aktywna' : 'Zakończona'}
                        </ContractStatusPill>
                    </ContractBadgeRow>
                    <ContractDateRange>{dateRange}</ContractDateRange>
                    {contract.etatFraction && (
                        <ContractEtatInfo>
                            {ETAT_LABELS[contract.etatFraction]} · {ETAT_SHORT[contract.etatFraction]}
                        </ContractEtatInfo>
                    )}
                </ContractHeaderLeft>

                {contract.isActive && !showAmendForm && !showEndForm && (
                    <CardActionGroup>
                        <AmendBtn onClick={() => setShowAmendForm(true)}>+ Aneks</AmendBtn>
                        <EndBtn onClick={() => setShowEndForm(true)}>Zakończ umowę</EndBtn>
                    </CardActionGroup>
                )}
            </ContractCardHeader>

            {/* ── Active contract – full body ── */}
            {contract.isActive ? (
                <ContractBody>
                    {/* Left: salary */}
                    <SalarySection>
                        <SalarySectionLabel>Wynagrodzenie podstawowe</SalarySectionLabel>

                        <SalaryAmountBlock>
                            {renderSalaryAmount()}
                        </SalaryAmountBlock>
                    </SalarySection>

                    {/* Right: components */}
                    <ComponentsSection>
                        <ComponentsSectionHeader>
                            <ComponentsSectionLabel>Składniki dodatkowe</ComponentsSectionLabel>
                            <AddComponentBtn onClick={() => setShowAddComponent(true)}>
                                + Dodaj
                            </AddComponentBtn>
                        </ComponentsSectionHeader>

                        {componentError && <ErrorMsg>{componentError}</ErrorMsg>}

                        {!currentConfig || currentConfig.components.length === 0 ? (
                            <ComponentsEmpty>
                                Brak składników. Dodaj np. premię od obrotu.
                            </ComponentsEmpty>
                        ) : (
                            currentConfig.components.map(comp => (
                                <ComponentRow key={comp.id} $inactive={!comp.isActive}>
                                    <ComponentDot $active={comp.isActive} />
                                    <ComponentInfo>
                                        <ComponentName title={comp.name}>{comp.name}</ComponentName>
                                        <ComponentMeta>
                                            {FREQUENCY_LABELS[comp.frequency]}
                                            {comp.calculationBase
                                                ? ` · ${CALC_BASE_LABELS[comp.calculationBase]}`
                                                : ''}
                                            {" " } {formatComponentValue(comp)}
                                        </ComponentMeta>
                                    </ComponentInfo>
                                    <ComponentActionGroup>
                                        <ToggleBtn
                                            $active={comp.isActive}
                                            onClick={() => handleToggleComponent(comp)}
                                            disabled={mutatingId === comp.id}
                                        >
                                            {comp.isActive ? 'Aktywny' : 'Nieaktywny'}
                                        </ToggleBtn>
                                        <DeleteComponentBtn
                                            onClick={() => handleDeleteComponent(comp)}
                                            disabled={mutatingId === comp.id}
                                        >
                                            Usuń
                                        </DeleteComponentBtn>
                                    </ComponentActionGroup>
                                </ComponentRow>
                            ))
                        )}
                    </ComponentsSection>
                </ContractBody>
            ) : (
                /* ── Inactive contract – compact summary ── */
                <InactiveSummary>
                    {contract.salaryBasis && (
                        <InactiveSalarySummary>{inactiveSalarySummary()}</InactiveSalarySummary>
                    )}
                    {contract.terminationDate && (
                        <TerminationInfo>
                            Rozwiązana: {formatDate(contract.terminationDate)}
                            {contract.terminationReason ? ` · ${contract.terminationReason}` : ''}
                        </TerminationInfo>
                    )}
                </InactiveSummary>
            )}

            {/* ── Inline forms ── */}
            {showAmendForm && (
                <AmendmentForm
                    contractType={contract.contractType}
                    initialEtatFraction={contract.etatFraction ?? 'FULL'}
                    onSave={handleAmendmentSave}
                    onCancel={() => setShowAmendForm(false)}
                    isPending={amendMutation.isPending}
                />
            )}
            {showEndForm && (
                <EndContractForm
                    onSave={handleEndContractSave}
                    onCancel={() => setShowEndForm(false)}
                    isPending={endPending}
                />
            )}

            {/* ── Amendment history ── */}
            {amendments.length > 0 && (
                <HistorySection>
                    <HistoryToggle onClick={() => setShowHistory(h => !h)}>
                        <HistoryToggleIcon $open={showHistory}>▶</HistoryToggleIcon>
                        Historia zmian wynagrodzenia ({amendments.length})
                    </HistoryToggle>
                    {showHistory && (
                        <HistoryList>
                            {amendments.map((a, idx) => (
                                <HistoryRow key={a.id} $current={idx === 0}>
                                    <HistoryPeriod>od {formatDate(a.effectiveFrom)}</HistoryPeriod>
                                    <HistorySep>·</HistorySep>
                                    <HistoryAmountText>{amendmentAmountText(a)}</HistoryAmountText>
                                    {idx === 0 && <CurrentTag>aktualna</CurrentTag>}
                                </HistoryRow>
                            ))}
                        </HistoryList>
                    )}
                </HistorySection>
            )}

            {/* ── Modals ── */}
            {showAddComponent && (
                <AddComponentModal
                    onClose={() => setShowAddComponent(false)}
                    onSave={handleAddComponent}
                />
            )}
        </ContractCardWrapper>
    );
};
