// src/modules/employees/components/worktime/CardNoteModal.tsx
//
// Notatka do pracownika przy zwrocie karty do poprawy albo przy odblokowaniu
// zatwierdzonej. API wymaga jej w obu przypadkach (`POST …/return {note}`), a pracownik
// dostaje ją w powiadomieniu - pusta notatka to karta wracająca bez słowa, co poprawić.
//
// Małe okno zamiast edytora w stopce strony: decyzja „zwróć" jest rzadsza od
// „zatwierdź" i nie powinna zmieniać układu strony karty. Okno jest stanem przejściowym,
// więc jego „Zwróć kartę" może być wypełnione (CLAUDE.md §2, wyjątek edytora).
// Blokadę przewijania tła daje ModalShell.

import { useId, useState } from 'react';
import styled from 'styled-components';
import {
    CloseBtn, ModalContent, ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup,
} from '@/common/components/ModalKit';
import { Button, Notice, ui } from '@/common/components/ui';

const NOTE_LIMIT = 1000;

interface Props {
    kind: 'return' | 'unlock';
    name: string;
    /** Odblokowanie karty z podpisanej listy unieważnia listę - trzeba to powiedzieć przed kliknięciem. */
    resignWarning?: string | null;
    pending: boolean;
    onSubmit: (note: string) => void;
    onClose: () => void;
    /** Warstwa okna - SUBMODAL_Z_INDEX, gdy otwiera się nad oknem karty. */
    zIndex?: number;
}

export function CardNoteModal({ kind, name, resignWarning, pending, onSubmit, onClose, zIndex }: Props) {
    const titleId = useId();
    const noteId = useId();
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const unlock = kind === 'unlock';

    const submit = () => {
        const trimmed = note.trim();
        if (!trimmed) {
            setError('Napisz, co trzeba poprawić - pracownik zobaczy tę notatkę.');
            return;
        }
        onSubmit(trimmed);
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm" labelledBy={titleId} dismissible={!pending} zIndex={zIndex}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={titleId}>{unlock ? 'Odblokuj kartę' : 'Zwróć do poprawy'}</ModalTitle>
                    <ModalSubtitle>{name}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {unlock && resignWarning && <Notice tone="warn">{resignWarning}</Notice>}
                <Field>
                    <NoteLabel htmlFor={noteId}>Co trzeba poprawić?</NoteLabel>
                    <NoteInput
                        id={noteId}
                        value={note}
                        maxLength={NOTE_LIMIT}
                        autoFocus
                        rows={4}
                        required
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${noteId}-error` : undefined}
                        placeholder="Np. brakuje wpisów z dwóch dni"
                        onChange={e => { setNote(e.target.value); setError(null); }}
                    />
                    {error && <NoteError id={`${noteId}-error`} role="alert">{error}</NoteError>}
                </Field>
            </ModalContent>
            <ModalFooter>
                <Footer>
                    <Button variant="outline" onClick={onClose} disabled={pending}>Anuluj</Button>
                    <Button variant="primary" onClick={submit} disabled={pending}>
                        {unlock
                            ? (pending ? 'Odblokowuję…' : 'Odblokuj kartę')
                            : (pending ? 'Zwracam…' : 'Zwróć kartę')}
                    </Button>
                </Footer>
            </ModalFooter>
        </ModalShell>
    );
}

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const NoteLabel = styled.label`
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
`;

const NoteInput = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    min-height: 96px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    font-family: inherit;
    font-size: 14px;
    line-height: 1.45;
    color: ${ui.ink};
    background: ${ui.surface};
    resize: vertical;

    &:focus { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px ${ui.brandTintHover}; }
    &[aria-invalid='true'] { border-color: ${ui.dangerLine}; }
`;

const NoteError = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.dangerInk};
`;

const Footer = styled.div`
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;
