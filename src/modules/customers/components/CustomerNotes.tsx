// src/modules/customers/components/CustomerNotes.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { useCustomerNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useCustomerNotes';
import { formatDateTime } from '@/common/utils';
import type { CustomerNote } from '../types';

/* ─── Sidebar card shell (matches CustomerDetailView SidebarCard) ─── */

const Card = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CardTitle = styled.h4`
    margin: 0;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};

    svg {
        width: 16px;
        height: 16px;
        color: var(--brand-primary);
    }
`;

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: ${props => props.theme.colors.surfaceAlt};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border: 1.5px solid var(--brand-primary);
    border-radius: ${props => props.theme.radii.md};
    background: transparent;
    color: var(--brand-primary);
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: var(--brand-primary);
        color: white;
    }

    svg {
        width: 13px;
        height: 13px;
    }
`;

/* ─── Add-note form ─── */

const AddForm = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surfaceAlt};
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 72px;
    padding: 8px 10px;
    border: 1.5px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    background: white;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 15%, transparent);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.sm};
`;

const CancelBtn = styled.button`
    padding: 5px 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;

    &:hover { background: ${props => props.theme.colors.surfaceAlt}; }
`;

const SaveBtn = styled.button`
    padding: 5px 12px;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: var(--brand-primary);
    color: white;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { opacity: 0.9; }
`;

/* ─── Note list ─── */

const NotesList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const NoteItem = styled.li`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const NoteContent = styled.p`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
`;

const NoteFooter = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const NoteMeta = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const NoteActions = styled.div`
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;

    ${NoteItem}:hover & {
        opacity: 1;
    }
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        background: ${props => props.$danger ? '#fee2e2' : 'var(--brand-primary)'};
        color: ${props => props.$danger ? '#dc2626' : 'white'};
    }

    svg { width: 13px; height: 13px; }
`;

/* ─── Empty state ─── */

const Empty = styled.p`
    margin: 0;
    padding: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    text-align: center;
`;

/* ─── Component ─── */

interface CustomerNotesProps {
    customerId: string;
}

export const CustomerNotes = ({ customerId }: CustomerNotesProps) => {
    const { notes, isLoading } = useCustomerNotes(customerId);
    const createMutation = useCreateNote(customerId);
    const updateMutation = useUpdateNote(customerId);
    const deleteMutation = useDeleteNote(customerId);

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

    const handleStartEdit = (note: CustomerNote) => {
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

    const handleDelete = (note: CustomerNote) => {
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
