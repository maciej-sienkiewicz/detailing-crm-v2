// src/modules/visits/components/VisitComments.tsx

import { useState } from 'react';
import styled from 'styled-components';
import type { VisitComment, CommentType } from '../types';
import { useAddComment, useUpdateComment, useDeleteComment } from '../hooks';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/* ─── Container ───────────────────────────────────────────────────────────── */

const Panel = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
    display: flex;
    flex-direction: column;
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
`;

const HeaderLeft = styled.div``;

const PanelTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const PanelSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const CountBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 700;
`;

/* ─── Add-comment form ────────────────────────────────────────────────────── */

const FormArea = styled.div`
    padding: 16px 24px 20px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const TypeRow = styled.div`
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
`;

const TypeBtn = styled.button<{ $active: boolean; $kind: CommentType }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p =>
        p.$active
            ? (p.$kind === 'INTERNAL' ? `${st.accentAmber}66` : `${st.accentBlue}66`)
            : st.border};
    background: ${p =>
        p.$active
            ? (p.$kind === 'INTERNAL' ? st.accentAmberDim : st.accentBlueDim)
            : st.bgCard};
    color: ${p =>
        p.$active
            ? (p.$kind === 'INTERNAL' ? st.accentAmber : st.accentBlue)
            : st.textSecondary};

    &:hover {
        border-color: ${p => p.$kind === 'INTERNAL' ? `${st.accentAmber}66` : `${st.accentBlue}66`};
        background: ${p => p.$kind === 'INTERNAL' ? st.accentAmberDim : st.accentBlueDim};
        color: ${p => p.$kind === 'INTERNAL' ? st.accentAmber : st.accentBlue};
    }
`;

const NoteArea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-family: inherit;
    line-height: 1.55;
    min-height: 80px;
    resize: vertical;
    background: ${st.bgCard};
    color: ${st.text};
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus {
        outline: none;
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }

    &::placeholder { color: ${st.textMuted}; }
    &:disabled { opacity: 0.6; }
`;

const FormFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
`;

const GhostBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const PrimaryBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: none;
    background: ${st.accentBlue};
    color: white;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowXs};

    &:hover:not(:disabled) {
        background: #2563EB;
        box-shadow: ${st.shadowSm};
        transform: translateY(-1px);
    }

    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

/* ─── Comment list ────────────────────────────────────────────────────────── */

const CommentsList = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const CommentItem = styled.div<{ $type: CommentType; $deleted: boolean }>`
    padding: 14px 24px;
    border-bottom: 1px solid ${st.border};
    position: relative;
    background: ${p => p.$deleted ? st.bg : st.bgCard};
    opacity: ${p => p.$deleted ? 0.72 : 1};
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: ${p =>
            p.$deleted
                ? st.border
                : p.$type === 'INTERNAL'
                ? st.accentAmber
                : st.accentBlue};
    }
`;

const CommentHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const Avatar = styled.div<{ $type: CommentType }>`
    width: 28px;
    height: 28px;
    border-radius: ${st.radiusFull};
    background: ${p => p.$type === 'INTERNAL' ? st.accentAmberDim : st.accentBlueDim};
    color: ${p => p.$type === 'INTERNAL' ? st.accentAmber : st.accentBlue};
    font-size: 10px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0.02em;
`;

const AuthorName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const TypeBadge = styled.span<{ $type: CommentType }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    background: ${p => p.$type === 'INTERNAL' ? st.accentAmberDim : st.accentBlueDim};
    color: ${p => p.$type === 'INTERNAL' ? st.accentAmber : st.accentBlue};
`;

const DateText = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-left: auto;
`;

const CommentBody = styled.div<{ $deleted: boolean }>`
    font-size: ${st.fontSm};
    line-height: 1.6;
    color: ${p => p.$deleted ? st.textMuted : st.text};
    white-space: pre-wrap;
    word-break: break-word;
    text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
    padding-left: 36px;
`;

const DeletedNote = styled.div`
    display: inline-flex;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    background: ${st.accentRedDim};
    border-radius: ${st.radiusSm};
    padding: 4px 10px;
    margin-left: 36px;
    margin-bottom: 6px;
`;

const EditedHint = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    padding-left: 36px;
    margin-top: 3px;
`;

const ActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    padding-left: 36px;
    margin-top: 6px;
`;

const InlineBtn = styled.button<{ $danger?: boolean }>`
    padding: 3px 10px;
    border: none;
    background: transparent;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    border-radius: ${st.radiusFull};
    color: ${p => p.$danger ? st.accentRed : st.textMuted};
    transition: all ${st.transition};

    &:hover {
        background: ${p => p.$danger ? st.accentRedDim : st.bg};
        color: ${p => p.$danger ? st.accentRed : st.textSecondary};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const InlineEditArea = styled.textarea`
    width: calc(100% - 36px);
    margin-left: 36px;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-family: inherit;
    line-height: 1.5;
    min-height: 66px;
    resize: vertical;
    transition: border-color ${st.transition};

    &:focus {
        outline: none;
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

/* ─── Revision history ────────────────────────────────────────────────────── */

const RevToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    padding-left: 36px;
    margin-top: 6px;
    border: none;
    background: transparent;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    cursor: pointer;
    transition: color ${st.transition};

    &:hover { color: ${st.accentBlue}; }
`;

const RevBlock = styled.div`
    margin-top: 6px;
    margin-left: 36px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
`;

const RevEntry = styled.div`
    padding: 8px 12px;
    font-size: ${st.fontXs};
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }
`;

const RevMeta = styled.div`
    color: ${st.textMuted};
    margin-bottom: 5px;
`;

const RevDiff = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
`;

const DiffCell = styled.div<{ $old: boolean }>`
    padding: 5px 8px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    line-height: 1.4;
    background: ${p => p.$old ? st.accentRedDim : st.accentGreenDim};
    color: ${p => p.$old ? st.accentRed : st.accentGreen};
`;

const DiffLabel = styled.div`
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
    margin-bottom: 2px;
`;

/* ─── Empty / loading ─────────────────────────────────────────────────────── */

const EmptyState = styled.div`
    padding: 32px 24px;
    text-align: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
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

function pluralComments(n: number): string {
    if (n === 1) return '1 komentarz';
    if (n >= 2 && n <= 4) return `${n} komentarze`;
    return `${n} komentarzy`;
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

    const startEdit = (c: VisitComment) => { setEditingId(c.id); setEditingContent(c.content); };
    const cancelEdit = () => { setEditingId(null); setEditingContent(''); };

    const saveEdit = (id: string) => {
        if (!editingContent.trim()) return;
        updateComment(
            { commentId: id, content: editingContent.trim() },
            { onSuccess: () => { setEditingId(null); setEditingContent(''); } }
        );
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) deleteComment(id);
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
                <HeaderLeft>
                    <PanelTitle>Komentarze</PanelTitle>
                    <PanelSubtitle>
                        {isLoading ? 'Ładowanie…' : pluralComments(visibleCount)}
                    </PanelSubtitle>
                </HeaderLeft>
                {!isLoading && <CountBadge>{visibleCount}</CountBadge>}
            </PanelHeader>

            {/* ── Add form ── */}
            <FormArea>
                <TypeRow>
                    <TypeBtn
                        $active={newType === 'INTERNAL'}
                        $kind="INTERNAL"
                        onClick={() => setNewType('INTERNAL')}
                    >
                        Wewnętrzna
                    </TypeBtn>
                    <TypeBtn
                        $active={newType === 'FOR_CUSTOMER'}
                        $kind="FOR_CUSTOMER"
                        onClick={() => setNewType('FOR_CUSTOMER')}
                    >
                        Dla klienta
                    </TypeBtn>
                </TypeRow>

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

                <FormFooter>
                    <GhostBtn
                        onClick={() => setNewContent('')}
                        disabled={isAdding || !newContent}
                    >
                        Wyczyść
                    </GhostBtn>
                    <PrimaryBtn
                        onClick={handleAdd}
                        disabled={isAdding || !newContent.trim()}
                    >
                        {isAdding ? 'Dodawanie…' : 'Dodaj komentarz'}
                    </PrimaryBtn>
                </FormFooter>
            </FormArea>

            {/* ── List ── */}
            <CommentsList>
                {isLoading ? (
                    <EmptyState>Ładowanie komentarzy…</EmptyState>
                ) : sortedComments.length === 0 ? (
                    <EmptyState>Brak komentarzy. Dodaj pierwszy powyżej.</EmptyState>
                ) : (
                    sortedComments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            $type={comment.type}
                            $deleted={comment.isDeleted}
                        >
                            <CommentHead>
                                <Avatar $type={comment.type}>
                                    {getInitials(comment.createdByName)}
                                </Avatar>
                                <AuthorName>{comment.createdByName}</AuthorName>
                                <TypeBadge $type={comment.type}>
                                    {comment.type === 'INTERNAL' ? 'Wewnętrzna' : 'Dla klienta'}
                                </TypeBadge>
                                <DateText>{formatDate(comment.createdAt)}</DateText>
                            </CommentHead>

                            {comment.isDeleted && (
                                <DeletedNote>
                                    Usunięto przez {comment.deletedByName} · {formatDate(comment.deletedAt!)}
                                </DeletedNote>
                            )}

                            {editingId === comment.id ? (
                                <>
                                    <InlineEditArea
                                        value={editingContent}
                                        onChange={e => setEditingContent(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                    <ActionRow>
                                        <InlineBtn onClick={cancelEdit} disabled={isUpdating}>
                                            Anuluj
                                        </InlineBtn>
                                        <PrimaryBtn
                                            onClick={() => saveEdit(comment.id)}
                                            disabled={isUpdating || !editingContent.trim()}
                                            style={{ padding: '4px 12px', fontSize: st.fontXs }}
                                        >
                                            {isUpdating ? 'Zapisywanie…' : 'Zapisz'}
                                        </PrimaryBtn>
                                    </ActionRow>
                                </>
                            ) : (
                                <>
                                    <CommentBody $deleted={comment.isDeleted}>
                                        {comment.content}
                                    </CommentBody>

                                    {comment.updatedAt && !comment.isDeleted && (
                                        <EditedHint>
                                            Edytowano {formatDate(comment.updatedAt)} · {comment.updatedByName}
                                        </EditedHint>
                                    )}

                                    {!comment.isDeleted && (
                                        <ActionRow>
                                            <InlineBtn onClick={() => startEdit(comment)}>
                                                Edytuj
                                            </InlineBtn>
                                            <InlineBtn
                                                $danger
                                                onClick={() => handleDelete(comment.id)}
                                                disabled={isDeleting}
                                            >
                                                Usuń
                                            </InlineBtn>
                                        </ActionRow>
                                    )}
                                </>
                            )}

                            {comment.revisions.length > 0 && (
                                <>
                                    <RevToggle onClick={() => toggleRevisions(comment.id)}>
                                        <svg
                                            width="8" height="8"
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
                                    </RevToggle>

                                    {expandedRevisions.has(comment.id) && (
                                        <RevBlock>
                                            {comment.revisions.map(rev => (
                                                <RevEntry key={rev.id}>
                                                    <RevMeta>
                                                        {rev.changedByName} · {formatDate(rev.changedAt)}
                                                    </RevMeta>
                                                    <RevDiff>
                                                        <DiffCell $old>
                                                            <DiffLabel>Poprzednia</DiffLabel>
                                                            {rev.oldContent}
                                                        </DiffCell>
                                                        <DiffCell $old={false}>
                                                            <DiffLabel>Nowa</DiffLabel>
                                                            {rev.newContent}
                                                        </DiffCell>
                                                    </RevDiff>
                                                </RevEntry>
                                            ))}
                                        </RevBlock>
                                    )}
                                </>
                            )}
                        </CommentItem>
                    ))
                )}
            </CommentsList>
        </Panel>
    );
};
