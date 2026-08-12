import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useUpdateTechnicalNote, useTechnicalNoteHistory } from '../hooks';
import type { TechnicalNoteHistoryEntry } from '../types';

// ── Layout ────────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 13px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bgCard};
`;

const CardIconWrap = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.1px;
    flex: 1;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, opacity 0.15s;

    ${({ $variant }) =>
        $variant === 'primary'
            ? `
        background: ${st.accent};
        color: #fff;
        border-color: ${st.accent};
        &:hover { opacity: 0.85; }
    `
            : `
        background: transparent;
        color: ${st.textMuted};
        border-color: ${st.border};
        &:hover { background: ${st.bg}; color: ${st.text}; }
    `}
`;

const CardBody = styled.div`
    padding: 14px 16px;
`;

const NotesContent = styled.div`
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 10px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: 8px;
`;

const EmptyState = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-style: italic;
    text-align: center;
    padding: 12px 0;
`;

// ── Modal overlay ─────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 12px;
    width: 100%;
    max-width: 560px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
`;

const ModalHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    gap: 10px;
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${st.text};
    flex: 1;
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: ${st.textMuted};
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    &:hover { background: ${st.bg}; color: ${st.text}; }
`;

const ModalBody = styled.div`
    padding: 20px;
    overflow-y: auto;
    flex: 1;
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 160px;
    resize: vertical;
    padding: 10px 12px;
    border: 1px solid ${st.border};
    border-radius: 8px;
    background: ${st.bg};
    color: ${st.text};
    font-size: ${st.fontSm};
    font-family: inherit;
    line-height: 1.6;
    box-sizing: border-box;
    &:focus {
        outline: none;
        border-color: ${st.accent};
    }
`;

const ModalFooter = styled.div`
    padding: 14px 20px;
    border-top: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity 0.15s, background 0.15s;

    ${({ $variant }) =>
        $variant === 'primary'
            ? `
        background: ${st.accent};
        color: #fff;
        border-color: ${st.accent};
        &:hover { opacity: 0.85; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    `
            : `
        background: transparent;
        color: ${st.text};
        border-color: ${st.border};
        &:hover { background: ${st.bg}; }
    `}
`;

// ── History panel (inside history modal) ──────────────────────────────────────

const HistoryList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const HistoryItem = styled.div`
    border: 1px solid ${st.border};
    border-radius: 8px;
    overflow: hidden;
`;

const HistoryItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const ActionBadge = styled.span<{ $action: string }>`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.3px;
    text-transform: uppercase;

    ${({ $action }) => {
        if ($action === 'CREATED') return `background: #d1fae5; color: #065f46;`;
        if ($action === 'CLEARED') return `background: #fee2e2; color: #991b1b;`;
        return `background: #dbeafe; color: #1e40af;`;
    }}
`;

const HistoryMeta = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    flex: 1;
`;

const HistoryContent = styled.div`
    padding: 10px 12px;
    font-size: ${st.fontSm};
    color: ${st.text};
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
`;

const EmptyHistory = styled.div`
    text-align: center;
    padding: 32px 0;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    font-style: italic;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function actionLabel(action: TechnicalNoteHistoryEntry['action']): string {
    if (action === 'CREATED') return 'Dodano';
    if (action === 'CLEARED') return 'Wyczyszczono';
    return 'Zmieniono';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EditModal({
    initial,
    onSave,
    onClose,
    isSaving,
}: {
    initial: string;
    onSave: (content: string | null) => void;
    onClose: () => void;
    isSaving: boolean;
}) {
    const [value, setValue] = useState(initial);

    function handleSave() {
        const trimmed = value.trim();
        onSave(trimmed || null);
    }

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <CardIconWrap aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </CardIconWrap>
                    <ModalTitle>Notatka techniczna</ModalTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </ModalHeader>
                <ModalBody>
                    <Textarea
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder="Wpisz notatkę techniczną dotyczącą wizyty…"
                        autoFocus
                    />
                </ModalBody>
                <ModalFooter>
                    <Btn $variant="secondary" onClick={onClose}>Anuluj</Btn>
                    <Btn $variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie…' : 'Zapisz'}
                    </Btn>
                </ModalFooter>
            </Modal>
        </Overlay>
    );
}

function HistoryModal({
    entries,
    isLoading,
    onClose,
}: {
    entries: TechnicalNoteHistoryEntry[];
    isLoading: boolean;
    onClose: () => void;
}) {
    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <CardIconWrap aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </CardIconWrap>
                    <ModalTitle>Historia notatki technicznej</ModalTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </ModalHeader>
                <ModalBody>
                    {isLoading ? (
                        <EmptyHistory>Ładowanie historii…</EmptyHistory>
                    ) : entries.length === 0 ? (
                        <EmptyHistory>Brak historii zmian notatki</EmptyHistory>
                    ) : (
                        <HistoryList>
                            {entries.map(entry => (
                                <HistoryItem key={entry.id}>
                                    <HistoryItemHeader>
                                        <ActionBadge $action={entry.action}>
                                            {actionLabel(entry.action)}
                                        </ActionBadge>
                                        <HistoryMeta>
                                            {entry.changedByName} · {formatDate(entry.changedAt)}
                                        </HistoryMeta>
                                    </HistoryItemHeader>
                                    {entry.action !== 'CLEARED' && entry.content && (
                                        <HistoryContent>{entry.content}</HistoryContent>
                                    )}
                                </HistoryItem>
                            ))}
                        </HistoryList>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Btn $variant="secondary" onClick={onClose}>Zamknij</Btn>
                </ModalFooter>
            </Modal>
        </Overlay>
    );
}

// ── Public component ──────────────────────────────────────────────────────────

interface TechnicalNotesCardProps {
    notes: string | null | undefined;
    visitId: string;
    canEdit?: boolean;
}

export const TechnicalNotesCard = ({ notes, visitId, canEdit = true }: TechnicalNotesCardProps) => {
    const [editOpen, setEditOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    const { updateTechnicalNote, isUpdating } = useUpdateTechnicalNote(visitId);
    const { entries, isLoading: isLoadingHistory } = useTechnicalNoteHistory(visitId);

    async function handleSave(content: string | null) {
        await updateTechnicalNote(content);
        setEditOpen(false);
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardIconWrap aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </CardIconWrap>
                    <CardTitle>Notatka techniczna</CardTitle>
                    <HeaderActions>
                        <ActionBtn $variant="ghost" onClick={() => setHistoryOpen(true)} title="Historia zmian">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            Historia
                        </ActionBtn>
                        {canEdit && (
                            <ActionBtn $variant="primary" onClick={() => setEditOpen(true)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                {notes ? 'Edytuj' : 'Dodaj'}
                            </ActionBtn>
                        )}
                    </HeaderActions>
                </CardHeader>

                <CardBody>
                    {notes ? (
                        <NotesContent>{notes}</NotesContent>
                    ) : (
                        <EmptyState>Brak notatki technicznej</EmptyState>
                    )}
                </CardBody>
            </Card>

            {editOpen && (
                <EditModal
                    initial={notes ?? ''}
                    onSave={handleSave}
                    onClose={() => setEditOpen(false)}
                    isSaving={isUpdating}
                />
            )}

            {historyOpen && (
                <HistoryModal
                    entries={entries}
                    isLoading={isLoadingHistory}
                    onClose={() => setHistoryOpen(false)}
                />
            )}
        </>
    );
};
