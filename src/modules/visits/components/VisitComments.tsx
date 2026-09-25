// src/modules/visits/components/VisitComments.tsx
//
// Komentarze wizyty - panel w szynie bocznej.
//
// Kolejność: najpierw rozmowa, pod nią pole na nowy komentarz - tak jak czyta się
// każdy wątek. „Dodaj komentarz" było wypełnionym sky-500 z cieniem, czyli kolejnym
// stale wypełnionym przyciskiem w oknie wizyty; teraz jest główną akcją SEKCJI
// (odcień jako tło i obwódka, CLAUDE.md §2). Rodzaj komentarza wybiera się
// przełącznikiem - tym samym, który w zleceniach zbiorczych filtruje auta.

import { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { VisitComment, CommentType } from '../types';
import { useAddComment, useUpdateComment, useDeleteComment } from '../hooks';
import { Button, Panel, SectionTitle, Segmented, StatusPill, ui } from '@/common/components/ui';

const RailPanel = styled(Panel)`
    padding: 16px 18px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const List = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
`;

const Item = styled.li<{ $deleted: boolean }>`
    display: flex;
    gap: 12px;
    min-width: 0;
    opacity: ${p => p.$deleted ? 0.7 : 1};

    @media (max-width: 640px) { gap: 10px; }
`;

const Avatar = styled.span<{ $type: CommentType }>`
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${p => p.$type === 'INTERNAL' ? '#fef3c7' : ui.brandTintHover};
    color: ${p => p.$type === 'INTERNAL' ? ui.warnInk : ui.brandInk};
    font-size: 12px;
    font-weight: 700;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
`;

const ItemHead = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;

    strong { font-size: 13.5px; font-weight: 600; color: ${ui.ink}; }
`;

const Muted = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Text = styled.p<{ $deleted?: boolean }>`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${p => p.$deleted ? ui.textMuted : ui.ink};
    text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    @media (max-width: 640px) { font-size: 14px; }
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-left: -11px;
`;

const Revisions = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 4px 0 0;
    padding: 10px 12px;
    list-style: none;
    border-radius: 10px;
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};
    font-size: 12.5px;
`;

const Diff = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
    margin-top: 4px;

    @media (max-width: 400px) { grid-template-columns: minmax(0, 1fr); }
`;

const DiffCell = styled.div<{ $old: boolean }>`
    padding: 6px 8px;
    border-radius: 8px;
    line-height: 1.4;
    overflow-wrap: anywhere;
    background: ${p => p.$old ? ui.dangerTint : ui.okTint};
    color: ${p => p.$old ? ui.dangerInk : ui.okInk};

    span { display: block; font-weight: 600; margin-bottom: 2px; }
`;

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid ${ui.lineFaint};
`;

const Textarea = styled.textarea<{ $small?: boolean }>`
    width: 100%;
    min-height: ${p => p.$small ? 66 : 64}px;
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
    &::placeholder { color: ${ui.textFaint}; }
    &:disabled { opacity: 0.6; }
`;

const FormFooter = styled.div`
    display: flex;
    justify-content: flex-end;

    @media (max-width: 640px) { > button { width: 100%; } }
`;

const Empty = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

function initials(name: string): string {
    return name.split(' ').map(part => part[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}${sameYear ? '' : `.${d.getFullYear()}`} o ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_LABEL: Record<CommentType, string> = {
    INTERNAL: 'Wewnętrzny',
    FOR_CUSTOMER: 'Dla klienta',
};

interface VisitCommentsProps {
    visitId: string;
    comments: VisitComment[];
    isLoading: boolean;
    id?: string;
}

export const VisitComments = ({ visitId, comments, isLoading, id }: VisitCommentsProps) => {
    const [newType, setNewType] = useState<CommentType>('INTERNAL');
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set());

    const { addComment, isAdding } = useAddComment(visitId);
    const { updateComment, isUpdating } = useUpdateComment(visitId);
    const { deleteComment, isDeleting } = useDeleteComment(visitId);

    const handleAdd = () => {
        if (!newContent.trim()) return;
        addComment({ type: newType, content: newContent.trim() }, { onSuccess: () => setNewContent('') });
    };

    const startEdit = (c: VisitComment) => { setEditingId(c.id); setEditingContent(c.content); };
    const cancelEdit = () => { setEditingId(null); setEditingContent(''); };
    const saveEdit = (commentId: string) => {
        if (!editingContent.trim()) return;
        updateComment(
            { commentId, content: editingContent.trim() },
            { onSuccess: () => { setEditingId(null); setEditingContent(''); } },
        );
    };

    const handleDelete = (commentId: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) deleteComment(commentId);
    };

    const toggleRevisions = (commentId: string) => {
        setExpandedRevisions(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
            return next;
        });
    };

    const visibleCount = comments.filter(c => !c.isDeleted).length;
    // Najstarszy na górze, najnowszy tuż nad polem odpowiedzi - jak w każdym wątku.
    const ordered = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return (
        <RailPanel id={id} aria-labelledby="visit-comments-title">
            <SectionTitle id="visit-comments-title" count={isLoading ? undefined : visibleCount || undefined}>
                Komentarze
            </SectionTitle>

            {isLoading ? (
                <Empty>Wczytywanie komentarzy...</Empty>
            ) : ordered.length === 0 ? (
                <Empty>Brak komentarzy. Notatka dla zespołu albo wiadomość dla klienta - dodaj ją poniżej.</Empty>
            ) : (
                <List>
                    {ordered.map(comment => (
                        <Item key={comment.id} $deleted={comment.isDeleted}>
                            <Avatar $type={comment.type} aria-hidden="true">{initials(comment.createdByName)}</Avatar>
                            <Body>
                                <ItemHead>
                                    <strong>{comment.createdByName}</strong>
                                    <StatusPill $tone={comment.type === 'INTERNAL' ? 'warn' : 'info'}>{TYPE_LABEL[comment.type]}</StatusPill>
                                    <Muted>{formatDate(comment.createdAt)}</Muted>
                                </ItemHead>

                                {comment.isDeleted && (
                                    <StatusPill $tone="danger" style={{ alignSelf: 'flex-start' }}>
                                        Usunięty przez {comment.deletedByName}{comment.deletedAt ? `, ${formatDate(comment.deletedAt)}` : ''}
                                    </StatusPill>
                                )}

                                {editingId === comment.id ? (
                                    <>
                                        <Textarea
                                            $small
                                            aria-label="Zmiana treści komentarza"
                                            value={editingContent}
                                            onChange={e => setEditingContent(e.target.value)}
                                            disabled={isUpdating}
                                        />
                                        <Actions>
                                            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isUpdating}>Anuluj</Button>
                                            <Button variant="tinted" size="sm" onClick={() => saveEdit(comment.id)} disabled={isUpdating || !editingContent.trim()}>
                                                {isUpdating ? 'Zapisywanie...' : 'Zapisz'}
                                            </Button>
                                        </Actions>
                                    </>
                                ) : (
                                    <>
                                        <Text $deleted={comment.isDeleted}>{comment.content}</Text>
                                        {comment.updatedAt && !comment.isDeleted && (
                                            <Muted>Edytowany {formatDate(comment.updatedAt)} przez {comment.updatedByName}</Muted>
                                        )}
                                        {!comment.isDeleted && (
                                            <Actions>
                                                <Button variant="ghost" size="sm" onClick={() => startEdit(comment)}>Edytuj</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(comment.id)} disabled={isDeleting}>Usuń</Button>
                                            </Actions>
                                        )}
                                    </>
                                )}

                                {comment.revisions.length > 0 && (
                                    <>
                                        <Actions>
                                            <Button variant="ghost" size="sm" onClick={() => toggleRevisions(comment.id)} aria-expanded={expandedRevisions.has(comment.id)}>
                                                {expandedRevisions.has(comment.id) ? <ChevronUp /> : <ChevronDown />}
                                                Poprzednie wersje ({comment.revisions.length})
                                            </Button>
                                        </Actions>
                                        {expandedRevisions.has(comment.id) && (
                                            <Revisions>
                                                {comment.revisions.map(rev => (
                                                    <li key={rev.id}>
                                                        <Muted>{rev.changedByName}, {formatDate(rev.changedAt)}</Muted>
                                                        <Diff>
                                                            <DiffCell $old><span>Było</span>{rev.oldContent}</DiffCell>
                                                            <DiffCell $old={false}><span>Jest</span>{rev.newContent}</DiffCell>
                                                        </Diff>
                                                    </li>
                                                ))}
                                            </Revisions>
                                        )}
                                    </>
                                )}
                            </Body>
                        </Item>
                    ))}
                </List>
            )}

            <Form>
                <Segmented
                    label="Rodzaj komentarza"
                    block
                    size="sm"
                    value={newType}
                    onChange={setNewType}
                    options={[
                        { value: 'INTERNAL', label: TYPE_LABEL.INTERNAL },
                        { value: 'FOR_CUSTOMER', label: TYPE_LABEL.FOR_CUSTOMER },
                    ]}
                />
                <Textarea
                    aria-label="Treść komentarza"
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder={newType === 'INTERNAL' ? 'Widoczny tylko dla zespołu' : 'Treść dla klienta'}
                    disabled={isAdding}
                />
                <FormFooter>
                    <Button variant="tinted" onClick={handleAdd} disabled={isAdding || !newContent.trim()}>
                        {isAdding ? 'Dodawanie...' : 'Dodaj komentarz'}
                    </Button>
                </FormFooter>
            </Form>
        </RailPanel>
    );
};
