// src/modules/comms/components/RecordCallbackDialog.tsx
//
// „Kontakt poza pocztą" — rozmowa, SMS albo spotkanie odnotowane na leadzie.
//
// Kontakt spoza skrzynki nie zostawia śladu, który system mógłby przeczytać: w wątku
// nie przybywa mail, więc lead po odbytej rozmowie wyglądał identycznie jak lead,
// o którym nikt nie pamiętał. Oś czasu milczała o najważniejszym kontakcie, a lead
// wisiał w kolejce „czeka na naszą odpowiedź" mimo że odpowiedź padła — tyle że głosem.
//
// Notatka jest opcjonalna świadomie: gdyby była wymagana, ludzie odnotowywaliby kontakt
// rzadziej, a wtedy oś czasu kłamałaby dalej. Sam fakt kontaktu jest tu wartością,
// jego treść tylko uzupełnieniem.
//
// ── „Co dalej?" - wybór bez podpowiedzi ─────────────────────────────────────
//
// Odnotowany kontakt stempluje reakcję studia, więc sprawa schodzi z kolejki
// zaległości. W jednym codziennym przypadku jest to nieprawda: klient dzwoni
// i prosi o przesłanie oferty mailem. Ruch zostaje wtedy PO NASZEJ stronie,
// a sprawa - w danych nie do odróżnienia od załatwionej - znika z oczu.
//
// System nie dowie się tego nigdy, a człowiek wie na pewno przez trzydzieści
// sekund po odłożeniu telefonu. To jest najtańsza chwila w całej aplikacji na
// zadanie tego pytania - i dlatego pada tutaj, a nie nigdzie indziej.
//
// Dwie równorzędne odpowiedzi, ŻADNA nie jest zaznaczona z góry: domyślna wróciłaby
// stan sprzed pytania (człowiek zostawiłby ją odruchowo). Do 25.10.2026 same karty
// były przyciskami zapisu - kto wpisał notatkę, szukał „Zapisz" i nie wiedział, że
// kliknięcie w kartę już zapisuje i zamyka okno. Teraz karta jest wyborem, a zapisuje
// jeden przycisk w stopce, aktywny dopiero po wyborze. Okno stoi na ModalShell
// (Esc, X, blokada przewijania tła - CLAUDE.md §3).
import { useState } from 'react';
import styled from 'styled-components';
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
import { useRecordLeadCallback } from '../hooks/useLeads';
import { IconButton, PrimaryButton } from './shared';

const Note = styled.textarea`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    outline: none;
    &:focus { border-color: ${p => p.theme.colors.primary}; }
`;

const Question = styled.fieldset`
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;

    legend {
        padding: 0;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 600;
        color: ${p => p.theme.colors.text};
    }
`;

/**
 * Para równorzędnych wyjść. Na wąskim oknie łamią się na dwa wiersze, a nie
 * ściskają do dwóch słów - „Mam coś wysłać" przycięte do „Mam coś…" przestaje
 * być pytaniem, na które da się odpowiedzieć bez zgadywania.
 */
const Choice = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media (max-width: 460px) {
        grid-template-columns: 1fr;
    }
`;

/** Wybór - odcień i obwódka; wypełniony jest tylko „Zapisz kontakt" (CLAUDE.md §2). */
const ChoiceButton = styled.button<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 56px;
    padding: 10px 12px;
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    border-radius: ${p => p.theme.radii.lg};
    background: ${({ $active, theme }) => ($active ? 'rgba(3, 105, 161, 0.08)' : theme.colors.surface)};
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, border-color ${p => p.theme.transitions.fast};

    .title {
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text)};
    }
    .sub {
        font-size: 13px;
        line-height: 1.35;
        color: ${p => p.theme.colors.textSecondary};
    }

    &:hover:not(:disabled) { border-color: ${p => p.theme.colors.primary}; }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 1px;
    }
    &:disabled { opacity: 0.6; cursor: progress; }
`;

interface RecordCallbackDialogProps {
    leadId: string;
    onClose: () => void;
}

export function RecordCallbackDialog({ leadId, onClose }: RecordCallbackDialogProps) {
    const [note, setNote] = useState('');
    const [owed, setOwed] = useState<boolean | null>(null);
    const record = useRecordLeadCallback();

    const submit = (value: boolean) => {
        record.mutate(
            { leadId, note: note.trim() || undefined, owed: value },
            { onSuccess: onClose }
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm" zIndex={SUBMODAL_Z_INDEX} labelledBy="callback-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="callback-title">Kontakt poza pocztą</ModalTitle>
                    <ModalSubtitle>Telefon, SMS albo spotkanie. Zapiszemy to w przebiegu sprawy.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Note
                    aria-label="Notatka"
                    placeholder="Notatka (opcjonalnie), np. prosił o kontakt po 15"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    autoFocus
                    /* Ctrl/Cmd+Enter zapisuje wybrany wariant, a bez wyboru - częstszy:
                       skrót ma przyspieszać przypadek typowy. Sam Enter łamie linię,
                       jak w każdym polu wielolinijkowym w tej aplikacji. */
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            submit(owed ?? false);
                        }
                    }}
                />
                <Question>
                    <legend>Co dalej?</legend>
                    <Choice role="radiogroup" aria-label="Co dalej?">
                        <ChoiceButton
                            type="button"
                            role="radio"
                            aria-checked={owed === false}
                            $active={owed === false}
                            disabled={record.isPending}
                            onClick={() => setOwed(false)}
                        >
                            <span className="title">Czekam na klienta</span>
                            <span className="sub">Nic nie zostało po naszej stronie</span>
                        </ChoiceButton>
                        <ChoiceButton
                            type="button"
                            role="radio"
                            aria-checked={owed === true}
                            $active={owed === true}
                            disabled={record.isPending}
                            onClick={() => setOwed(true)}
                        >
                            <span className="title">Mam coś wysłać</span>
                            <span className="sub">Sprawa zostaje w „Czeka na nas”</span>
                        </ChoiceButton>
                    </Choice>
                </Question>
            </ModalContent>
            <ModalFooter>
                <IconButton type="button" onClick={onClose} disabled={record.isPending}>
                    Anuluj
                </IconButton>
                <PrimaryButton type="button" disabled={owed === null || record.isPending} onClick={() => owed !== null && submit(owed)}>
                    {record.isPending ? 'Zapisywanie…' : 'Zapisz kontakt'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
