// src/modules/comms/components/SuggestedServiceRows.tsx
//
// „Sugerowane usługi": AI na podstawie treści maila podsuwa pozycje z cennika,
// człowiek je jednym kliknięciem przyjmuje albo odrzuca.
//
// Sugestie są WIERSZAMI TEJ SAMEJ TABELI co wycena, a nie osobną listą pod nią.
// Osobna lista kazała czytać dwa spisy usług pod sobą i - przy pustej wycenie -
// stawiała nad sugestią zdanie „nie przypisano jeszcze usług", czyli komunikat
// wprost sprzeczny z tym, co widać niżej. Jeden spis, jedna kolejność kolumn,
// a stan pozycji niesie jej wygląd: sugestia jest przygaszona, ma plakietkę
// „Sugerowane" i dwa przyciski, których wiersz wyceny nie ma.
//
// Suma „Razem" ich NIE liczy i liczyć nie może: sugestia nie jest wyceną, dopóki
// ktoś jej nie przyjmie. Dlatego kwoty w tych wierszach są szare - liczba w kolorze
// tekstu obiecywałaby, że wchodzi do sumy dwa wiersze niżej.
//
// Cena nigdy nie pochodzi od modelu. Stała bierze się z cennika, „wycena
// niestandardowa" — z podobnego zlecenia; a gdy historii brak, wiersz jest BEZ ceny
// i przyjęcie wymusza podanie kwoty inline. To jest cała obrona przed halucynacją
// ceny widoczna dla użytkownika.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, X } from 'lucide-react';
import type { useSuggestionActions } from '../hooks/useLeads';
import { toQuoteRow } from '../utils/leadServiceLines';
import type { LeadServiceItem } from '../types';
import { formatGrosze } from './shared';

/**
 * Wiersz sugestii w tabeli wyceny. Przygaszony, dopóki nie zostanie przyjęty -
 * i rozjaśniany pod kursorem, żeby dało się go przeczytać bez przyjmowania.
 */
const Row = styled.tr`
    opacity: 0.75;
    transition: opacity ${p => p.theme.transitions.fast};

    &:hover { opacity: 1; }

    /* Kwoty sugestii są szare: do sumy „Razem" nie wchodzą, więc nie mają prawa
       wyglądać jak liczby, które już się liczą. Podwojony selektor, bo tabela
       wyceny farbuje swoje komórki własną regułą o tej samej wadze - o zwycięzcy
       decydowałaby kolejność wstrzyknięcia stylów, czyli przypadek. */
    && td { color: ${p => p.theme.colors.textMuted}; }
`;

const Name = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    color: ${p => p.theme.colors.text};
    overflow-wrap: anywhere;
`;

const Badge = styled.span`
    padding: 1px 7px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.medium};
    letter-spacing: 0.02em;
    line-height: 1.6;
    white-space: nowrap;
    background: rgba(14, 165, 233, 0.1);
    color: ${p => p.theme.colors.primary};
`;

/** Powód, dla którego cena jest taka, a nie inna - albo dlaczego jej nie ma. */
const PriceTag = styled.span<{ $tone: 'history' | 'pending' }>`
    display: block;
    margin-top: 1px;
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$tone === 'pending' ? p.theme.colors.warning : p.theme.colors.textMuted)};
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
`;

const ActBtn = styled.button<{ $variant: 'accept' | 'reject' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    background: ${p => p.theme.colors.surface};
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.textSecondary)};
    cursor: pointer;

    &:hover:not(:disabled) {
        border-color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.error)};
        color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.error)};
    }
    &:disabled { opacity: 0.5; cursor: default; }
    svg { width: 12px; height: 12px; }
`;

const AmountInput = styled.input`
    width: 92px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    font-size: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
`;

/** Mutacje sugestii - właścicielem jest okno leada, żeby dzielić je z przyciskiem odświeżania. */
export type SuggestionActions = ReturnType<typeof useSuggestionActions>;

interface Props {
    suggestions: LeadServiceItem[];
    actions: SuggestionActions;
}

/**
 * Wiersze `<tr>` do wstawienia w `<tbody>` tabeli wyceny. Komponent świadomie
 * nie renderuje własnej tabeli ani nagłówka sekcji: wchodzi w cudzą siatkę
 * kolumn, bo o to właśnie chodzi - to ma być ten sam spis usług.
 */
export function SuggestedServiceRows({ suggestions, actions }: Props) {
    const { accept, reject, refresh } = actions;
    // Kwoty wpisywane inline dla pozycji „czeka na kwotę" (wycena niestandardowa bez historii).
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const busy = accept.isPending || reject.isPending || refresh.isPending;

    if (suggestions.length === 0) return null;

    const onAccept = (item: LeadServiceItem) => {
        if (item.priceGross == null) {
            const raw = amounts[item.id]?.replace(',', '.').trim();
            const zl = raw ? Number(raw) : NaN;
            if (!Number.isFinite(zl) || zl <= 0) return; // przycisk i tak zablokowany
            accept.mutate({ itemId: item.id, priceGross: Math.round(zl * 100) });
        } else {
            accept.mutate({ itemId: item.id });
        }
    };

    return (
        <>
            {suggestions.map((item) => {
                const pending = item.priceGross == null;
                const row = toQuoteRow(item);
                const amount = amounts[item.id] ?? '';
                const canAccept = !busy && (!pending || Number(amount.replace(',', '.')) > 0);
                return (
                    <Row key={item.id}>
                        <td>
                            <Name>
                                {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
                                <Badge>Sugerowane</Badge>
                            </Name>
                            {item.note && <span className="note">{item.note}</span>}
                            <Actions>
                                <ActBtn
                                    type="button"
                                    $variant="accept"
                                    disabled={!canAccept}
                                    onClick={() => onAccept(item)}
                                >
                                    <Check /> Akceptuj
                                </ActBtn>
                                <ActBtn
                                    type="button"
                                    $variant="reject"
                                    disabled={busy}
                                    onClick={() => reject.mutate(item.id)}
                                >
                                    <X /> Odrzuć
                                </ActBtn>
                            </Actions>
                        </td>
                        {/* Ta sama arytmetyka co w wierszu przyjętym: pozycja pokazuje
                            już teraz liczby, które zostaną po kliknięciu „Akceptuj".
                            Dopóki kwoty nie znamy, kolumny są puste - zero udawałoby
                            darmową usługę. */}
                        <td>{pending ? '—' : formatGrosze(row.netCents)}</td>
                        <td>{pending ? '—' : formatGrosze(row.vatCents)}</td>
                        <td>
                            {/* Pole na kwotę stoi w kolumnie brutto, czyli dokładnie tam,
                                gdzie brakującej liczby szuka wzrok. */}
                            {pending ? (
                                <AmountInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    placeholder="zł brutto"
                                    aria-label={`Kwota brutto: ${item.name}`}
                                    value={amount}
                                    disabled={busy}
                                    onChange={(e) => setAmounts((a) => ({ ...a, [item.id]: e.target.value }))}
                                />
                            ) : (
                                formatGrosze(row.grossCents)
                            )}
                            {item.priceSource === 'HISTORY' && <PriceTag $tone="history">z historii</PriceTag>}
                            {pending && <PriceTag $tone="pending">podaj kwotę</PriceTag>}
                        </td>
                    </Row>
                );
            })}
        </>
    );
}
