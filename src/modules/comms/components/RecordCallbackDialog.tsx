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
// ── „Co dalej?" - dwa przyciski zamiast jednego ─────────────────────────────
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
// DWA PRZYCISKI, nie przycisk plus checkbox: checkbox zaznacza się świadomie,
// a więc rzadko, a wtedy wróciłby stan sprzed pytania. Lewy jest częstszym
// przypadkiem, ale żaden nie jest szary - wybór ma kosztować pół sekundy, a nie
// chwilę zastanowienia nad tym, który jest „właściwy".

import { useState } from 'react';
import styled from 'styled-components';
import { PhoneCall } from 'lucide-react';
import { useRecordLeadCallback } from '../hooks/useLeads';
import { IconButton } from './shared';

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    /* Ponad oknem szczegółów (ModalOverlay ma 1000) - pytanie pada właśnie z tamtego
       okna i musi stać nad nim, a nie za nim. */
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.45);
    padding: 16px;
`;

const Card = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: ${p => p.theme.shadows.xl};
    padding: 20px;
    width: 400px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h4 {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        font-size: 15px;
        color: ${p => p.theme.colors.text};

        svg { width: 15px; height: 15px; color: ${p => p.theme.colors.textMuted}; }
    }

    textarea {
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        min-height: 72px;
        outline: none;
        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};
`;

const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

/** Pytanie nad parą przycisków - nie etykieta pola, bo pola tu nie ma. */
const Question = styled.div`
    margin-top: 2px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textSecondary};
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

    @media (max-width: 420px) {
        grid-template-columns: 1fr;
    }
`;

const ChoiceButton = styled.button`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    .title {
        font-size: 13.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .sub {
        font-size: 11.5px;
        line-height: 1.35;
        color: ${p => p.theme.colors.textSecondary};
    }

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.primary};
        background: ${p => p.theme.colors.surfaceHover};
    }
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
    const record = useRecordLeadCallback();

    const submit = (owed: boolean) => {
        record.mutate(
            { leadId, note: note.trim() || undefined, owed },
            { onSuccess: onClose }
        );
    };

    return (
        <Backdrop onClick={onClose}>
            <Card onClick={(event) => event.stopPropagation()}>
                <h4><PhoneCall /> Kontakt poza pocztą</h4>
                <Hint>
                    Rozmowa telefoniczna, SMS albo spotkanie. Kontakt trafi na oś czasu
                    sprawy — tak samo jak wysłany mail.
                </Hint>
                <textarea
                    placeholder="Notatka (opcjonalnie) — np. prosił o kontakt po 15…"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    autoFocus
                    /* Ctrl/Cmd+Enter zapisuje - sam Enter łamie linię, jak w każdym
                       polu wielolinijkowym w tej aplikacji. */
                    /* Ctrl/Cmd+Enter zapisuje wariant częstszy: skrót ma przyspieszać
                       przypadek typowy, a nie podejmować za użytkownika decyzji, której
                       nie widać na klawiaturze. */
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            submit(false);
                        }
                    }}
                />

                <Question>Co dalej?</Question>
                <Choice>
                    <ChoiceButton type="button" disabled={record.isPending} onClick={() => submit(false)}>
                        <span className="title">Czekam na klienta</span>
                        <span className="sub">Piłka jest po jego stronie</span>
                    </ChoiceButton>
                    <ChoiceButton type="button" disabled={record.isPending} onClick={() => submit(true)}>
                        <span className="title">Mam coś wysłać</span>
                        <span className="sub">Sprawa zostaje w „Czeka na Ciebie"</span>
                    </ChoiceButton>
                </Choice>

                <Actions>
                    <IconButton type="button" onClick={onClose} disabled={record.isPending}>
                        Anuluj
                    </IconButton>
                </Actions>
            </Card>
        </Backdrop>
    );
}
