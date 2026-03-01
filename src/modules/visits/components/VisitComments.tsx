// src/modules/visits/components/VisitComments.tsx

import { useState } from 'react';
import styled from 'styled-components';
import type { VisitComment, CommentType } from '../types';
import { useAddComment, useUpdateComment, useDeleteComment } from '../hooks';

/* ─── Panel shell ─────────────────────────────────────────────────────────── */

const Panel = styled.div`
    background: #fff;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.xl};
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 13px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: #fafbfc;
`;

const PanelTitle = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 7px;

    svg {
        width: 15px;
        height: 15px;
        color: var(--brand-primary);
        opacity: 0.75;
    }
`;

const CountPill = styled.span`
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

/* ─── Add-comment form ────────────────────────────────────────────────────── */

const AddFormArea = styled.div`
    padding: 14px 20px 16px;
    background: #fafbfc;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const TypeToggle = styled.div`
    display: inline-flex;
    background: ${p => p.theme.colors.border};
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
    margin-bottom: 10px;
`;

const TypeOpt = styled.button<{ $active: boolean; $accent: string }>`
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: ${p => p.$active ? 600 : 400};
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? p.$accent : '#94a3b8'};
    box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

    &:hover:not([data-active="true"]) {
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const NoteArea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 10px 13px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    line-height: 1.55;
    min-height: 82px;
    resize: vertical;
    background: #fff;
    color: ${p => p.theme.colors.text};
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: ${p => p.theme.colors.textMuted};
        font-size: 12px;
    }

    &:disabled { opacity: 0.6; }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
`;

const BtnGhost = styled.button`
    padding: 6px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 7px;
    background: transparent;
    color: ${p => p.theme.colors.textSecondary};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;

    &:hover { background: ${p => p.theme.colors.surface}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const BtnPrimary = styled.button`
    padding: 6px 14px;
    border: none;
    border-radius: 7px;
    background: var(--brand-primary);
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover:not(:disabled) { opacity: 0.87; }
    &:disabled { opacity: 0.42; cursor: not-allowed; }
`;

/* ─── Comments list ───────────────────────────────────────────────────────── */

const CommentsScroll = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const CommentRow = styled.div<{ $type: CommentType; $deleted: boolean }>`
    padding: 12px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    position: relative;
    opacity: ${p => p.$deleted ? 0.62 : 1};
    background: ${p => p.$deleted ? '#fafafa' : '#fff'};
    transition: background 0.15s;

    &:last-child { border-bottom: none; }

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        border-radius: 0 2px 2px 0;
        background: ${p =>
            p.$deleted
                ? '#d1d5db'
                : p.$type === 'INTERNAL'
                ? '#f59e0b'
                : 'var(--brand-primary)'};
        opacity: ${p => p.$deleted ? 0.5 : 1};
    }
`;

const CommentHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
`;

const Initials = styled.span<{ $type: CommentType }>`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${p => p.$type === 'INTERNAL' ? '#fef3c7' : '#dbeafe'};
    color: ${p => p.$type === 'INTERNAL' ? '#b45309' : '#1d4ed8'};
`;

const AuthorName = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const TypePill = styled.span<{ $type: CommentType }>`
    padding: 1px 6px;
    border-radius: 99px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: ${p => p.$type === 'INTERNAL' ? '#fef3c7' : '#dbeafe'};
    color: ${p => p.$type === 'INTERNAL' ? '#b45309' : '#1d4ed8'};
`;

const CommentDate = styled.span`
    font-size: 10px;
    color: ${p => p.theme.colors.textMuted};
    margin-left: auto;
`;

const DeletedBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    margin-left: 34px;
    margin-bottom: 6px;
    font-size: 10px;
    color: #b91c1c;
    background: #fff1f2;
    border-radius: 5px;
`;

const CommentBody = styled.div<{ $deleted: boolean }>`
    font-size: 13px;
    line-height: 1.6;
    color: ${p => p.$deleted ? p.theme.colors.textMuted : p.theme.colors.text};
    white-space: pre-wrap;
    word-break: break-word;
    text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
    padding-left: 34px;
`;

const EditedLabel = styled.div`
    font-size: 9px;
    color: #94a3b8;
    padding-left: 34px;
    margin-top: 3px;
`;

const ActionStrip = styled.div`
    display: flex;
    align-items: center;
    gap: 1px;
    padding-left: 34px;
    margin-top: 5px;
`;

const MicroBtn = styled.button<{ $danger?: boolean }>`
    padding: 2px 7px;
    border: none;
    background: transparent;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 4px;
    color: ${p => p.$danger ? '#dc2626' : p.theme.colors.textMuted};
    transition: all 0.12s;

    &:hover {
        background: ${p => p.$danger ? '#fee2e2' : '#f0f4ff'};
        color: ${p => p.$danger ? '#b91c1c' : 'var(--brand-primary)'};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const InlineEditArea = styled.textarea`
    width: calc(100% - 34px);
    margin-left: 34px;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.5;
    min-height: 62px;
    resize: vertical;
    transition: border-color 0.15s;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

/* ─── Revision history ────────────────────────────────────────────────────── */

const RevToggleBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    padding-left: 34px;
    margin-top: 6px;
    border: none;
    background: transparent;
    font-size: 10px;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: color 0.15s;

    &:hover { color: var(--brand-primary); }
`;

const RevBlock = styled.div`
    margin-top: 6px;
    margin-left: 34px;
    padding: 8px 10px;
    background: #fafbfc;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const RevEntry = styled.div`
    font-size: 10px;
`;

const RevMeta = styled.div`
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 4px;
`;

const RevDiff = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
`;

const DiffBox = styled.div<{ $old: boolean }>`
    padding: 5px 8px;
    border-radius: 4px;
    font-size: 10px;
    line-height: 1.4;
    background: ${p => p.$old ? '#fee2e2' : '#dcfce7'};
    color: ${p => p.$old ? '#991b1b' : '#166534'};
`;

const DiffBoxLabel = styled.div`
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
    opacity: 0.65;
`;

/* ─── Empty / loading ─────────────────────────────────────────────────────── */

const EmptyMsg = styled.div`
    padding: 28px 20px;
    text-align: center;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(part => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface VisitCommentsProps {
    visitId: string;
    comments: VisitComment[];
    isLoading: boolean;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export const VisitComments = ({ visitId, comments, isLoading }: VisitCommentsProps) => {
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
        addComment(
            { type: newType, content: newContent.trim() },
            { onSuccess: () => setNewContent('') }
        );
    };

    const startEdit = (c: VisitComment) => {
        setEditingId(c.id);
        setEditingContent(c.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingContent('');
    };

    const saveEdit = (id: string) => {
        if (!editingContent.trim()) return;
        updateComment(
            { commentId: id, content: editingContent.trim() },
            { onSuccess: () => { setEditingId(null); setEditingContent(''); } }
        );
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
            deleteComment(id);
        }
    };

    const toggleRevisions = (id: string) => {
        setExpandedRevisions(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const visibleCount = comments.filter(c => !c.isDeleted).length;
    const sortedComments = [...comments].reverse();

    return (
        <Panel>
            {/* ── Header ── */}
            <PanelHeader>
                <PanelTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Komentarze
                </PanelTitle>
                <CountPill>{isLoading ? '—' : visibleCount}</CountPill>
            </PanelHeader>

            {/* ── Add form ── */}
            <AddFormArea>
                <TypeToggle>
                    <TypeOpt
                        $active={newType === 'INTERNAL'}
                        $accent="#b45309"
                        onClick={() => setNewType('INTERNAL')}
                    >
                        Wewnętrzna
                    </TypeOpt>
                    <TypeOpt
                        $active={newType === 'FOR_CUSTOMER'}
                        $accent="#1d4ed8"
                        onClick={() => setNewType('FOR_CUSTOMER')}
                    >
                        Dla klienta
                    </TypeOpt>
                </TypeToggle>

                <NoteArea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder={
                        newType === 'INTERNAL'
                            ? 'Notatka widoczna tylko dla personelu…'
                            : 'Treść wiadomości dla klienta…'
                    }
                    disabled={isAdding}
                />

                <FormActions>
                    <BtnGhost
                        onClick={() => setNewContent('')}
                        disabled={isAdding || !newContent}
                    >
                        Wyczyść
                    </BtnGhost>
                    <BtnPrimary
                        onClick={handleAdd}
                        disabled={isAdding || !newContent.trim()}
                    >
                        {isAdding ? 'Dodawanie…' : 'Dodaj'}
                    </BtnPrimary>
                </FormActions>
            </AddFormArea>

            {/* ── List ── */}
            <CommentsScroll>
                {isLoading ? (
                    <EmptyMsg>Ładowanie komentarzy…</EmptyMsg>
                ) : sortedComments.length === 0 ? (
                    <EmptyMsg>Brak komentarzy. Dodaj pierwszy powyżej.</EmptyMsg>
                ) : (
                    sortedComments.map(comment => (
                        <CommentRow
                            key={comment.id}
                            $type={comment.type}
                            $deleted={comment.isDeleted}
                        >
                            {/* Author row */}
                            <CommentHead>
                                <Initials $type={comment.type}>
                                    {getInitials(comment.createdByName)}
                                </Initials>
                                <AuthorName>{comment.createdByName}</AuthorName>
                                <TypePill $type={comment.type}>
                                    {comment.type === 'INTERNAL' ? 'Wewnętrzna' : 'Klient'}
                                </TypePill>
                                <CommentDate>{formatDate(comment.createdAt)}</CommentDate>
                            </CommentHead>

                            {/* Deleted notice */}
                            {comment.isDeleted && (
                                <DeletedBanner>
                                    Usunięto przez {comment.deletedByName} · {formatDate(comment.deletedAt!)}
                                </DeletedBanner>
                            )}

                            {/* Inline edit or body */}
                            {editingId === comment.id ? (
                                <>
                                    <InlineEditArea
                                        value={editingContent}
                                        onChange={e => setEditingContent(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                    <ActionStrip>
                                        <MicroBtn onClick={cancelEdit} disabled={isUpdating}>
                                            Anuluj
                                        </MicroBtn>
                                        <BtnPrimary
                                            onClick={() => saveEdit(comment.id)}
                                            disabled={isUpdating || !editingContent.trim()}
                                            style={{ padding: '3px 10px', fontSize: 11 }}
                                        >
                                            {isUpdating ? 'Zapisywanie…' : 'Zapisz'}
                                        </BtnPrimary>
                                    </ActionStrip>
                                </>
                            ) : (
                                <>
                                    <CommentBody $deleted={comment.isDeleted}>
                                        {comment.content}
                                    </CommentBody>

                                    {comment.updatedAt && !comment.isDeleted && (
                                        <EditedLabel>
                                            Edytowano {formatDate(comment.updatedAt)} · {comment.updatedByName}
                                        </EditedLabel>
                                    )}

                                    {!comment.isDeleted && (
                                        <ActionStrip>
                                            <MicroBtn onClick={() => startEdit(comment)}>
                                                Edytuj
                                            </MicroBtn>
                                            <MicroBtn
                                                $danger
                                                onClick={() => handleDelete(comment.id)}
                                                disabled={isDeleting}
                                            >
                                                Usuń
                                            </MicroBtn>
                                        </ActionStrip>
                                    )}
                                </>
                            )}

                            {/* Revision history */}
                            {comment.revisions.length > 0 && (
                                <>
                                    <RevToggleBtn onClick={() => toggleRevisions(comment.id)}>
                                        <svg
                                            width="8"
                                            height="8"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            {expandedRevisions.has(comment.id)
                                                ? <polyline points="18 15 12 9 6 15" />
                                                : <polyline points="6 9 12 15 18 9" />
                                            }
                                        </svg>
                                        Historia zmian ({comment.revisions.length})
                                    </RevToggleBtn>

                                    {expandedRevisions.has(comment.id) && (
                                        <RevBlock>
                                            {comment.revisions.map(rev => (
                                                <RevEntry key={rev.id}>
                                                    <RevMeta>
                                                        {rev.changedByName} · {formatDate(rev.changedAt)}
                                                    </RevMeta>
                                                    <RevDiff>
                                                        <DiffBox $old>
                                                            <DiffBoxLabel>Poprzednia</DiffBoxLabel>
                                                            {rev.oldContent}
                                                        </DiffBox>
                                                        <DiffBox $old={false}>
                                                            <DiffBoxLabel>Nowa</DiffBoxLabel>
                                                            {rev.newContent}
                                                        </DiffBox>
                                                    </RevDiff>
                                                </RevEntry>
                                            ))}
                                        </RevBlock>
                                    )}
                                </>
                            )}
                        </CommentRow>
                    ))
                )}
            </CommentsScroll>
        </Panel>
    );
};
