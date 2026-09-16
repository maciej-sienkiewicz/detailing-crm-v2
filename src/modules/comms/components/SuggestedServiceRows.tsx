// src/modules/comms/components/SuggestedServiceRows.tsx
//
// „Sugerowane usługi": AI na podstawie treści maila podsuwa pozycje z cennika,
// człowiek je jednym kliknięciem przyjmuje albo odrzuca.
//
// Sugestie SĄ ODDZIELONE od wyceny, a nie wtopione w nią. Wcześniej czytały się
// w tym samym rytmie co pozycje przyjęte - ten sam stopień pisma, ten sam szary
// kolor, tylko przygaszone o 25% i z małą plakietką „Sugerowane" - i cała sekcja
// zlewała się w jedną długą szarą listę, w której nie dało się wzrokiem oddzielić
// tego, co klientowi obiecaliśmy, od tego, co dopiero proponuje maszyna. Teraz
// sugestia jest KARTĄ z własnym nagłówkiem sekcji: niebieska krawędź z lewej mówi
// „propozycja", a nagłówek liczy, ile ich czeka.
//
// Wygląd niesie stan i tylko stan:
//  - kwota zostaje szara, bo do sumy „Razem" nie wchodzi, dopóki ktoś jej nie
//    przyjmie. Liczba w kolorze tekstu obiecywałaby, że już się liczy;
//  - „Akceptuj" jest wypełniony, „Odrzuć" jest cichy. Wcześniej oba były tym
//    samym szarym przyciskiem z ramką, więc na pytanie „co tu kliknąć" widok
//    odpowiadał „sam zdecyduj";
//  - plakietka „Sugerowane" zniknęła z każdego wiersza: nagłówek sekcji mówi to
//    raz dla wszystkich, a powtórzony przy każdej pozycji był trzecim sygnałem
//    tej samej rzeczy obok karty i koloru.
//
// Cena nigdy nie pochodzi od modelu. Stała bierze się z cennika, „wycena
// niestandardowa" — z podobnego zlecenia; a gdy historii brak, pozycja jest BEZ ceny
// i przyjęcie wymusza podanie kwoty inline. To jest cała obrona przed halucynacją
// ceny widoczna dla użytkownika.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, Sparkles, X } from 'lucide-react';
import type { useSuggestionActions } from '../hooks/useLeads';
import { toQuoteRow } from '../utils/leadServiceLines';
import type { LeadServiceItem } from '../types';
import { formatGrosze } from './shared';

/** Cała sekcja: nagłówek plus karty. Odsunięta od sumy wyceny, która stoi wyżej. */
const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
`;

/**
 * Nagłówek sekcji w tej samej wadze co etykiety szyny („WYCENA", „KLIENT"), ale
 * w kolorze akcentu - to nie kolejna pozycja listy, to inna kategoria treści.
 */
const BlockHeader = styled.h5`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.primary};

    svg { width: 13px; height: 13px; }

    .count {
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: ${p => p.theme.radii.full};
        background: rgba(14, 165, 233, 0.12);
        font-size: 10px;
        line-height: 16px;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

/**
 * Jedna propozycja jako karta. Pasek z lewej niesie znaczenie „to jeszcze nie
 * jest twoja wycena" bez ani jednego słowa, a ramka daje sugestiom własne
 * granice - przy trzech propozycjach pod sobą płaska lista była ścianą tekstu.
 */
const Card = styled.li`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 6px 12px;
    padding: 10px 12px;
    border: 1px solid #e0f2fe;
    border-left: 3px solid ${p => p.theme.colors.primary};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    font-size: 13.5px;
`;

const Name = styled.div`
    min-width: 0;
    color: ${p => p.theme.colors.text};
    font-weight: ${p => p.theme.fontWeights.medium};
    overflow-wrap: anywhere;
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
    line-height: 1.5;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Przyciski w osobnym wierszu karty, oddzielone kreską: decyzja jest czymś innym
 * niż opis pozycji, a przy 288 px szyny „Akceptuj" i „Odrzuć" obok nazwy i kwoty
 * wymuszały szerokość, której panel nie ma.
 */
const Actions = styled.div`
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
    padding-top: 8px;
    border-top: 1px solid ${p => p.theme.colors.surfaceAlt};
`;

const actBase = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 34px;
    padding: 0 12px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 120ms ease;
    &:disabled { opacity: 0.45; cursor: default; }
    svg { width: 13px; height: 13px; }
`;

/** Krok, po który ta sekcja istnieje - jedyny wypełniony przycisk w karcie. */
const AcceptBtn = styled.button`
    ${actBase}
    flex: 1 1 auto;
    border: 1px solid ${p => p.theme.colors.success};
    background: ${p => p.theme.colors.success};
    color: #ffffff;

    &:hover:not(:disabled) { filter: brightness(0.94); }
`;

/** Odrzucenie jest ciche: dostępne, ale nie zaprasza. Czerwień dopiero pod kursorem. */
const RejectBtn = styled.button`
    ${actBase}
    flex: 0 0 auto;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textMuted};

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.error};
        color: ${p => p.theme.colors.error};
    }
`;

/**
 * Pole kwoty stoi tam, gdzie stałaby liczba - i kurczy się razem z panelem,
 * żeby przy wąskiej szynie nie rozpychać wiersza.
 */
const AmountInput = styled.input`
    width: min(92px, 30vw);
    height: 28px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.warning};
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
        <Block>
            <BlockHeader>
                <Sparkles /> Sugerowane usługi
                <span className="count">{suggestions.length}</span>
            </BlockHeader>

            <List>
                {suggestions.map((item) => {
                    const pending = item.priceGross == null;
                    const row = toQuoteRow(item);
                    const amount = amounts[item.id] ?? '';
                    const canAccept = !busy && (!pending || Number(amount.replace(',', '.')) > 0);
                    return (
                        <Card key={item.id}>
                            <Name>
                                {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
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
                                <AcceptBtn
                                    type="button"
                                    disabled={!canAccept}
                                    onClick={() => onAccept(item)}
                                >
                                    <Check /> Akceptuj
                                </AcceptBtn>
                                <RejectBtn
                                    type="button"
                                    title="Odrzuć tę propozycję"
                                    disabled={busy}
                                    onClick={() => reject.mutate(item.id)}
                                >
                                    <X /> Odrzuć
                                </RejectBtn>
                            </Actions>
                        </Card>
                    );
                })}
            </List>
        </Block>
    );
}
