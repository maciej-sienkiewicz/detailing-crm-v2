// src/modules/vehicles/components/VehicleNotes.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { useVehicleNotes, useCreateVehicleNote, useUpdateVehicleNote, useDeleteVehicleNote } from '../hooks/useVehicleNotes';
import { formatDateTime } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { VehicleNote } from '../types';

/* ─── Sidebar card shell ─── */

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 18px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const CardTitle = styled.h4`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};

    svg {
        width: 15px;
        height: 15px;
        color: ${st.accentBlue};
    }
`;

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusFull};
    background: transparent;
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.accentBlue}; color: white; }
    svg { width: 12px; height: 12px; }
`;

/* ─── Add-note form ─── */

const AddForm = styled.div`
    padding: 12px 18px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bgCardAlt};
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 72px;
    padding: 8px 10px;
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgCard};
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
    box-sizing: border-box;
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowBlue};
    }

    &::placeholder { color: ${st.textMuted}; }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
`;

const CancelBtn = styled.button`
    padding: 5px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontXs};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; }
`;

const SaveBtn = styled.button`
    padding: 5px 14px;
    border: none;
    border-radius: ${st.radiusFull};
    background: ${st.accentBlue};
    color: white;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowXs};

    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { background: #2563EB; box-shadow: ${st.shadowSm}; }
`;

/* ─── Note list ─── */

const NotesList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const NoteItem = styled.li`
    padding: 12px 18px;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bgCardAlt}; }
`;

const NoteContent = styled.p`
    margin: 0 0 6px;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
`;

const NoteFooter = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const NoteMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const NoteActions = styled.div`
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity ${st.transition};

    ${NoteItem}:hover & { opacity: 1; }
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${props => props.$danger ? st.accentRedDim : st.accentBlueDim};
        color: ${props => props.$danger ? st.accentRed : st.accentBlue};
    }

    svg { width: 13px; height: 13px; }
`;

/* ─── Empty state ─── */

const Empty = styled.p`
    margin: 0;
    padding: 20px 18px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    text-align: center;
`;

/* ─── Component ─── */

interface VehicleNotesProps {
    vehicleId: string;
}

export const VehicleNotes = ({ vehicleId }: VehicleNotesProps) => {
    const { notes, isLoading } = useVehicleNotes(vehicleId);
    const createMutation = useCreateVehicleNote(vehicleId);
    const updateMutation = useUpdateVehicleNote(vehicleId);
    const deleteMutation = useDeleteVehicleNote(vehicleId);

    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const handleAdd = () => {
        const trimmed = newContent.trim();
        if (!trimmed) return;
        createMutation.mutate(trimmed, {
            onSuccess: () => {
                setNewContent('');
                setIsAdding(false);
            },
        });
    };

    const handleStartEdit = (note: VehicleNote) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    const handleSaveEdit = () => {
        const trimmed = editContent.trim();
        if (!trimmed || !editingId) return;
        updateMutation.mutate({ noteId: editingId, content: trimmed }, {
            onSuccess: () => setEditingId(null),
        });
    };

    const handleDelete = (note: VehicleNote) => {
        if (confirm(`Czy na pewno chcesz usunąć tę notatkę?`)) {
            deleteMutation.mutate(note.id);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Notatki
                    {!isLoading && <Badge>{notes.length}</Badge>}
                </CardTitle>

                {!isAdding && (
                    <AddButton onClick={() => setIsAdding(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Dodaj
                    </AddButton>
                )}
            </CardHeader>

            {isAdding && (
                <AddForm>
                    <Textarea
                        autoFocus
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        placeholder="Treść notatki..."
                    />
                    <FormActions>
                        <CancelBtn onClick={() => { setIsAdding(false); setNewContent(''); }}>
                            Anuluj
                        </CancelBtn>
                        <SaveBtn
                            onClick={handleAdd}
                            disabled={!newContent.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Zapisywanie...' : 'Dodaj'}
                        </SaveBtn>
                    </FormActions>
                </AddForm>
            )}

            {isLoading ? (
                <Empty>Ładowanie...</Empty>
            ) : notes.length === 0 ? (
                <Empty>Brak notatek. Kliknij „Dodaj" aby dodać pierwszą.</Empty>
            ) : (
                <NotesList>
                    {notes.map(note => (
                        <NoteItem key={note.id}>
                            {editingId === note.id ? (
                                <>
                                    <Textarea
                                        autoFocus
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                    />
                                    <FormActions>
                                        <CancelBtn onClick={() => setEditingId(null)}>
                                            Anuluj
                                        </CancelBtn>
                                        <SaveBtn
                                            onClick={handleSaveEdit}
                                            disabled={!editContent.trim() || updateMutation.isPending}
                                        >
                                            {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                                        </SaveBtn>
                                    </FormActions>
                                </>
                            ) : (
                                <>
                                    <NoteContent>{note.content}</NoteContent>
                                    <NoteFooter>
                                        <NoteMeta>
                                            {note.createdByName} · {formatDateTime(note.createdAt)}
                                            {note.updatedAt !== note.createdAt && ' (edytowano)'}
                                        </NoteMeta>
                                        <NoteActions>
                                            <IconBtn onClick={() => handleStartEdit(note)} title="Edytuj">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </IconBtn>
                                            <IconBtn
                                                $danger
                                                onClick={() => handleDelete(note)}
                                                disabled={deleteMutation.isPending}
                                                title="Usuń"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3,6 5,6 21,6"/>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                </svg>
                                            </IconBtn>
                                        </NoteActions>
                                    </NoteFooter>
                                </>
                            )}
                        </NoteItem>
                    ))}
                </NotesList>
            )}
        </Card>
    );
};
