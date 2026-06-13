import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Trash2, Pencil, Check, X, BookOpen, Maximize2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '../../api/leadApi';
import type { QuoteReplyExampleDto } from '../../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const collapse = keyframes`
  from { max-height: 300px; opacity: 1; margin-bottom: 6px; }
  to   { max-height: 0;     opacity: 0; margin-bottom: 0;   }
`;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 0.5px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
`;

const PanelTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
  flex: 1;
`;

const PanelBack = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #007aff;
  cursor: pointer;
  &:hover { background: rgba(0,122,255,0.08); }
`;

const Count = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #888;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const EmptyMsg = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: #888;
  font-style: italic;
`;

const ExampleCard = styled.div<{ $collapsing?: boolean }>`
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
  ${({ $collapsing }) => $collapsing && css`
    animation: ${collapse} 320ms ease forwards;
    pointer-events: none;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
`;

const CardTitle = styled.input`
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #1c1c1e;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  min-width: 0;
  padding: 2px 4px;
  border-radius: 4px;
  &:focus { background: #fff; outline: 1.5px solid #007aff; }
  &[readonly] { cursor: default; }
`;

const CardMeta = styled.div`
  font-size: 10px;
  color: #aaa;
  white-space: nowrap;
  flex-shrink: 0;
`;

const CardBody = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
  color: #374151;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 80px;
  max-height: 160px;
  &:focus { background: #fff; }
  &[readonly] { cursor: default; color: #6b7280; }
`;

const CardActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

const IconBtn = styled.button<{ $danger?: boolean; $confirm?: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.$danger ? '#dc2626' : p.$confirm ? '#16a34a' : '#6b7280'};
  transition: all 120ms;
  svg { width: 13px; height: 13px; }
  &:hover {
    background: ${p => p.$danger ? '#fee2e2' : p.$confirm ? '#dcfce7' : '#f1f5f9'};
  }
`;

const LimitBanner = styled.div`
  margin: 0 8px 8px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
`;

// ─── Expand overlay ───────────────────────────────────────────────────────────

const ExpandOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  z-index: 10;
  border-radius: 14px;
  overflow: hidden;
`;

const ExpandHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(0,0,0,0.1);
  background: #f3f4f6;
  flex-shrink: 0;
`;

const ExpandTitle = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #1c1c1e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExpandBody = styled.textarea`
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 16px 20px;
  font-size: 13.5px;
  line-height: 1.65;
  color: #1c1c1e;
  border: none;
  outline: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
`;

const CloseExpandBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #007aff;
  cursor: pointer;
  &:hover { background: rgba(0,122,255,0.08); }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXAMPLES_KEY = ['quote-reply-examples'];
const MAX_EXAMPLES = 10;

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function QuoteReplyExamplesPanel({ onBack }: Props) {
  const queryClient = useQueryClient();
  const { data: examples = [], isLoading } = useQuery({
    queryKey: EXAMPLES_KEY,
    queryFn: () => leadApi.listQuoteReplyExamples(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadApi.deleteQuoteReplyExample(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXAMPLES_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, content }: { id: string; title: string; content: string }) =>
      leadApi.updateQuoteReplyExample(id, title, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXAMPLES_KEY }),
  });

  const [editing, setEditing] = useState<Record<string, { title: string; content: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [collapsing, setCollapsing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<QuoteReplyExampleDto | null>(null);

  const startEdit = (ex: QuoteReplyExampleDto) => {
    setEditing(prev => ({ ...prev, [ex.id]: { title: ex.title, content: ex.content } }));
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const saveEdit = (id: string) => {
    const e = editing[id];
    if (!e) return;
    updateMutation.mutate({ id, title: e.title, content: e.content });
    cancelEdit(id);
  };

  const handleDelete = (id: string) => {
    setCollapsing(id);
    setConfirmDelete(null);
    // Wait for collapse animation to finish before calling API
    setTimeout(() => {
      deleteMutation.mutate(id);
      setCollapsing(null);
    }, 320);
  };

  return (
    // position:relative so expand overlay can fill this panel
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Panel>
        <PanelHeader>
          <BookOpen size={14} color="#007aff" />
          <PanelTitle>Przykłady stylu odpowiedzi</PanelTitle>
          <Count>{examples.length}/{MAX_EXAMPLES}</Count>
          <PanelBack onClick={onBack}><X size={12} /> Zamknij</PanelBack>
        </PanelHeader>

        {examples.length >= MAX_EXAMPLES && (
          <LimitBanner>
            Osiągnięto limit {MAX_EXAMPLES} przykładów. Usuń jeden, aby dodać nowy.
          </LimitBanner>
        )}

        <List>
          {isLoading && <EmptyMsg>Ładowanie…</EmptyMsg>}
          {!isLoading && examples.length === 0 && (
            <EmptyMsg>Brak zapisanych przykładów.<br />Wygeneruj ofertę, wprowadź poprawki i kliknij „Zapisz jako przykład".</EmptyMsg>
          )}
          {examples.map(ex => {
            const isEdit = !!editing[ex.id];
            const val = editing[ex.id] ?? { title: ex.title, content: ex.content };
            const meta = ex.updatedByName
              ? `Edytowano: ${ex.updatedByName} · ${formatDate(ex.updatedAt)}`
              : `Dodano: ${ex.createdByName} · ${formatDate(ex.createdAt)}`;

            return (
              <ExampleCard key={ex.id} $collapsing={collapsing === ex.id}>
                <CardHeader>
                  <CardTitle
                    value={val.title}
                    readOnly={!isEdit}
                    onChange={e => setEditing(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], title: e.target.value } }))}
                  />
                  <CardMeta>{meta}</CardMeta>
                  <CardActions>
                    {isEdit ? (
                      <>
                        <IconBtn $confirm title="Zapisz" onClick={() => saveEdit(ex.id)}><Check /></IconBtn>
                        <IconBtn title="Anuluj" onClick={() => cancelEdit(ex.id)}><X /></IconBtn>
                      </>
                    ) : confirmDelete === ex.id ? (
                      <>
                        <IconBtn $danger title="Potwierdź usunięcie" onClick={() => handleDelete(ex.id)}><Check /></IconBtn>
                        <IconBtn title="Anuluj" onClick={() => setConfirmDelete(null)}><X /></IconBtn>
                      </>
                    ) : (
                      <>
                        <IconBtn title="Rozwiń" onClick={() => setExpanded(ex)}><Maximize2 /></IconBtn>
                        <IconBtn title="Edytuj" onClick={() => startEdit(ex)}><Pencil /></IconBtn>
                        <IconBtn $danger title="Usuń" onClick={() => setConfirmDelete(ex.id)}><Trash2 /></IconBtn>
                      </>
                    )}
                  </CardActions>
                </CardHeader>
                <CardBody
                  value={val.content}
                  readOnly={!isEdit}
                  onChange={e => setEditing(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], content: e.target.value } }))}
                />
              </ExampleCard>
            );
          })}
        </List>
      </Panel>

      {/* Expand overlay — covers entire ComposeWindow */}
      {expanded && (
        <ExpandOverlay>
          <ExpandHeader>
            <ExpandTitle>{expanded.title}</ExpandTitle>
            <CloseExpandBtn onClick={() => setExpanded(null)}><X size={12} /> Zamknij podgląd</CloseExpandBtn>
          </ExpandHeader>
          <ExpandBody readOnly value={expanded.content} />
        </ExpandOverlay>
      )}
    </div>
  );
}
