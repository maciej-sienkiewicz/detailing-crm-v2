// src/modules/visit-card/components/UpsellSuggestionsManager.tsx
//
// Employee-facing manager of "suggested additional services" (upselling) for a
// single visit. Suggestions are assigned intentionally, one by one, and appear
// on the customer's public Visit Card, where the customer can request them
// (which triggers a consent SMS: "Odpisz TAK…").

import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';
import { visitCardApi } from '../api/visitCardApi';
import type { UpsellSuggestion, UpsellSuggestionStatus } from '../types';

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const STATUS_LABEL: Record<UpsellSuggestionStatus, string> = {
    SUGGESTED: 'Widoczna na karcie',
    REQUESTED: 'Klient wybrał — czeka na SMS „TAK”',
    CONFIRMED: 'Potwierdzona i dodana do wizyty',
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

const FormRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Select = styled.select`
    flex: 1 1 200px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
`;

const DiscountInput = styled.input`
    width: 92px;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
`;

const NoteInput = styled.input`
    flex: 1 1 100%;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
`;

const AddBtn = styled.button`
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
    visitId: string;
    /** Reload trigger — the parent passes its `isOpen` so data refreshes on each open. */
    active: boolean;
}

export const UpsellSuggestionsManager = ({ visitId, active }: UpsellSuggestionsManagerProps) => {
    const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const list = await visitCardApi.getUpsellSuggestions(visitId);
        setSuggestions(list);
    }, [visitId]);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        setError(null);
        Promise.all([
            visitCardApi.getUpsellSuggestions(visitId),
            servicesApi.getServices({ search: '', page: 1, limit: 200 }),
        ])
            .then(([list, servicesResponse]) => {
                if (cancelled) return;
                setSuggestions(list);
                setServices(servicesResponse.services.filter(s => s.isActive));
            })
            .catch(() => { if (!cancelled) setError('Nie udało się pobrać sugerowanych usług.'); });
        return () => { cancelled = true; };
    }, [active, visitId]);

    // Services already suggested are hidden from the picker to avoid duplicates.
    const availableServices = useMemo(() => {
        const suggestedServiceIds = new Set(suggestions.map(s => s.serviceId));
        return services.filter(s => !suggestedServiceIds.has(s.id));
    }, [services, suggestions]);

    const handleAdd = async () => {
        if (!selectedServiceId) return;
        const percent = discountPercent.trim() === '' ? 0 : Number(discountPercent.replace(',', '.'));
        if (Number.isNaN(percent) || percent < 0 || percent >= 100) {
            setError('Rabat musi być liczbą z zakresu 0–99,99%.');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await visitCardApi.createUpsellSuggestion(visitId, {
                serviceId: selectedServiceId,
                adjustment: percent > 0 ? { type: 'PERCENT', value: -percent } : undefined,
                note: note.trim() || undefined,
            });
            setSelectedServiceId('');
            setDiscountPercent('');
            setNote('');
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
            await visitCardApi.deleteUpsellSuggestion(visitId, suggestionId);
            await reload();
        } catch {
            setError('Nie udało się usunąć sugestii.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Wrap>
            <Heading>Sugerowane usługi dodatkowe</Heading>
            <Hint>
                Wybrane usługi (z opcjonalnym rabatem) pojawią się na Karcie Wizyty jako propozycje.
                Gdy klient je wybierze, otrzyma SMS z prośbą o potwierdzenie odpowiedzią „TAK”.
            </Hint>

            <FormRow>
                <Select
                    value={selectedServiceId}
                    onChange={e => setSelectedServiceId(e.target.value)}
                    disabled={busy}
                >
                    <option value="">Wybierz usługę z cennika…</option>
                    {availableServices.map(service => (
                        <option key={service.id} value={service.id}>
                            {service.name}
                        </option>
                    ))}
                </Select>
                <DiscountInput
                    type="text"
                    inputMode="decimal"
                    placeholder="Rabat %"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                    disabled={busy}
                />
                <AddBtn onClick={handleAdd} disabled={!selectedServiceId || busy}>
                    Dodaj
                </AddBtn>
                <NoteInput
                    type="text"
                    maxLength={500}
                    placeholder="Notatka dla klienta (opcjonalnie)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    disabled={busy}
                />
            </FormRow>

            {error && <ErrorText>{error}</ErrorText>}

            {suggestions.length === 0 ? (
                <EmptyText>Brak sugerowanych usług dla tej wizyty.</EmptyText>
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
