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
    ModeBadge,
    ComponentsSection, ComponentsSectionHeader, ComponentsSectionLabel, AddComponentBtn,
    ComponentRow, ComponentDot, ComponentInfo, ComponentName, ComponentMeta,
    ComponentValueBadge, TypePill, ComponentActionGroup, ToggleBtn, DeleteComponentBtn,
    ComponentsEmpty,
    InactiveSummary, InactiveSalarySummary, TerminationInfo,
    HistorySection, HistoryToggle, HistoryToggleIcon, HistoryList,
    HistoryRow, HistoryRowLeft, HistoryAmountText, HistoryPeriod, CurrentTag,
    ModeBadge as _ModeBadge,
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
        if (!latestAmendment) return <SalaryAmountValue style={{ fontSize: 16, color: '#94A3B8' }}>—</SalaryAmountValue>;
        const a = latestAmendment;
        if (a.monthlySalaryGrossCents != null) {
            return (
                <>
                    <SalaryAmountValue>{formatCents(a.monthlySalaryGrossCents)}</SalaryAmountValue>
                    <SalaryAmountLabel>brutto / mies.</SalaryAmountLabel>
                </>
            );
        }
        if (a.hourlyRateNetCents != null) {
            return (
                <>
                    <SalaryAmountValue>{formatCents(a.hourlyRateNetCents)}</SalaryAmountValue>
                    <SalaryAmountLabel>netto / godz.</SalaryAmountLabel>
                </>
            );
        }
        if (a.hourlyRateGrossCents != null) {
            return (
                <>
                    <SalaryAmountValue>{formatCents(a.hourlyRateGrossCents)}</SalaryAmountValue>
                    <SalaryAmountLabel>brutto / godz.</SalaryAmountLabel>
                </>
            );
        }
        return <SalaryAmountValue style={{ fontSize: 16, color: '#94A3B8' }}>—</SalaryAmountValue>;
    };

    // ── Inactive summary salary text ──
    const inactiveSalarySummary = (): string => {
        const a = latestAmendment;
        if (!a) return '';
        if (a.monthlySalaryGrossCents != null) return `${formatCents(a.monthlySalaryGrossCents)}/mies. brutto`;
        if (a.hourlyRateNetCents != null) return `${formatCents(a.hourlyRateNetCents)}/h netto`;
        if (a.hourlyRateGrossCents != null) return `${formatCents(a.hourlyRateGrossCents)}/h brutto`;
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

                        {latestAmendment && (
                            <SalaryMetaList>
                                <SalaryMetaRow>
                                    <SalaryMetaLabel>Tryb</SalaryMetaLabel>
                                    <ModeBadge $mode={latestAmendment.employmentMode}>
                                        {latestAmendment.employmentMode === 'SALARY' ? 'Etat' : 'Godzinówka'}
                                    </ModeBadge>
                                </SalaryMetaRow>
                                {latestAmendment.etatFraction && (
                                    <SalaryMetaRow>
                                        <SalaryMetaLabel>Wymiar</SalaryMetaLabel>
                                        <SalaryMetaValue>{ETAT_SHORT[latestAmendment.etatFraction]}</SalaryMetaValue>
                                    </SalaryMetaRow>
                                )}
                                {latestAmendment.monthlySalaryGrossCents != null && latestAmendment.hourlyRateGrossCents != null && (
                                    <SalaryMetaRow>
                                        <SalaryMetaLabel>Stawka godz.</SalaryMetaLabel>
                                        <SalaryMetaValue>
                                            ~{formatCents(latestAmendment.hourlyRateGrossCents)}/h
                                        </SalaryMetaValue>
                                    </SalaryMetaRow>
                                )}
                                {latestAmendment.monthlySalaryGrossCents != null && latestAmendment.etatFraction && !latestAmendment.hourlyRateGrossCents && (
                                    <SalaryMetaRow>
                                        <SalaryMetaLabel>Stawka godz.</SalaryMetaLabel>
                                        <SalaryMetaValue>
                                            ~{calcHourlyFromMonthlyCents(latestAmendment.monthlySalaryGrossCents, latestAmendment.etatFraction)}/h
                                        </SalaryMetaValue>
                                    </SalaryMetaRow>
                                )}
                                <SalaryMetaRow>
                                    <SalaryMetaLabel>Obowiązuje od</SalaryMetaLabel>
                                    <SalaryMetaValue>{formatDate(latestAmendment.effectiveFrom)}</SalaryMetaValue>
                                </SalaryMetaRow>
                            </SalaryMetaList>
                        )}
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
                                        </ComponentMeta>
                                    </ComponentInfo>
                                    <ComponentValueBadge>
                                        {formatComponentValue(comp)}
                                    </ComponentValueBadge>
                                    <TypePill>{COMPONENT_TYPE_LABELS[comp.type]}</TypePill>
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
                    {latestAmendment && (
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
                                    <HistoryRowLeft>
                                        <ModeBadge $mode={a.employmentMode}>
                                            {a.employmentMode === 'SALARY' ? 'Etat' : 'Godz.'}
                                        </ModeBadge>
                                        <HistoryAmountText>{amendmentAmountText(a)}</HistoryAmountText>
                                        {idx === 0 && <CurrentTag>aktualna</CurrentTag>}
                                    </HistoryRowLeft>
                                    <HistoryPeriod>
                                        od {formatDate(a.effectiveFrom)}
                                        {a.effectiveTo ? ` → ${formatDate(a.effectiveTo)}` : ''}
                                    </HistoryPeriod>
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
