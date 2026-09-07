// src/modules/comms/components/SuggestedServiceRows.tsx
//
// „Sugerowane usługi": AI na podstawie treści maila podsuwa pozycje z cennika,
// człowiek je jednym kliknięciem przyjmuje albo odrzuca.
//
// Sugestia czyta się w tym samym rytmie co pozycja wyceny: nazwa po lewej, kwota
// brutto po prawej. Wcześniej były to wiersze czterokolumnowej tabeli (netto, VAT,
// brutto) i w szynie obok kolejki - 288 px - trzy kolumny liczb obok nazwy, plakietki
// i dwóch przycisków po prostu się nie mieściły: kwota brutto wychodziła poza panel,
// a pod oknem pojawiał się poziomy pasek przewijania. Netto i VAT i tak nie stoją
// przy pozycjach przyjętych, więc przy sugestii były liczbami bez pary.
//
// Stan pozycji niesie jej wygląd: sugestia jest przygaszona, ma plakietkę
// „Sugerowane" i dwa przyciski, których wiersz wyceny nie ma. Kwota jest szara,
// bo do sumy „Razem" nie wchodzi - liczba w kolorze tekstu obiecywałaby, że już się
// liczy.
//
// Cena nigdy nie pochodzi od modelu. Stała bierze się z cennika, „wycena
// niestandardowa" — z podobnego zlecenia; a gdy historii brak, pozycja jest BEZ ceny
// i przyjęcie wymusza podanie kwoty inline. To jest cała obrona przed halucynacją
// ceny widoczna dla użytkownika.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, X } from 'lucide-react';
import type { useSuggestionActions } from '../hooks/useLeads';
import { toQuoteRow } from '../utils/leadServiceLines';
import type { LeadServiceItem } from '../types';
import { formatGrosze } from './shared';

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

/**
 * Dwie kolumny, tak jak w spisie pozycji przyjętych: treść i kwota. Przyciski
 * schodzą do własnego wiersza siatki, więc przy wąskim panelu odbierają miejsce
 * kolumnie nazwy, a nie kwocie - kwota zostaje na swoim miejscu i nigdy nie
 * wypada poza panel.
 */
const Row = styled.li`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 4px 12px;
    font-size: 13.5px;
    opacity: 0.75;
    transition: opacity ${p => p.theme.transitions.fast};

    &:hover, &:focus-within { opacity: 1; }
`;

const Name = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    color: ${p => p.theme.colors.textSecondary};
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

/** Kwota sugestii: szara, bo nie wchodzi do sumy, dopóki ktoś jej nie przyjmie. */
const Amount = styled.div`
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    color: ${p => p.theme.colors.textMuted};
`;

/** Powód, dla którego cena jest taka, a nie inna - albo dlaczego jej nie ma. */
const PriceTag = styled.span<{ $tone: 'history' | 'pending' }>`
    display: block;
    margin-top: 1px;
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$tone === 'pending' ? p.theme.colors.warning : p.theme.colors.textMuted)};
`;

const Note = styled.span`
    grid-column: 1 / -1;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Przyciski zajmują całą szerokość wiersza i wolno im się złamać: przy 288 px
 * „Akceptuj" i „Odrzuć" obok nazwy wymuszały szerokość, której panel nie ma.
 */
const Actions = styled.div`
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
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
    font-family: inherit;
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

/**
 * Pole kwoty stoi tam, gdzie stałaby liczba - i kurczy się razem z panelem,
 * żeby przy wąskiej szynie nie rozpychać wiersza.
 */
const AmountInput = styled.input`
    width: min(92px, 30vw);
    height: 24px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    font-family: inherit;
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
        <List>
            {suggestions.map((item) => {
                const pending = item.priceGross == null;
                const row = toQuoteRow(item);
                const amount = amounts[item.id] ?? '';
                const canAccept = !busy && (!pending || Number(amount.replace(',', '.')) > 0);
                return (
                    <Row key={item.id}>
                        <Name>
                            {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
                            <Badge>Sugerowane</Badge>
                        </Name>
                        <Amount>
                            {/* Pole na kwotę stoi w miejscu liczby, czyli dokładnie tam,
                                gdzie brakującej kwoty szuka wzrok. Zero udawałoby usługę
                                za darmo, więc dopóki kwoty nie znamy, nie ma tu liczby. */}
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
                        </Amount>
                        {item.note && <Note>{item.note}</Note>}
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
                    </Row>
                );
            })}
        </List>
    );
}
