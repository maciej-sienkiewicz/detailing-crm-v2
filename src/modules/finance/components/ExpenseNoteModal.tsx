import React, { useEffect, useState } from 'react';
import { useUpdateExpenseNote, useDeleteExpenseNote } from '../hooks/useKsef';
import type { KsefExpense } from '../types';
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
    isOpen:   boolean;
    onClose:  () => void;
    expense:  KsefExpense | null;
}

export const ExpenseNoteModal: React.FC<Props> = ({ isOpen, onClose, expense }) => {
    const updateNote = useUpdateExpenseNote();
    const deleteNote = useDeleteExpenseNote();
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNote(expense?.note ?? '');
            setError(null);
        }
    }, [isOpen, expense]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expense) return;
        setError(null);

        if (!note.trim()) {
            setError('Notatka nie może być pusta.');
            return;
        }

        try {
            await updateNote.mutateAsync({ id: expense.id, data: { note: note.trim() } });
            onClose();
        } catch {
            setError('Nie udało się zapisać notatki. Spróbuj ponownie.');
        }
    };

    const handleDelete = async () => {
        if (!expense) return;
        setError(null);
        try {
            await deleteNote.mutateAsync(expense.id);
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
                    <ModalTitle>{expense?.note ? 'Edytuj notatkę' : 'Dodaj notatkę'}</ModalTitle>
                    {expense?.documentNumber && (
                        <ModalSubtitle>{expense.documentNumber}</ModalSubtitle>
                    )}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <form id="expense-note-form" onSubmit={handleSubmit}>
                    <FormField>
                        <FieldLabel htmlFor="expense-note">Notatka</FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="expense-note"
                                placeholder="Treść notatki…"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                autoFocus
                            />
                        </InputShellTextArea>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                {expense?.note && (
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
                    form="expense-note-form"
                    disabled={isSaving}
                >
                    {updateNote.isPending ? 'Zapisywanie…' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
