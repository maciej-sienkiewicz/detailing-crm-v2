// src/modules/comms/components/LeadLostReasonDialog.tsx
// Pytanie o powód przegranej - jedyne miejsce, w którym system nie pozwala
// przestawić statusu jednym kliknięciem.
//
// Powody są zamkniętym słownikiem ze słownika studia, a nie polem tekstowym:
// „za drogo" wpisane na dwadzieścia sposobów nie da się policzyć, a właśnie
// policzenie tych powodów jest jedynym sensem ich zbierania. Notatka zostaje
// dla tego jednego zdania, którego słownik nie przewidzi.
//
// Okno stoi na ModalShell (25.10.2026). Dawniej miało własną nakładkę bez
// przewijania: trzynaście powodów jeden pod drugim było wyższe niż okno laptopa
// (1366×650), nagłówek uciekał nad ekran, a „Zamknij jako przegrane" pod niego -
// sprawy nie dało się zamknąć jako przegranej. Nie było też X, Esc ani blokady
// przewijania tła (CLAUDE.md §3). Teraz lista przewija się w środku, przyciski
// stoją w stopce, a powody są w dwóch grupach zamiast jednej długiej kolumny.
import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import {
    CloseBtn,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalShell,
    ModalSubtitle,
    ModalTitle,
    ModalTitleGroup,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { useChangeLeadStatus, useLeadDictionaries } from '../hooks/useLeads';
import { IconButton, PrimaryButton } from './shared';
import { problemDetail } from '@/core/problem';

/**
 * Powody, które backend liczy jako „nie-strata" (`countsAsLoss = false` w LeadLostReason).
 * Słownik przychodzi z serwera bez tej flagi, a człowiek wybiera szybciej, gdy „sami
 * odmówiliśmy" nie stoi w jednym rzędzie z „za drogo". Nieznany kod trafia do strat.
 */
const NOT_A_LOSS = new Set(['DECLINED_BY_US', 'OUT_OF_SCOPE', 'POSTPONED', 'SPAM']);
/** „Inny powód" zamyka listę - stał w jej środku i odbierał uwagę konkretnym powodom. */
const OTHER = 'OTHER';

const Group = styled.fieldset`
    margin: 0;
    padding: 0;
    border: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;

    legend {
        padding: 0;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 600;
        color: ${p => p.theme.colors.text};
    }
`;

const Options = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
    gap: 8px;
`;

/** Powód - odcień i obwódka po wyborze; jedyne wypełnienie w oknie to „Zamknij jako przegrane". */
const ReasonOption = styled.button<{ $active: boolean }>`
    min-height: 44px;
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    background: ${({ $active }) => ($active ? 'rgba(3, 105, 161, 0.08)' : '#ffffff')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text)};
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    font-size: 14px;
    font-weight: ${({ $active }) => ($active ? 600 : 400)};
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background ${p => p.theme.transitions.fast}, border-color ${p => p.theme.transitions.fast};

    &:hover { background: ${({ $active, theme }) => ($active ? 'rgba(3, 105, 161, 0.08)' : theme.colors.surfaceHover)}; }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }
`;

const Note = styled.textarea`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 64px;
    outline: none;
    &:focus { border-color: ${p => p.theme.colors.primary}; }
`;

interface LeadLostReasonDialogProps {
    /** Jedna sprawa - okno samo zmienia jej status. */
    leadId?: string;
    /**
     * Wiele spraw naraz (zaznaczenie w kolejce): okno tylko zbiera powód, a zmianę
     * robi wywołujący. Pytanie i słownik powodów są te same co przy jednej sprawie.
     */
    bulk?: { count: number; pending: boolean; onSubmit: (reason: string, note?: string) => void };
    onClose: () => void;
    /** Powód zapisany - przed `onClose`, który pada też przy rezygnacji (tablica spraw odróżnia jedno od drugiego). */
    onSaved?: () => void;
}

/**
 * Okno jest otwarte dokładnie wtedy, gdy jest zamontowane - wybrany powód żyje
 * więc tyle, co jedno otwarcie, i nie trzeba go kasować efektem przy następnym.
 */
export function LeadLostReasonDialog({ leadId, bulk, onClose, onSaved }: LeadLostReasonDialogProps) {
    const [reason, setReason] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const { data: dictionaries } = useLeadDictionaries();
    const changeStatus = useChangeLeadStatus();
    const { showError } = useToast();

    const all = dictionaries?.lostReasons ?? [];
    const byOrder = (a: { code: string }, b: { code: string }) => Number(a.code === OTHER) - Number(b.code === OTHER);
    const losses = all.filter((option) => !NOT_A_LOSS.has(option.code)).sort(byOrder);
    const notLosses = all.filter((option) => NOT_A_LOSS.has(option.code));

    const confirm = () => {
        if (!reason) return;
        if (bulk) {
            bulk.onSubmit(reason, note || undefined);
            return;
        }
        if (!leadId) return;
        changeStatus.mutate(
            { leadId, status: 'LOST', lostReasonCode: reason, lostNote: note || undefined },
            {
                onSuccess: () => {
                    onSaved?.();
                    onClose();
                },
                onError: (error) => {
                    showError('Nie udało się zamknąć sprawy', problemDetail(error) ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    const options = (items: typeof all) => (
        <Options role="radiogroup">
            {items.map((option) => (
                <ReasonOption
                    key={option.code}
                    type="button"
                    role="radio"
                    aria-checked={reason === option.code}
                    $active={reason === option.code}
                    onClick={() => setReason(option.code)}
                >
                    {option.label}
                </ReasonOption>
            ))}
        </Options>
    );

    return (
        <ModalShell isOpen onClose={onClose} size="md" zIndex={SUBMODAL_Z_INDEX} labelledBy="lost-reason-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="lost-reason-title">
                        {bulk && bulk.count > 1
                            ? `Dlaczego te zapytania przepadły (${bulk.count})?`
                            : 'Dlaczego to zapytanie przepadło?'}
                    </ModalTitle>
                    <ModalSubtitle>Wybierz jeden powód. Powody zbieramy, żeby policzyć je w analityce.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {all.length === 0 && <ModalSubtitle>Wczytywanie powodów…</ModalSubtitle>}
                {losses.length > 0 && (
                    <Group>
                        <legend>Klient zrezygnował</legend>
                        {options(losses)}
                    </Group>
                )}
                {notLosses.length > 0 && (
                    <Group>
                        <legend>Nie liczy się jako strata</legend>
                        {options(notLosses)}
                    </Group>
                )}
                <Note
                    aria-label="Notatka"
                    placeholder="Notatka (opcjonalnie)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
            </ModalContent>
            <ModalFooter>
                <IconButton type="button" onClick={onClose}>Anuluj</IconButton>
                <PrimaryButton type="button" disabled={!reason || changeStatus.isPending || bulk?.pending} onClick={confirm}>
                    Zamknij jako przegrane
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
