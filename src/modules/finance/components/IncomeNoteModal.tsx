import React, { useEffect, useState } from 'react';
import { useUpdateIncomeNote, useDeleteIncomeNote } from '../hooks/useIncomeDocuments';
import type { IncomeDocument } from '../types';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormField,
    FieldLabel,
    InputShellTextArea,
    BareTextArea,
    FormAlertBanner,
} from '@/common/components/Form';

interface Props {
    isOpen:    boolean;
    onClose:   () => void;
    document:  IncomeDocument | null;
}

export const IncomeNoteModal: React.FC<Props> = ({ isOpen, onClose, document }) => {
    const updateNote = useUpdateIncomeNote();
    const deleteNote = useDeleteIncomeNote();
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNote(document?.note ?? '');
            setError(null);
        }
    }, [isOpen, document]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!document) return;
        setError(null);

        if (!note.trim()) {
            setError('Notatka nie może być pusta.');
            return;
        }

        try {
            await updateNote.mutateAsync({ sourceKind: document.sourceKind, id: document.id, note: note.trim() });
            onClose();
        } catch {
            setError('Nie udało się zapisać notatki. Spróbuj ponownie.');
        }
    };

    const handleDelete = async () => {
        if (!document) return;
        setError(null);
        try {
            await deleteNote.mutateAsync({ sourceKind: document.sourceKind, id: document.id });
            onClose();
        } catch {
            setError('Nie udało się usunąć notatki. Spróbuj ponownie.');
        }
    };

    const isSaving = updateNote.isPending || deleteNote.isPending;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{document?.note ? 'Edytuj notatkę' : 'Dodaj notatkę'}</ModalTitle>
                    {document?.documentNumber && (
                        <ModalSubtitle>{document.documentNumber}</ModalSubtitle>
                    )}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <form id="income-note-form" onSubmit={handleSubmit}>
                    <FormField>
                        <FieldLabel htmlFor="income-note">Notatka</FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="income-note"
                                placeholder="Treść notatki..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                autoFocus
                            />
                        </InputShellTextArea>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                {document?.note && (
                    <SharedButton
                        $variant="danger"
                        type="button"
                        onClick={handleDelete}
                        disabled={isSaving}
                        style={{ marginRight: 'auto' }}
                    >
                        Usuń notatkę
                    </SharedButton>
                )}
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    type="submit"
                    form="income-note-form"
                    disabled={isSaving}
                >
                    {updateNote.isPending ? 'Zapisywanie...' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
