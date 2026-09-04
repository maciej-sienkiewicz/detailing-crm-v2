// src/modules/comms/components/RecordCallbackDialog.tsx
//
// „Oddzwoniłem" — telefon do klienta odnotowany na leadzie.
//
// Rozmowa telefoniczna nie zostawia śladu, który system mógłby przeczytać: w wątku
// nie przybywa mail, więc lead po odbytej rozmowie wyglądał identycznie jak lead,
// o którym nikt nie pamiętał. Oś czasu milczała o najważniejszym kontakcie, a lead
// wisiał w kolejce „czeka na naszą odpowiedź" mimo że odpowiedź padła — tyle że głosem.
//
// Notatka jest opcjonalna świadomie: gdyby była wymagana, ludzie klikaliby „Oddzwoniłem"
// rzadziej, a wtedy oś czasu kłamałaby dalej. Sam fakt kontaktu jest tu wartością,
// treść rozmowy tylko jej uzupełnieniem.

import { useState } from 'react';
import styled from 'styled-components';
import { PhoneCall } from 'lucide-react';
import { useRecordLeadCallback } from '../hooks/useLeads';
import { IconButton, PrimaryButton } from './shared';

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

interface RecordCallbackDialogProps {
    leadId: string;
    onClose: () => void;
}

export function RecordCallbackDialog({ leadId, onClose }: RecordCallbackDialogProps) {
    const [note, setNote] = useState('');
    const record = useRecordLeadCallback();

    const submit = () => {
        record.mutate(
            { leadId, note: note.trim() || undefined },
            { onSuccess: onClose }
        );
    };

    return (
        <Backdrop onClick={onClose}>
            <Card onClick={(event) => event.stopPropagation()}>
                <h4><PhoneCall /> Oddzwoniłem do klienta</h4>
                <Hint>
                    Rozmowa trafi na oś czasu leada, a lead zejdzie z kolejki oczekujących
                    na naszą odpowiedź — tak samo jak po wysłaniu maila.
                </Hint>
                <textarea
                    placeholder="Notatka z rozmowy (opcjonalnie) — np. prosił o kontakt po 15…"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    autoFocus
                    /* Ctrl/Cmd+Enter zapisuje - sam Enter łamie linię, jak w każdym
                       polu wielolinijkowym w tej aplikacji. */
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                <Actions>
                    <IconButton type="button" onClick={onClose} disabled={record.isPending}>
                        Anuluj
                    </IconButton>
                    <PrimaryButton type="button" onClick={submit} disabled={record.isPending}>
                        {record.isPending ? 'Zapisywanie…' : 'Zapisz telefon'}
                    </PrimaryButton>
                </Actions>
            </Card>
        </Backdrop>
    );
}
