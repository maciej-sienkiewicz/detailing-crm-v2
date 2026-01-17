// src/modules/visits/components/VisitComments.tsx

import { useState } from 'react';
import styled from 'styled-components';
import type { VisitComment, CommentType } from '../types';
import { useAddComment, useUpdateComment, useDeleteComment } from '../hooks';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const AddCommentForm = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const FormHeader = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const TypeSelector = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const TypeButton = styled.button<{ $isActive: boolean }>`
    flex: 1;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        background: ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.surfaceHover};
    }
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 100px;
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    justify-content: flex-end;
    margin-top: ${props => props.theme.spacing.md};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => {
        switch (props.$variant) {
            case 'primary':
                return `
                    background: var(--brand-primary);
                    color: white;
                    &:hover { opacity: 0.9; }
                `;
            case 'danger':
                return `
                    background: ${props.theme.colors.error};
                    color: white;
                    &:hover { opacity: 0.9; }
                `;
            default:
                return `
                    background: ${props.theme.colors.surface};
                    color: ${props.theme.colors.text};
                    border: 1px solid ${props.theme.colors.border};
                    &:hover { background: ${props.theme.colors.surfaceHover}; }
                `;
        }
    }}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CommentsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const CommentCard = styled.div<{ $isDeleted: boolean }>`
    background: ${props => props.$isDeleted ? '#f3f4f6' : 'white'};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    opacity: ${props => props.$isDeleted ? 0.7 : 1};
    transition: all 0.2s ease;
`;

const CommentHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const CommentMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const CommentAuthor = styled.span`
    font-weight: 600;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const CommentDate = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const CommentBadge = styled.span<{ $type: CommentType }>`
    display: inline-flex;
    padding: 4px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    background: ${props => props.$type === 'INTERNAL' ? '#fef3c7' : '#dbeafe'};
    color: ${props => props.$type === 'INTERNAL' ? '#92400e' : '#1e40af'};
`;

const CommentContent = styled.div<{ $isDeleted: boolean }>`
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.$isDeleted ? props.theme.colors.textMuted : props.theme.colors.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    text-decoration: ${props => props.$isDeleted ? 'line-through' : 'none'};
`;

const DeletedNotice = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm};
    background: #fee2e2;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: #991b1b;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const CommentActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border: none;
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
        color: var(--brand-primary);
    }

    &.danger:hover {
        color: ${props => props.theme.colors.error};
    }
`;

const EditingTextArea = styled(TextArea)`
    min-height: 80px;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const RevisionsList = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const RevisionHeader = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    margin-bottom: ${props => props.theme.spacing.sm};
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const RevisionItem = styled.div`
    padding: ${props => props.theme.spacing.sm};
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.sm};
    margin-bottom: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
`;

const RevisionMeta = styled.div`
    color: ${props => props.theme.colors.textMuted};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const RevisionContent = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.xs};
`;

const RevisionColumn = styled.div`
    padding: ${props => props.theme.spacing.xs};
    background: white;
    border-radius: ${props => props.theme.radii.sm};
`;

const RevisionLabel = styled.div`
    font-weight: 600;
    margin-bottom: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
`;

interface VisitCommentsProps {
    visitId: string;
    comments: VisitComment[];
    isLoading: boolean;
}

export const VisitComments = ({ visitId, comments, isLoading }: VisitCommentsProps) => {
    const [newCommentType, setNewCommentType] = useState<CommentType>('INTERNAL');
    const [newCommentContent, setNewCommentContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set());

    const { addComment, isAdding } = useAddComment(visitId);
    const { updateComment, isUpdating } = useUpdateComment(visitId);
    const { deleteComment, isDeleting } = useDeleteComment(visitId);

    const handleAddComment = () => {
        if (!newCommentContent.trim()) return;

        addComment(
            {
                type: newCommentType,
                content: newCommentContent.trim(),
            },
            {
                onSuccess: () => {
                    setNewCommentContent('');
                },
            }
        );
    };

    const startEditing = (comment: VisitComment) => {
        setEditingCommentId(comment.id);
        setEditingContent(comment.content);
    };

    const cancelEditing = () => {
        setEditingCommentId(null);
        setEditingContent('');
    };

    const handleUpdateComment = (commentId: string) => {
        if (!editingContent.trim()) return;

        updateComment(
            {
                commentId,
                content: editingContent.trim(),
            },
            {
                onSuccess: () => {
                    setEditingCommentId(null);
                    setEditingContent('');
                },
            }
        );
    };

    const handleDeleteComment = (commentId: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
            deleteComment(commentId);
        }
    };

    const toggleRevisions = (commentId: string) => {
        setExpandedRevisions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
            }
            return newSet;
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <Container>
                <EmptyState>Ładowanie komentarzy...</EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            <AddCommentForm>
                <FormHeader>Dodaj komentarz</FormHeader>

                <TypeSelector>
                    <TypeButton
                        $isActive={newCommentType === 'INTERNAL'}
                        onClick={() => setNewCommentType('INTERNAL')}
                    >
                        🔒 Notatka wewnętrzna
                    </TypeButton>
                    <TypeButton
                        $isActive={newCommentType === 'FOR_CUSTOMER'}
                        onClick={() => setNewCommentType('FOR_CUSTOMER')}
                    >
                        👤 Dla klienta
                    </TypeButton>
                </TypeSelector>

                <TextArea
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    placeholder="Wpisz treść komentarza..."
                    disabled={isAdding}
                />

                <ButtonGroup>
                    <Button
                        $variant="secondary"
                        onClick={() => setNewCommentContent('')}
                        disabled={isAdding || !newCommentContent}
                    >
                        Wyczyść
                    </Button>
                    <Button
                        $variant="primary"
                        onClick={handleAddComment}
                        disabled={isAdding || !newCommentContent.trim()}
                    >
                        {isAdding ? 'Dodawanie...' : 'Dodaj komentarz'}
                    </Button>
                </ButtonGroup>
            </AddCommentForm>

            {comments.length === 0 ? (
                <EmptyState>
                    Brak komentarzy. Dodaj pierwszy komentarz powyżej.
                </EmptyState>
            ) : (
                <CommentsList>
                    {comments.map((comment) => (
                        <CommentCard key={comment.id} $isDeleted={comment.isDeleted}>
                            {comment.isDeleted && (
                                <DeletedNotice>
                                    🗑️ Komentarz został usunięty przez {comment.deletedByName} dnia{' '}
                                    {formatDate(comment.deletedAt!)}
                                </DeletedNotice>
                            )}

                            <CommentHeader>
                                <CommentMeta>
                                    <CommentAuthor>{comment.createdByName}</CommentAuthor>
                                    <CommentDate>{formatDate(comment.createdAt)}</CommentDate>
                                    {comment.updatedAt && (
                                        <CommentDate>
                                            Edytowano: {formatDate(comment.updatedAt)} przez{' '}
                                            {comment.updatedByName}
                                        </CommentDate>
                                    )}
                                </CommentMeta>
                                <CommentBadge $type={comment.type}>
                                    {comment.type === 'INTERNAL' ? '🔒 Wewnętrzna' : '👤 Dla klienta'}
                                </CommentBadge>
                            </CommentHeader>

                            {editingCommentId === comment.id ? (
                                <>
                                    <EditingTextArea
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                    <ButtonGroup>
                                        <Button
                                            $variant="secondary"
                                            onClick={cancelEditing}
                                            disabled={isUpdating}
                                        >
                                            Anuluj
                                        </Button>
                                        <Button
                                            $variant="primary"
                                            onClick={() => handleUpdateComment(comment.id)}
                                            disabled={isUpdating || !editingContent.trim()}
                                        >
                                            {isUpdating ? 'Zapisywanie...' : 'Zapisz'}
                                        </Button>
                                    </ButtonGroup>
                                </>
                            ) : (
                                <>
                                    <CommentContent $isDeleted={comment.isDeleted}>
                                        {comment.content}
                                    </CommentContent>

                                    {!comment.isDeleted && (
                                        <CommentActions>
                                            <ActionButton onClick={() => startEditing(comment)}>
                                                ✏️ Edytuj
                                            </ActionButton>
                                            <ActionButton
                                                className="danger"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                disabled={isDeleting}
                                            >
                                                🗑️ Usuń
                                            </ActionButton>
                                        </CommentActions>
                                    )}
                                </>
                            )}

                            {comment.revisions.length > 0 && (
                                <RevisionsList>
                                    <RevisionHeader onClick={() => toggleRevisions(comment.id)}>
                                        {expandedRevisions.has(comment.id) ? '▼' : '▶'} Historia zmian (
                                        {comment.revisions.length})
                                    </RevisionHeader>
                                    {expandedRevisions.has(comment.id) && (
                                        <div>
                                            {comment.revisions.map((revision) => (
                                                <RevisionItem key={revision.id}>
                                                    <RevisionMeta>
                                                        Zmieniono przez {revision.changedByName} dnia{' '}
                                                        {formatDate(revision.changedAt)}
                                                    </RevisionMeta>
                                                    <RevisionContent>
                                                        <RevisionColumn>
                                                            <RevisionLabel>Poprzednia treść:</RevisionLabel>
                                                            {revision.oldContent}
                                                        </RevisionColumn>
                                                        <RevisionColumn>
                                                            <RevisionLabel>Nowa treść:</RevisionLabel>
                                                            {revision.newContent}
                                                        </RevisionColumn>
                                                    </RevisionContent>
                                                </RevisionItem>
                                            ))}
                                        </div>
                                    )}
                                </RevisionsList>
                            )}
                        </CommentCard>
                    ))}
                </CommentsList>
            )}
        </Container>
    );
};
