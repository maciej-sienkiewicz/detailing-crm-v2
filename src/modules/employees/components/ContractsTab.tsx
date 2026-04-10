import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useContracts, useCreateContract, useEndContract } from '../hooks/useContracts';
import type { ContractType, CreateContractPayload, EndContractPayload } from '../types';

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const AddBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #1D4ED8; }
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ContractType = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const ActiveBadge = styled.span<{ $active: boolean }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $active }) => $active
        ? 'background: rgba(16,185,129,0.12); color: #059669;'
        : 'background: rgba(100,116,139,0.10); color: #64748B;'}
`;

const CardMeta = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
`;

const MetaItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const MetaLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const MetaValue = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const EndBtn = styled.button`
    align-self: flex-start;
    padding: 5px 12px;
    background: none;
    border: 1px solid ${st.accentRed};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.accentRedDim}; }
`;

const EmptyText = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 32px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Mini Form ───────────────────────────────────────────────────────────────

const FormBox = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FormTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const Select = styled.select`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const CancelBtn = styled.button`
    padding: 7px 14px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
`;

const SaveBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    UOP: 'Umowa o pracę',
    UZ: 'Umowa zlecenie',
    B2B: 'B2B',
};

interface Props { employeeId: string; }

export const ContractsTab = ({ employeeId }: Props) => {
    const { contracts, isLoading } = useContracts(employeeId);
    const createMutation = useCreateContract(employeeId);
    const endMutation = useEndContract(employeeId);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState<CreateContractPayload>({
        contractType: 'UOP',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: null,
        workingHoursPerWeek: 40,
    });

    const [endForm, setEndForm] = useState<{ contractId: string; data: EndContractPayload } | null>(null);
    const [formError, setFormError] = useState('');

    const handleAdd = async () => {
        if (!addForm.startDate) { setFormError('Data rozpoczęcia jest wymagana.'); return; }
        setFormError('');
        try {
            await createMutation.mutateAsync(addForm);
            setShowAddForm(false);
            setAddForm({ contractType: 'UOP', startDate: new Date().toISOString().slice(0, 10), endDate: null, workingHoursPerWeek: 40 });
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    const handleEnd = async () => {
        if (!endForm) return;
        try {
            await endMutation.mutateAsync({ contractId: endForm.contractId, payload: endForm.data });
            setEndForm(null);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Umowy o zatrudnienie</SectionTitle>
                {!showAddForm && (
                    <AddBtn onClick={() => setShowAddForm(true)}>+ Dodaj umowę</AddBtn>
                )}
            </TopRow>

            {showAddForm && (
                <FormBox>
                    <FormTitle>Nowa umowa</FormTitle>
                    <Row>
                        <Field>
                            <Label>Typ umowy</Label>
                            <Select value={addForm.contractType} onChange={e => setAddForm(p => ({ ...p, contractType: e.target.value as ContractType }))}>
                                <option value="UOP">Umowa o pracę</option>
                                <option value="UZ">Umowa zlecenie</option>
                                <option value="B2B">B2B</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Wymiar h/tydzień</Label>
                            <Input type="number" value={addForm.workingHoursPerWeek} onChange={e => setAddForm(p => ({ ...p, workingHoursPerWeek: Number(e.target.value) }))} min={1} max={168} />
                        </Field>
                    </Row>
                    <Row>
                        <Field>
                            <Label>Data rozpoczęcia *</Label>
                            <Input type="date" value={addForm.startDate} onChange={e => setAddForm(p => ({ ...p, startDate: e.target.value }))} />
                        </Field>
                        <Field>
                            <Label>Data zakończenia</Label>
                            <Input type="date" value={addForm.endDate ?? ''} onChange={e => setAddForm(p => ({ ...p, endDate: e.target.value || null }))} />
                        </Field>
                    </Row>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowAddForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleAdd} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Zapisywanie...' : 'Dodaj umowę'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {endForm && (
                <FormBox>
                    <FormTitle>Zakończ umowę</FormTitle>
                    <Row>
                        <Field>
                            <Label>Data zakończenia *</Label>
                            <Input type="date" value={endForm.data.terminationDate} onChange={e => setEndForm(p => p ? { ...p, data: { ...p.data, terminationDate: e.target.value } } : null)} />
                        </Field>
                    </Row>
                    <FormActions>
                        <CancelBtn onClick={() => setEndForm(null)}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleEnd} disabled={endMutation.isPending} style={{ background: '#EF4444' }}>
                            {endMutation.isPending ? 'Przetwarzanie...' : 'Zakończ umowę'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {contracts.length === 0 && !showAddForm ? (
                <EmptyText>Brak umów. Kliknij „Dodaj umowę" aby dodać pierwszą.</EmptyText>
            ) : (
                contracts.map(c => (
                    <Card key={c.id}>
                        <CardHeader>
                            <ContractType>{CONTRACT_TYPE_LABELS[c.contractType]}</ContractType>
                            <ActiveBadge $active={c.isActive}>{c.isActive ? 'Aktywna' : 'Zakończona'}</ActiveBadge>
                        </CardHeader>
                        <CardMeta>
                            <MetaItem>
                                <MetaLabel>Od</MetaLabel>
                                <MetaValue>{new Date(c.startDate).toLocaleDateString('pl-PL')}</MetaValue>
                            </MetaItem>
                            {c.endDate && (
                                <MetaItem>
                                    <MetaLabel>Do</MetaLabel>
                                    <MetaValue>{new Date(c.endDate).toLocaleDateString('pl-PL')}</MetaValue>
                                </MetaItem>
                            )}
                            <MetaItem>
                                <MetaLabel>Wymiar czasu</MetaLabel>
                                <MetaValue>{c.workingHoursPerWeek} h/tydzień</MetaValue>
                            </MetaItem>
                            {c.terminationDate && (
                                <MetaItem>
                                    <MetaLabel>Rozwiązana</MetaLabel>
                                    <MetaValue>{new Date(c.terminationDate).toLocaleDateString('pl-PL')}</MetaValue>
                                </MetaItem>
                            )}
                        </CardMeta>
                        {c.isActive && !endForm && (
                            <EndBtn onClick={() => setEndForm({ contractId: c.id, data: { terminationDate: new Date().toISOString().slice(0, 10) } })}>
                                Zakończ umowę
                            </EndBtn>
                        )}
                    </Card>
                ))
            )}
        </Section>
    );
};
