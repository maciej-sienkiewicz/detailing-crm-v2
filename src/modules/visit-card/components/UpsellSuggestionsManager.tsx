// src/modules/visit-card/components/UpsellSuggestionsManager.tsx
//
// Employee-facing manager of "suggested additional services" (upselling) for a
// single visit or reservation. Suggestions are assigned intentionally, one by
// one, and appear on the customer's public Visit Card, where the customer can
// request them (which triggers a consent SMS: "Odpisz TAK…").
//
// UI follows the app-wide patterns: the service picker is the shared
// ServiceAutocomplete (styled suggestion dropdown), and the discount editor
// offers the same adjustment types as everywhere else (percent, fixed net/gross,
// set net/gross).

import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FieldGroup, Label, Input, Select } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { applyAdjustment, type AdjustmentType } from '@/common/utils/priceAdjustment';
import { ServiceAutocomplete } from '@/modules/checkin/components/ServiceAutocomplete';
import type { Service } from '@/modules/services/types';
import { visitCardApi, type UpsellTarget } from '../api/visitCardApi';
import type { UpsellSuggestion, UpsellSuggestionStatus } from '../types';

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const STATUS_LABEL: Record<UpsellSuggestionStatus, string> = {
    SUGGESTED: 'Widoczna na karcie',
    REQUESTED: 'Klient wybrał — czeka na SMS „TAK”',
    CONFIRMED: 'Potwierdzona i dodana',
};

const Wrap = styled.div`
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
`;

const Heading = styled.h3`
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const Hint = styled.p`
    margin: 0 0 12px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

const SelectedServicePanel = styled.div`
    margin-top: 10px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
`;

const SelectedServiceHeader = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
`;

const SelectedServiceName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const SelectedServicePrice = styled.div`
    font-size: 12.5px;
    color: #64748b;
    white-space: nowrap;
    font-feature-settings: 'tnum';
`;

const DiscountGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e2e8f0;

    @media (min-width: 480px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const ExtraToggleRow = styled.div`
    display: flex;
    gap: 14px;
    margin-top: 10px;
`;

const ExtraToggle = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-size: 12.5px;
    font-weight: 600;
    color: #2563eb;
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PreviewLine = styled.div`
    margin-top: 10px;
    font-size: 12.5px;
    color: #0f172a;
    font-feature-settings: 'tnum';

    strong { font-weight: 700; }
`;

const PreviewOld = styled.span`
    margin-right: 6px;
    color: #94a3b8;
    text-decoration: line-through;
`;

const PanelActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
`;

const PrimaryBtn = styled.button`
    padding: 9px 16px;
    border: none;
    border-radius: 8px;
    background: #0f172a;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const GhostBtn = styled.button`
    padding: 9px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover { border-color: #cbd5e1; }
`;

const List = styled.ul`
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }
`;

const RowInfo = styled.div`
    min-width: 0;
`;

const RowName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const RowMeta = styled.div`
    font-size: 12px;
    color: #64748b;
`;

const RowPrice = styled.div`
    flex-shrink: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    font-feature-settings: 'tnum';
`;

const RowOldPrice = styled.span`
    margin-right: 6px;
    font-weight: 400;
    color: #94a3b8;
    text-decoration: line-through;
`;

const RemoveBtn = styled.button`
    flex-shrink: 0;
    padding: 5px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:hover { border-color: #fca5a5; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.div`
    margin-top: 10px;
    font-size: 12.5px;
    color: #b91c1c;
`;

const EmptyText = styled.div`
    margin-top: 12px;
    font-size: 12.5px;
    color: #94a3b8;
`;

interface UpsellSuggestionsManagerProps {
    /** Visit or reservation the suggestions are attached to. */
    target: UpsellTarget;
    /** Reload trigger — the parent passes its `isOpen` so data refreshes on each open. */
    active: boolean;
}

const MONEY_TYPES: AdjustmentType[] = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'];

export const UpsellSuggestionsManager = ({ target, active }: UpsellSuggestionsManagerProps) => {
    const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    /** Discount fields stay hidden until the employee explicitly opts in. */
    const [discountOpen, setDiscountOpen] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('PERCENT');
    const [adjustmentInput, setAdjustmentInput] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const list = await visitCardApi.getUpsellSuggestions(target);
        setSuggestions(list);
    }, [target]);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        setError(null);
        setSelectedService(null);
        visitCardApi.getUpsellSuggestions(target)
            .then(list => { if (!cancelled) setSuggestions(list); })
            .catch(() => { if (!cancelled) setError('Nie udało się pobrać sugerowanych usług.'); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, target.kind, target.id]);

    const parsedValue = Number(adjustmentInput.replace(',', '.'));
    const hasValue = adjustmentInput.trim() !== '' && !Number.isNaN(parsedValue) && parsedValue >= 0;
    const discountActive = discountOpen && hasValue && parsedValue > 0;

    /** UI value → shared PriceAdjustment semantics (percent signed, money in cents). */
    const toAdjustment = () => ({
        type: adjustmentType,
        value: adjustmentType === 'PERCENT'
            ? -Math.abs(parsedValue || 0)
            : Math.round(Math.abs(parsedValue || 0) * 100),
    });

    const preview = selectedService
        ? applyAdjustment(
            selectedService.basePriceNet,
            selectedService.vatRate,
            discountActive ? toAdjustment() : { type: 'PERCENT', value: 0 },
        )
        : null;

    const handleSelectService = (service: Service) => {
        setSelectedService(service);
        setDiscountOpen(false);
        setNoteOpen(false);
        setAdjustmentType('PERCENT');
        setAdjustmentInput('');
        setNote('');
        setError(null);
    };

    const handleAdd = async () => {
        if (!selectedService) return;
        if (discountOpen && adjustmentInput.trim() !== '' && (Number.isNaN(parsedValue) || parsedValue < 0)) {
            setError('Wartość rabatu musi być liczbą nieujemną.');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await visitCardApi.createUpsellSuggestion(target, {
                serviceId: selectedService.id,
                adjustment: discountActive ? toAdjustment() : undefined,
                note: noteOpen ? (note.trim() || undefined) : undefined,
            });
            setSelectedService(null);
            await reload();
        } catch {
            setError('Nie udało się dodać sugestii.');
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (suggestionId: string) => {
        setBusy(true);
        setError(null);
        try {
            await visitCardApi.deleteUpsellSuggestion(target, suggestionId);
            await reload();
        } catch {
            setError('Nie udało się usunąć sugestii.');
        } finally {
            setBusy(false);
        }
    };

    const discountLabels = t.appointments.invoiceSummary.discountTypes;

    return (
        <Wrap>
            <Heading>Sugerowane usługi dodatkowe</Heading>
            <Hint>
                Wybrane usługi (z opcjonalnym rabatem) pojawią się na Karcie Wizyty jako propozycje.
                Gdy klient je wybierze, otrzyma SMS z prośbą o potwierdzenie odpowiedzią „TAK”.
            </Hint>

            {!selectedService && <ServiceAutocomplete onSelect={handleSelectService} />}

            {selectedService && (
                <SelectedServicePanel>
                    <SelectedServiceHeader>
                        <SelectedServiceName>{selectedService.name}</SelectedServiceName>
                        <SelectedServicePrice>
                            {preview && (
                                <>
                                    {preview.hasDiscount && (
                                        <PreviewOld>
                                            {formatPln(applyAdjustment(selectedService.basePriceNet, selectedService.vatRate, { type: 'PERCENT', value: 0 }).finalGrossCents)}
                                        </PreviewOld>
                                    )}
                                    {formatPln(preview.finalGrossCents)} brutto
                                </>
                            )}
                        </SelectedServicePrice>
                    </SelectedServiceHeader>

                    {/* Discount and note are opt-in — the default panel stays minimal. */}
                    {discountOpen && (
                        <DiscountGrid>
                            <FieldGroup>
                                <Label>Rodzaj rabatu</Label>
                                <Select
                                    value={adjustmentType}
                                    onChange={e => setAdjustmentType(e.target.value as AdjustmentType)}
                                    disabled={busy}
                                >
                                    <option value="PERCENT">{discountLabels.percent}</option>
                                    <option value="FIXED_NET">{discountLabels.fixedNet}</option>
                                    <option value="FIXED_GROSS">{discountLabels.fixedGross}</option>
                                    <option value="SET_NET">{discountLabels.setNet}</option>
                                    <option value="SET_GROSS">{discountLabels.setGross}</option>
                                </Select>
                            </FieldGroup>
                            <FieldGroup>
                                <Label>{adjustmentType === 'PERCENT' ? 'Wartość (%)' : 'Wartość (PLN)'}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={adjustmentType === 'PERCENT' ? 'np. 10' : 'np. 50,00'}
                                    value={adjustmentInput}
                                    onChange={e => setAdjustmentInput(e.target.value)}
                                    disabled={busy}
                                />
                            </FieldGroup>
                        </DiscountGrid>
                    )}

                    {noteOpen && (
                        <FieldGroup style={{ marginTop: 10 }}>
                            <Label>Notatka dla klienta</Label>
                            <Input
                                type="text"
                                maxLength={500}
                                placeholder="np. polecane przy tym przebiegu"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                disabled={busy}
                            />
                        </FieldGroup>
                    )}

                    {discountOpen && preview?.hasDiscount && (
                        <PreviewLine>
                            Cena dla klienta:{' '}
                            <strong>{formatPln(preview.finalGrossCents)} brutto</strong>
                            {' '}({formatPln(preview.finalNetCents)} netto)
                        </PreviewLine>
                    )}

                    <ExtraToggleRow>
                        {!discountOpen && (
                            <ExtraToggle onClick={() => setDiscountOpen(true)} disabled={busy}>
                                + Dodaj rabat
                            </ExtraToggle>
                        )}
                        {!noteOpen && (
                            <ExtraToggle onClick={() => setNoteOpen(true)} disabled={busy}>
                                + Dodaj notatkę
                            </ExtraToggle>
                        )}
                    </ExtraToggleRow>

                    <PanelActions>
                        <PrimaryBtn
                            onClick={handleAdd}
                            disabled={busy || (discountOpen && MONEY_TYPES.includes(adjustmentType) && !hasValue)}
                        >
                            Dodaj sugestię
                        </PrimaryBtn>
                        <GhostBtn onClick={() => setSelectedService(null)} disabled={busy}>
                            Anuluj
                        </GhostBtn>
                    </PanelActions>
                </SelectedServicePanel>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            {suggestions.length === 0 ? (
                <EmptyText>Brak sugerowanych usług.</EmptyText>
            ) : (
                <List>
                    {suggestions.map(suggestion => (
                        <Row key={suggestion.id}>
                            <RowInfo>
                                <RowName>{suggestion.serviceName}</RowName>
                                <RowMeta>{STATUS_LABEL[suggestion.status]}</RowMeta>
                            </RowInfo>
                            <RowPrice>
                                {suggestion.originalPriceGross !== suggestion.finalPriceGross && (
                                    <RowOldPrice>{formatPln(suggestion.originalPriceGross)}</RowOldPrice>
                                )}
                                {formatPln(suggestion.finalPriceGross)}
                            </RowPrice>
                            {suggestion.status === 'SUGGESTED' && (
                                <RemoveBtn onClick={() => handleRemove(suggestion.id)} disabled={busy}>
                                    Usuń
                                </RemoveBtn>
                            )}
                        </Row>
                    ))}
                </List>
            )}
        </Wrap>
    );
};
