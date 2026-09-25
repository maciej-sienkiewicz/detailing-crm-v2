// src/modules/vehicles/components/VehicleNotes.tsx
//
// Notatki o pojeździe - panel w szynie bocznej, ten sam co notatka techniczna
// wizyty: tytuł zwykłym pismem, „Dodaj" obrysowane (wypełnienie należy do „Nowa
// wizyta" w nagłówku), edycja w miejscu. Autor i data zwykłym zdaniem, nie
// sklejone kropką (CLAUDE.md §4); usunięcie pyta oknem potwierdzenia.

import { useState } from 'react';
import styled from 'styled-components';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatDateTime } from '@/common/utils';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, IconButton, Panel, SectionTitle, ui } from '@/common/components/ui';
import { useVehicleNotes, useCreateVehicleNote, useUpdateVehicleNote, useDeleteVehicleNote } from '../hooks/useVehicleNotes';
import type { VehicleNote } from '../types';

const RailPanel = styled(Panel)`
    padding: 16px 18px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const List = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
`;

const Item = styled.li`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;
    border-top: 1px solid ${ui.lineFaint};

    &:first-child { border-top: none; padding-top: 0; }
`;

const Text = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.inkSoft};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

const Foot = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const Meta = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Actions = styled.div`
    display: flex;
    gap: 2px;
    flex-shrink: 0;
`;

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 72px;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: 10px;
    background: ${ui.surface};
    color: ${ui.ink};
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    resize: vertical;

    &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
`;

const Empty = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

interface VehicleNotesProps {
    vehicleId: string;
    readOnly?: boolean;
    id?: string;
}

export const VehicleNotes = ({ vehicleId, readOnly = false, id }: VehicleNotesProps) => {
    const { notes, isLoading } = useVehicleNotes(vehicleId);
    const createMutation = useCreateVehicleNote(vehicleId);
    const updateMutation = useUpdateVehicleNote(vehicleId);
    const deleteMutation = useDeleteVehicleNote(vehicleId);

    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [toDelete, setToDelete] = useState<VehicleNote | null>(null);

    const handleAdd = () => {
        const trimmed = newContent.trim();
        if (!trimmed) return;
        createMutation.mutate(trimmed, {
            onSuccess: () => { setNewContent(''); setIsAdding(false); },
        });
    };

    const handleSaveEdit = () => {
        const trimmed = editContent.trim();
        if (!trimmed || !editingId) return;
        updateMutation.mutate({ noteId: editingId, content: trimmed }, { onSuccess: () => setEditingId(null) });
    };

    return (
        <RailPanel id={id} aria-labelledby="vehicle-notes-title">
            <Head>
                <SectionTitle id="vehicle-notes-title" count={!isLoading && notes.length ? notes.length : undefined}>Notatki</SectionTitle>
                {!isAdding && !readOnly && (
                    <Button size="sm" onClick={() => setIsAdding(true)}><Plus />Dodaj</Button>
                )}
            </Head>

            {isAdding && (
                <Form>
                    <Textarea
                        autoFocus
                        aria-label="Treść nowej notatki"
                        value={newContent}
                        onChange={e => setNewContent(capitalizeFirst(e.target.value))}
                        placeholder="Np. klient prosi, żeby nie polerować listew chromowanych"
                    />
                    <FormActions>
                        <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewContent(''); }}>Anuluj</Button>
                        <Button variant="tinted" size="sm" onClick={handleAdd} disabled={!newContent.trim() || createMutation.isPending}>
                            {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz notatkę'}
                        </Button>
                    </FormActions>
                </Form>
            )}

            {isLoading ? (
                <Empty>Wczytywanie notatek...</Empty>
            ) : notes.length === 0 ? (
                !isAdding && <Empty>Brak notatek o tym pojeździe.</Empty>
            ) : (
                <List>
                    {notes.map(note => (
                        <Item key={note.id}>
                            {editingId === note.id ? (
                                <Form style={{ marginTop: 0 }}>
                                    <Textarea
                                        autoFocus
                                        aria-label="Zmiana treści notatki"
                                        value={editContent}
                                        onChange={e => setEditContent(capitalizeFirst(e.target.value))}
                                    />
                                    <FormActions>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Anuluj</Button>
                                        <Button variant="tinted" size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || updateMutation.isPending}>
                                            {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                                        </Button>
                                    </FormActions>
                                </Form>
                            ) : (
                                <>
                                    <Text>{note.content}</Text>
                                    <Foot>
                                        <Meta>
                                            {note.createdByName}, {formatDateTime(note.createdAt)}
                                            {note.updatedAt !== note.createdAt && ', edytowana'}
                                        </Meta>
                                        {!readOnly && (
                                            <Actions>
                                                <IconButton label="Edytuj notatkę" variant="ghost" size="sm" onClick={() => { setEditingId(note.id); setEditContent(note.content); }}>
                                                    <Pencil />
                                                </IconButton>
                                                <IconButton label="Usuń notatkę" variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={() => setToDelete(note)}>
                                                    <Trash2 />
                                                </IconButton>
                                            </Actions>
                                        )}
                                    </Foot>
                                </>
                            )}
                        </Item>
                    ))}
                </List>
            )}

            <ConfirmationModal
                isOpen={toDelete !== null}
                title="Usunąć notatkę?"
                message="Notatka zniknie z karty pojazdu. Tej operacji nie można cofnąć."
                variant="danger"
                confirmText="Usuń notatkę"
                cancelText="Zostaw"
                onConfirm={() => { if (toDelete) deleteMutation.mutate(toDelete.id); setToDelete(null); }}
                onCancel={() => setToDelete(null)}
            />
        </RailPanel>
    );
};
