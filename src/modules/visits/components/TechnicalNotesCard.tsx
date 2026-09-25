// src/modules/visits/components/TechnicalNotesCard.tsx
//
// Notatka techniczna wizyty - panel w szynie bocznej.
//
// „Edytuj" było tu wypełnionym niebieskim przyciskiem #3B82F6 - drugim niebieskim
// na ekranie i jednym z czterech stale wypełnionych przycisków w oknie wizyty.
// Teraz jest obrysowane (CLAUDE.md §2): notatkę poprawia się rzadko, a wypełnienie
// należy do kroku następnego w nagłówku.
//
// Okna edycji i historii stoją na ModalShell - poprzednio miały własną nakładkę
// bez blokady przewijania tła (CLAUDE.md §3).

import { useState } from 'react';
import styled from 'styled-components';
import { History, Pencil, Plus } from 'lucide-react';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { Button, IconButton, Panel, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { useUpdateTechnicalNote, useTechnicalNoteHistory } from '../hooks';
import type { TechnicalNoteHistoryEntry } from '../types';

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

const HeadActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const NoteText = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.inkSoft};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

const Empty = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 160px;
    resize: vertical;
    padding: 10px 12px;
    box-sizing: border-box;
    border: 1px solid ${ui.line};
    border-radius: 10px;
    background: ${ui.surface};
    color: ${ui.ink};
    font-family: inherit;
    font-size: 14px;
    line-height: 1.6;

    &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
`;

const HistoryList = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const HistoryItem = styled.li`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 0;
    border-top: 1px solid ${ui.lineFaint};

    &:first-child { border-top: none; padding-top: 0; }
`;

const HistoryHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12.5px;
    color: ${ui.textMuted};

    strong { font-weight: 600; color: ${ui.ink}; }
`;

const HistoryContent = styled.div`
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.inkSoft};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

const ACTION: Record<TechnicalNoteHistoryEntry['action'], { label: string; tone: 'ok' | 'danger' | 'info' }> = {
    CREATED: { label: 'Dodano', tone: 'ok' },
    CLEARED: { label: 'Wyczyszczono', tone: 'danger' },
    UPDATED: { label: 'Zmieniono', tone: 'info' },
};

function EditModal({ initial, onSave, onClose, isSaving }: {
    initial: string;
    onSave: (content: string | null) => void;
    onClose: () => void;
    isSaving: boolean;
}) {
    const [value, setValue] = useState(initial);
    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup><ModalTitle>Notatka techniczna</ModalTitle></ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Textarea
                    aria-label="Treść notatki technicznej"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Np. rysa na drzwiach kierowcy, nie polerować listew chromowanych"
                    autoFocus
                />
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                {/* Otwarty edytor przejmuje okno - jego „Zapisz" wolno wypełnić (CLAUDE.md §2). */}
                <Button variant="primary" onClick={() => onSave(value.trim() || null)} disabled={isSaving}>
                    {isSaving ? 'Zapisywanie...' : 'Zapisz notatkę'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}

function HistoryModal({ entries, isLoading, onClose }: {
    entries: TechnicalNoteHistoryEntry[];
    isLoading: boolean;
    onClose: () => void;
}) {
    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup><ModalTitle>Historia notatki technicznej</ModalTitle></ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {isLoading ? (
                    <Empty>Wczytywanie historii...</Empty>
                ) : entries.length === 0 ? (
                    <Empty>Notatka nie była jeszcze zmieniana.</Empty>
                ) : (
                    <HistoryList>
                        {entries.map(entry => {
                            const action = ACTION[entry.action] ?? ACTION.UPDATED;
                            return (
                                <HistoryItem key={entry.id}>
                                    <HistoryHead>
                                        <StatusPill $tone={action.tone}>{action.label}</StatusPill>
                                        <strong>{entry.changedByName}</strong>
                                        <span>{formatDate(entry.changedAt)}</span>
                                    </HistoryHead>
                                    {entry.action !== 'CLEARED' && entry.content && (
                                        <HistoryContent>{entry.content}</HistoryContent>
                                    )}
                                </HistoryItem>
                            );
                        })}
                    </HistoryList>
                )}
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose}>Zamknij</Button>
            </ModalFooter>
        </ModalShell>
    );
}

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
            <RailPanel aria-labelledby="visit-note-title">
                <Head>
                    <SectionTitle id="visit-note-title">Notatka techniczna</SectionTitle>
                    <HeadActions>
                        <IconButton label="Historia notatki" variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
                            <History />
                        </IconButton>
                        {canEdit && (
                            <Button size="sm" onClick={() => setEditOpen(true)}>
                                {notes ? <><Pencil />Edytuj</> : <><Plus />Dodaj</>}
                            </Button>
                        )}
                    </HeadActions>
                </Head>
                {notes ? <NoteText>{notes}</NoteText> : <Empty>Brak notatki technicznej.</Empty>}
            </RailPanel>

            {editOpen && (
                <EditModal initial={notes ?? ''} onSave={handleSave} onClose={() => setEditOpen(false)} isSaving={isUpdating} />
            )}
            {historyOpen && (
                <HistoryModal entries={entries} isLoading={isLoadingHistory} onClose={() => setHistoryOpen(false)} />
            )}
        </>
    );
};
