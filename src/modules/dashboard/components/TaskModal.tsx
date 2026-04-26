import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardList } from 'lucide-react';
import styled from 'styled-components';
import {
  ModalOverlay,
  ModalBox,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalSubtitle,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
} from '@/common/styles/sharedModalStyles';
import type { DashboardTask, CreateTaskPayload } from '../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }

  &::placeholder { color: #94a3b8; }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  resize: vertical;
  min-height: 72px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }

  &::placeholder { color: #94a3b8; }
`;

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #0ea5e9;
  svg { width: 20px; height: 20px; }
`;

const BtnPrimary = styled.button<{ $loading?: boolean }>`
  padding: 10px 20px;
  background: ${p => p.$loading ? '#7dd3fc' : '#0ea5e9'};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  transition: background 150ms ease;

  &:hover:not(:disabled) { background: #0284c7; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
  padding: 10px 20px;
  background: transparent;
  color: #64748b;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover { background: #f8fafc; border-color: #cbd5e1; }
`;

const CharCount = styled.span<{ $warn: boolean }>`
  font-size: 11px;
  color: ${p => p.$warn ? '#ef4444' : '#94a3b8'};
  align-self: flex-end;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateTaskPayload) => Promise<void>;
  editingTask?: DashboardTask | null;
}

export const TaskModal = ({ isOpen, onClose, onSave, editingTask }: TaskModalProps) => {
  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingTask;

  useEffect(() => {
    if (isOpen) {
      setTitle(editingTask?.title ?? '');
      setMeta(editingTask?.meta ?? '');
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen, editingTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), meta: meta.trim() || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay $isOpen={isOpen} onClick={onClose} onKeyDown={handleKeyDown}>
      <ModalBox $isOpen={isOpen} $maxWidth="480px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <IconWrap>
            <ClipboardList />
          </IconWrap>
          <ModalTitleGroup>
            <ModalTitle>{isEditing ? 'Edytuj notatkę' : 'Nowa notatka'}</ModalTitle>
            <ModalSubtitle>
              {isEditing ? 'Zmień treść lub kontekst.' : 'Dodaj zadanie do listy "Do zrobienia".'}
            </ModalSubtitle>
          </ModalTitleGroup>
          <ModalCloseButton onClick={onClose} aria-label="Zamknij">
            <X />
          </ModalCloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalContent>
            <FieldGroup>
              <Label htmlFor="task-title">Tytuł *</Label>
              <Input
                id="task-title"
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="np. Zadzwoń do klienta, Zamów materiały…"
                maxLength={200}
                required
              />
              {title.length > 160 && (
                <CharCount $warn={title.length > 190}>{title.length}/200</CharCount>
              )}
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="task-meta">Kontekst (opcjonalnie)</Label>
              <Textarea
                id="task-meta"
                value={meta}
                onChange={e => setMeta(e.target.value)}
                placeholder="np. Pilne · do piątku, Magazyn · niski stan…"
                maxLength={300}
              />
              {meta.length > 220 && (
                <CharCount $warn={meta.length > 280}>{meta.length}/300</CharCount>
              )}
            </FieldGroup>
          </ModalContent>

          <ModalFooter>
            <BtnGhost type="button" onClick={onClose}>
              Anuluj
            </BtnGhost>
            <BtnPrimary type="submit" disabled={!title.trim() || saving} $loading={saving}>
              {saving ? 'Zapisuję…' : isEditing ? 'Zapisz zmiany' : 'Dodaj notatkę'}
            </BtnPrimary>
          </ModalFooter>
        </form>
      </ModalBox>
    </ModalOverlay>,
    document.body,
  );
};
