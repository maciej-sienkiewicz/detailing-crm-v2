import { useState } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { formatDateTime } from '@/common/utils';
import { useProductNotes } from '../hooks/useProducts';

const Wrap = styled.div` display: flex; flex-direction: column; gap: 12px; `;

const Composer = styled.div` display: flex; flex-direction: column; gap: 8px; `;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 64px;
    padding: 10px 12px;
    font-family: inherit;
    font-size: 14px;
    color: ${st.text};
    background: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    resize: vertical;
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

// Akcja drugorzędna w oknie do czytania: odcień zostaje, wypełnienia nie ma (CLAUDE.md §2).
const AddBtn = styled.button`
    align-self: flex-end;
    padding: 7px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #15803d;
    background: ${st.bgAccentGreen};
    border: 1px solid #86efac;
    border-radius: ${st.radiusSm};
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const NoteRow = styled.div`
    padding: 10px 0;
    border-top: 1px solid ${st.border};
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const NoteContent = styled.p` margin: 0; font-size: 14px; color: ${st.text}; white-space: pre-wrap; `;
const NoteMeta = styled.div` display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: ${st.textMuted}; `;
const DeleteBtn = styled.button` background: none; border: none; color: ${st.textMuted}; cursor: pointer; padding: 2px; &:hover { color: ${st.accentRed}; } `;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;

interface Props {
    productId: string;
    canManage: boolean;
}

export function ProductNotes({ productId, canManage }: Props) {
    const { notes, add, remove } = useProductNotes(productId);
    const [draft, setDraft] = useState('');

    const submit = () => {
        const content = draft.trim();
        if (!content) return;
        add.mutate({ content }, { onSuccess: () => setDraft('') });
    };

    return (
        <Wrap>
            {canManage && (
                <Composer>
                    <TextArea
                        placeholder="Notatka o produkcie — jak się sprawdził, na czym uważać…"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                    />
                    <AddBtn type="button" onClick={submit} disabled={!draft.trim() || add.isPending}>
                        Dodaj notatkę
                    </AddBtn>
                </Composer>
            )}
            {notes.length === 0 && <Empty>Brak notatek. Pierwsza obserwacja o tym produkcie zostanie tutaj.</Empty>}
            {notes.map(note => (
                <NoteRow key={note.id}>
                    <NoteContent>{note.content}</NoteContent>
                    <NoteMeta>
                        <span>{note.createdByName} · {formatDateTime(note.createdAt)}</span>
                        {canManage && (
                            <DeleteBtn type="button" onClick={() => remove.mutate(note.id)} aria-label="Usuń notatkę">
                                <Trash2 size={14} />
                            </DeleteBtn>
                        )}
                    </NoteMeta>
                </NoteRow>
            ))}
        </Wrap>
    );
}
