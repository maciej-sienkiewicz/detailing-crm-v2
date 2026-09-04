// src/modules/comms/components/ContactNotesPopover.tsx
// Notatki o kontakcie - chmurka pod plakietką w nagłówku rozmowy.
//
// Notatka to rzecz, którą trzeba mieć przed oczami PISZĄC odpowiedź, a nie po
// przejściu do innego widoku. Dlatego popover przy nagłówku, a nie osobny ekran:
// otwiera się nad korespondencją, zamyka kliknięciem obok i nie gubi kontekstu.
//
// Notatek może być wiele - jedno pole „notatka o kliencie" zmuszałoby do dopisywania
// do cudzego zdania i kasowania cudzych ustaleń. Każda ma autora i datę, a wszystkie
// zmiany idą do dziennika: „kto to skreślił i kiedy" jest pytaniem, na które ta
// funkcja ma odpowiadać.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Check, History, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    useContactNoteHistory,
    useContactNotes,
    useCreateContactNote,
    useDeleteContactNote,
    useUpdateContactNote,
} from '../hooks/useComms';
import type { ContactNoteAction } from '../types';
import { formatDateTime } from './shared';

const Card = styled.div`
    position: fixed;
    z-index: 120;
    width: 380px;
    max-width: calc(100vw - 24px);
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .title {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }

    button {
        border: none;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: inherit;
        font-size: 12px;
        padding: 4px 6px;
        border-radius: ${p => p.theme.radii.sm};

        &:hover { background: ${p => p.theme.colors.surfaceHover}; color: ${p => p.theme.colors.text}; }
        &[aria-pressed='true'] { color: ${p => p.theme.colors.primary}; }
    }
`;

const Scroll = styled.div`
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const NoteCard = styled.article`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 10px;
    background: ${p => p.theme.colors.surface};

    .body {
        font-size: 13px;
        line-height: 1.5;
        color: ${p => p.theme.colors.text};
        white-space: pre-wrap;
        word-break: break-word;
    }
    .meta {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
    }
    .meta .spacer { flex: 1; }
    .meta button {
        border: none;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 2px;
        display: inline-flex;

        &:hover { color: ${p => p.theme.colors.text}; }
        &.danger:hover { color: ${p => p.theme.colors.error}; }
    }
`;

const Editor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;

    textarea {
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        line-height: 1.5;
        resize: vertical;
        min-height: 64px;
        outline: none;
        color: ${p => p.theme.colors.text};

        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }

    .actions { display: flex; gap: 6px; justify-content: flex-end; }
`;

const SmallButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid ${({ $primary, theme }) => ($primary ? 'transparent' : theme.colors.border)};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.surface)};
    color: ${({ $primary, theme }) => ($primary ? '#ffffff' : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.md};
    padding: 6px 11px;
    font-size: 12.5px;
    font-family: inherit;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: default; }
    &:hover:not(:disabled) { filter: brightness(0.97); }
`;

const Foot = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    padding: 9px 12px;
`;

const Muted = styled.p`
    margin: 0;
    padding: 12px 2px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
    text-align: center;
`;

const HistoryLine = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    line-height: 1.5;

    strong { color: ${p => p.theme.colors.text}; font-weight: ${p => p.theme.fontWeights.semibold}; }
    .quote {
        display: block;
        margin-top: 2px;
        padding-left: 8px;
        border-left: 2px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textMuted};
        white-space: pre-wrap;
        word-break: break-word;
    }
`;

const ACTION_LABELS: Record<ContactNoteAction, string> = {
    CREATED: 'dodał(a) notatkę',
    UPDATED: 'zmienił(a) notatkę',
    DELETED: 'usunął(-nęła) notatkę',
};

interface ContactNotesPopoverProps {
    email: string;
    /** Element, pod którym chmurka ma się zaczepić - zwykle plakietka w nagłówku. */
    anchor: HTMLElement | null;
    onClose: () => void;
}

export function ContactNotesPopover({ email, anchor, onClose }: ContactNotesPopoverProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [draft, setDraft] = useState('');
    const [composing, setComposing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const [historyShown, setHistoryShown] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const { data, isLoading } = useContactNotes(email);
    const { data: history, isLoading: historyLoading } = useContactNoteHistory(email, {
        enabled: historyShown,
    });
    const createNote = useCreateContactNote();
    const updateNote = useUpdateContactNote();
    const deleteNote = useDeleteContactNote();

    useEffect(() => {
        if (!anchor) return;
        const place = () => {
            const rect = anchor.getBoundingClientRect();
            const width = 380;
            // Chmurka nie ma prawa wyjść poza ekran ani przy wąskim oknie, ani przy
            // plakietce stojącej blisko prawej krawędzi.
            const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
            setPos({ top: rect.bottom + 6, left });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);

    useEffect(() => {
        const onDocClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (cardRef.current?.contains(target) || anchor?.contains(target)) return;
            onClose();
        };
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [anchor, onClose]);

    const notes = data?.notes ?? [];

    const submitNew = () => {
        const body = draft.trim();
        if (!body) return;
        createNote.mutate(
            { email, body },
            {
                onSuccess: () => {
                    setDraft('');
                    setComposing(false);
                },
            }
        );
    };

    const submitEdit = (noteId: string) => {
        const body = editDraft.trim();
        if (!body) return;
        updateNote.mutate({ email, noteId, body }, { onSuccess: () => setEditingId(null) });
    };

    if (!pos) return null;

    return createPortal(
        <Card ref={cardRef} style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="Notatki do klienta">
            <CardHead>
                <span className="title">Notatki do klienta</span>
                <button
                    type="button"
                    aria-pressed={historyShown}
                    onClick={() => setHistoryShown((current) => !current)}
                    title="Historia zmian"
                >
                    <History size={13} /> Historia
                </button>
                <button type="button" onClick={onClose} aria-label="Zamknij">
                    <X size={14} />
                </button>
            </CardHead>

            <Scroll>
                {historyShown ? (
                    <>
                        {historyLoading && <Muted>Wczytywanie historii…</Muted>}
                        {!historyLoading && (history ?? []).length === 0 && (
                            <Muted>Brak zmian do pokazania</Muted>
                        )}
                        {(history ?? []).map((entry) => (
                            <HistoryLine key={entry.id}>
                                <strong>{entry.actorName}</strong> {ACTION_LABELS[entry.action]} ·{' '}
                                {formatDateTime(entry.createdAt)}
                                {entry.action === 'UPDATED' && entry.bodyBefore && (
                                    <span className="quote">było: {entry.bodyBefore}</span>
                                )}
                                {entry.action !== 'DELETED' && entry.bodyAfter && (
                                    <span className="quote">{entry.bodyAfter}</span>
                                )}
                                {entry.action === 'DELETED' && entry.bodyBefore && (
                                    <span className="quote">{entry.bodyBefore}</span>
                                )}
                            </HistoryLine>
                        ))}
                    </>
                ) : (
                    <>
                        {isLoading && <Muted>Wczytywanie…</Muted>}
                        {!isLoading && notes.length === 0 && (
                            <Muted>Jeszcze nic tu nie zapisaliśmy</Muted>
                        )}
                        {notes.map((note) =>
                            editingId === note.id ? (
                                <Editor key={note.id}>
                                    <textarea
                                        autoFocus
                                        value={editDraft}
                                        onChange={(event) => setEditDraft(event.target.value)}
                                    />
                                    <div className="actions">
                                        <SmallButton type="button" onClick={() => setEditingId(null)}>
                                            Anuluj
                                        </SmallButton>
                                        <SmallButton
                                            $primary
                                            type="button"
                                            disabled={!editDraft.trim() || updateNote.isPending}
                                            onClick={() => submitEdit(note.id)}
                                        >
                                            {updateNote.isPending ? <Loader2 size={12} /> : <Check size={12} />}
                                            Zapisz
                                        </SmallButton>
                                    </div>
                                </Editor>
                            ) : (
                                <NoteCard key={note.id}>
                                    <div className="body">{note.body}</div>
                                    <div className="meta">
                                        <span>
                                            {note.createdByName} · {formatDateTime(note.createdAt)}
                                            {note.edited && ' · edytowano'}
                                        </span>
                                        <span className="spacer" />
                                        <button
                                            type="button"
                                            aria-label="Edytuj notatkę"
                                            onClick={() => {
                                                setEditingId(note.id);
                                                setEditDraft(note.body);
                                            }}
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            className="danger"
                                            aria-label="Usuń notatkę"
                                            onClick={() => deleteNote.mutate({ email, noteId: note.id })}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </NoteCard>
                            )
                        )}
                    </>
                )}
            </Scroll>

            {!historyShown && (
                <Foot>
                    {composing ? (
                        <Editor>
                            <textarea
                                autoFocus
                                placeholder="Co warto pamiętać o tym kliencie?"
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                            />
                            <div className="actions">
                                <SmallButton
                                    type="button"
                                    onClick={() => {
                                        setComposing(false);
                                        setDraft('');
                                    }}
                                >
                                    Anuluj
                                </SmallButton>
                                <SmallButton
                                    $primary
                                    type="button"
                                    disabled={!draft.trim() || createNote.isPending}
                                    onClick={submitNew}
                                >
                                    {createNote.isPending ? <Loader2 size={12} /> : <Check size={12} />}
                                    Zapisz
                                </SmallButton>
                            </div>
                        </Editor>
                    ) : (
                        <SmallButton type="button" onClick={() => setComposing(true)}>
                            <Plus size={12} /> Dodaj notatkę
                        </SmallButton>
                    )}
                </Foot>
            )}
        </Card>,
        document.body
    );
}
