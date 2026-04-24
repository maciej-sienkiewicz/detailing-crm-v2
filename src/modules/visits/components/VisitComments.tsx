// src/modules/visits/components/VisitComments.tsx

import { useState } from 'react';
import styled from 'styled-components';
import type { VisitComment, CommentType } from '../types';
import { useAddComment, useUpdateComment, useDeleteComment } from '../hooks';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';
const BRAND_RING = '0 0 0 3px rgba(14, 165, 233, 0.14)';

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
    padding: 13px 16px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
`;

const HeaderLeft = styled.div``;

const PanelTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${st.text};
`;

const PanelSubtitle = styled.p`
    margin: 2px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CountBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${BRAND_DIM};
    color: ${BRAND_DARK};
    font-size: ${st.fontXs};
    font-weight: 700;
    border: 1px solid rgba(14, 165, 233, 0.2);
`;

/* ─── Add-comment form ────────────────────────────────────────────────────── */

const FormArea = styled.div`
    padding: 14px 16px 16px;
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
            ? (p.$kind === 'INTERNAL' ? `${st.accentAmber}66` : 'rgba(14,165,233,0.4)')
            : st.border};
    background: ${p =>
        p.$active
            ? (p.$kind === 'INTERNAL' ? st.accentAmberDim : BRAND_DIM)
            : st.bgCard};
    color: ${p =>
        p.$active
            ? (p.$kind === 'INTERNAL' ? st.accentAmber : BRAND_DARK)
            : st.textSecondary};

    &:hover {
        border-color: ${p => p.$kind === 'INTERNAL' ? `${st.accentAmber}66` : 'rgba(14,165,233,0.4)'};
        background: ${p => p.$kind === 'INTERNAL' ? st.accentAmberDim : BRAND_DIM};
        color: ${p => p.$kind === 'INTERNAL' ? st.accentAmber : BRAND_DARK};
    }
`;

const NoteArea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px;
    border: 1.5px solid ${st.border};
    border-radius: 12px;
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
        border-color: ${BRAND};
        box-shadow: ${BRAND_RING};
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
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    border: none;
    background: ${BRAND};
    color: white;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover:not(:disabled) {
        background: ${BRAND_DARK};
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
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
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 12px;
    padding: 14px 16px 14px 20px;
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
        border-radius: 0 2px 2px 0;
        background: ${p =>
            p.$deleted
                ? st.border
                : p.$type === 'INTERNAL'
                ? st.accentAmber
                : BRAND};
    }
`;

const NoteAvatar = styled.div<{ $type: CommentType }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${p =>
        p.$type === 'INTERNAL'
            ? `linear-gradient(135deg, ${st.accentAmber} 0%, #d97706 100%)`
            : `linear-gradient(135deg, ${BRAND} 0%, #6366f1 100%)`};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: -0.3px;
    margin-top: 1px;
`;

const NoteContent = styled.div`
    min-width: 0;
`;

const NoteHead = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 12px;
    color: ${st.textMuted};
    margin-bottom: 4px;
`;

const NoteAuthor = styled.span`
    font-size: 12px;
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
    background: ${p => p.$type === 'INTERNAL' ? st.accentAmberDim : BRAND_DIM};
    color: ${p => p.$type === 'INTERNAL' ? st.accentAmber : BRAND_DARK};
`;

const DateText = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-left: auto;
`;

const NoteBody = styled.div<{ $deleted: boolean }>`
    font-size: 13px;
    line-height: 1.55;
    color: ${p => p.$deleted ? st.textMuted : '#334155'};
    white-space: pre-wrap;
    word-break: break-word;
    text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
`;

const DeletedNote = styled.div`
    display: inline-flex;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    background: ${st.accentRedDim};
    border-radius: ${st.radiusSm};
    padding: 4px 10px;
    margin-bottom: 6px;
`;

const EditedHint = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 3px;
`;

const ActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
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
        background: ${p => p.$danger ? st.accentRedDim : BRAND_DIM};
        color: ${p => p.$danger ? st.accentRed : BRAND_DARK};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const InlineEditArea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1.5px solid ${st.border};
    border-radius: 12px;
    font-size: ${st.fontSm};
    font-family: inherit;
    line-height: 1.5;
    min-height: 66px;
    resize: vertical;
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus {
        outline: none;
        border-color: ${BRAND};
        box-shadow: ${BRAND_RING};
    }
`;

/* ─── Revision history ────────────────────────────────────────────────────── */

const RevToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    margin-top: 6px;
    border: none;
    background: transparent;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    cursor: pointer;
    transition: color ${st.transition};

    &:hover { color: ${BRAND}; }
`;

const RevBlock = styled.div`
    margin-top: 6px;
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
    padding: 24px 16px;
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
                            {/* Left column: avatar */}
                            <NoteAvatar $type={comment.type}>
                                {getInitials(comment.createdByName)}
                            </NoteAvatar>

                            {/* Right column: all content */}
                            <NoteContent>
                                <NoteHead>
                                    <NoteAuthor>{comment.createdByName}</NoteAuthor>
                                    <TypeBadge $type={comment.type}>
                                        {comment.type === 'INTERNAL' ? 'Wewnętrzna' : 'Dla klienta'}
                                    </TypeBadge>
                                    <DateText>{formatDate(comment.createdAt)}</DateText>
                                </NoteHead>

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
                                        <NoteBody $deleted={comment.isDeleted}>
                                            {comment.content}
                                        </NoteBody>

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
                            </NoteContent>
                        </CommentItem>
                    ))
                )}
            </CommentsList>
        </Panel>
    );
};
