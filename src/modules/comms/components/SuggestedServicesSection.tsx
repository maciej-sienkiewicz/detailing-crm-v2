// src/modules/comms/components/SuggestedServicesSection.tsx
//
// „Sugerowane usługi": AI na podstawie treści maila podsuwa pozycje z cennika,
// człowiek je jednym kliknięciem przyjmuje albo odrzuca. Wiersze są delikatnie
// przygaszone (opacity) i noszą badge „Sugerowane" — wyraźnie ODRÓŻNIONE od wyceny,
// dopóki ktoś ich nie przyjmie.
//
// Cena nigdy nie pochodzi od modelu. Stała bierze się z cennika, „wycena
// niestandardowa" — z podobnego zlecenia; a gdy historii brak, wiersz jest BEZ ceny
// i przyjęcie wymusza podanie kwoty inline. To jest cała obrona przed halucynacją
// ceny widoczna dla użytkownika.

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useSuggestionActions } from '../hooks/useLeads';
import type { LeadServiceItem } from '../types';
import { IconButton, formatGrosze } from './shared';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.li<{ $pending: boolean }>`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 6px 10px;
    padding: 9px 10px;
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    /* Sugestia jest półprzezroczysta — dopóki jej nie przyjmiesz, nie jest wyceną. */
    opacity: 0.72;
    transition: opacity ${p => p.theme.transitions.fast};
    &:hover { opacity: 1; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    overflow-wrap: anywhere;
`;

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 7px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.medium};
    letter-spacing: 0.02em;
    white-space: nowrap;
    background: rgba(14, 165, 233, 0.1);
    color: ${p => p.theme.colors.primary};
    svg { width: 10px; height: 10px; }
`;

const Price = styled.div`
    text-align: right;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    small {
        display: block;
        margin-top: 1px;
        font-size: 10px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }
`;

const PriceTag = styled.span<{ $tone: 'history' | 'pending' }>`
    display: block;
    margin-top: 1px;
    text-align: right;
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$tone === 'pending' ? p.theme.colors.warning : p.theme.colors.textMuted)};
`;

const Actions = styled.div`
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
`;

const ActBtn = styled.button<{ $variant: 'accept' | 'reject' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding: 0 9px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    background: ${p => p.theme.colors.surface};
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.textSecondary)};
    cursor: pointer;

    &:hover {
        border-color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.error)};
        color: ${p => (p.$variant === 'accept' ? p.theme.colors.success : p.theme.colors.error)};
    }
    &:disabled { opacity: 0.5; cursor: default; }
    svg { width: 13px; height: 13px; }
`;

const AmountInput = styled.input`
    width: 96px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
`;

const Foot = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
`;

const Note = styled.span`
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
`;

const Spinner = styled.div`
    width: 15px;
    height: 15px;
    border: 2px solid ${p => p.theme.colors.border};
    border-top-color: ${p => p.theme.colors.primary};
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;
`;

interface Props {
    leadId: string;
    suggestions: LeadServiceItem[];
}

export function SuggestedServicesSection({ leadId, suggestions }: Props) {
    const { accept, reject, refresh } = useSuggestionActions(leadId);
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
            <List>
                {suggestions.map((item) => {
                    const pending = item.priceGross == null;
                    const amount = amounts[item.id] ?? '';
                    const canAccept = !busy && (!pending || (Number(amount.replace(',', '.')) > 0));
                    return (
                        <Row key={item.id} $pending={pending}>
                            <Head>
                                {item.name}
                                <Badge><Sparkles /> Sugerowane</Badge>
                            </Head>
                            <Price>
                                {pending ? '—' : formatGrosze(item.priceGross ?? 0)}
                                {item.priceSource === 'HISTORY' && <PriceTag $tone="history">z historii</PriceTag>}
                                {pending && <PriceTag $tone="pending">podaj kwotę</PriceTag>}
                            </Price>
                            <Actions>
                                {pending && (
                                    <AmountInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                        placeholder="zł brutto"
                                        value={amount}
                                        disabled={busy}
                                        onChange={(e) => setAmounts((a) => ({ ...a, [item.id]: e.target.value }))}
                                    />
                                )}
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
            <Foot>
                <Note>Podsunięte na podstawie treści zapytania. Nieodrzucone wejdą do rezerwacji.</Note>
                {refresh.isPending ? (
                    <Spinner />
                ) : (
                    <IconButton type="button" disabled={busy} onClick={() => refresh.mutate()}>
                        <RefreshCw size={13} /> Sprawdź ponownie
                    </IconButton>
                )}
            </Foot>
        </>
    );
}
