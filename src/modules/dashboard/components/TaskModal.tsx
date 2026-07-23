import { useState, useEffect, useRef } from 'react';
import { ClipboardList, Users, Shield, Globe } from 'lucide-react';
import styled from 'styled-components';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalSubtitle,
  ModalContent,
  ModalFooter,
  CloseBtn,
} from '@/common/components/ModalKit';
import { tasksApi } from '../api/tasksApi';
import type { DashboardTask, CreateTaskPayload, TaskVisibilityType, TaskVisibilityOptions } from '../types';

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

// ─── Visibility Styled ────────────────────────────────────────────────────────

const VisibilityTabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 3px;
  background: #f1f5f9;
  border-radius: 10px;
`;

const VisibilityTab = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;
  background: ${p => p.$active ? '#fff' : 'transparent'};
  color: ${p => p.$active ? '#0ea5e9' : '#64748b'};
  box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};

  svg { width: 13px; height: 13px; flex-shrink: 0; }

  &:hover:not([data-active="true"]) { color: #374151; }
`;

const PickerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  padding: 2px 0;
`;

const PickerItem = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 100ms ease;
  background: ${p => p.$selected ? '#eff6ff' : 'transparent'};
  border: 1.5px solid ${p => p.$selected ? '#bae6fd' : 'transparent'};

  &:hover { background: ${p => p.$selected ? '#eff6ff' : '#f8fafc'}; }

  input[type="checkbox"], input[type="radio"] {
    accent-color: #0ea5e9;
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  span {
    font-size: 13px;
    color: #374151;
    font-weight: ${p => p.$selected ? 600 : 400};
  }
`;

const PickerEmpty = styled.p`
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 12px 0;
  margin: 0;
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
  const [visibilityType, setVisibilityType] = useState<TaskVisibilityType>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [options, setOptions] = useState<TaskVisibilityOptions>({ users: [], roles: [] });
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingTask;

  useEffect(() => {
    if (isOpen) {
      setTitle(editingTask?.title ?? '');
      setMeta(editingTask?.meta ?? '');
      setSaving(false);
      setVisibilityType((editingTask?.visibilityType as TaskVisibilityType) ?? 'ALL');
      setSelectedUserIds(editingTask?.visibleToUserIds ?? []);
      setSelectedRoleId(editingTask?.visibleToRoleId ?? '');
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen, editingTask]);

  useEffect(() => {
    if (isOpen) {
      tasksApi.getVisibilityOptions().then(setOptions).catch(() => {});
    }
  }, [isOpen]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        meta: meta.trim() || undefined,
        visibilityType,
        visibleToUserIds: visibilityType === 'USERS' ? selectedUserIds : undefined,
        visibleToRoleId: visibilityType === 'ROLE' ? selectedRoleId || undefined : undefined,
      };
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
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
        <CloseBtn onClick={onClose} aria-label="Zamknij" />
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

          {!isEditing && (
            <FieldGroup>
              <Label>Widoczność zadania</Label>
              <VisibilityTabs>
                <VisibilityTab
                  type="button"
                  $active={visibilityType === 'ALL'}
                  onClick={() => setVisibilityType('ALL')}
                >
                  <Globe />
                  Wszyscy
                </VisibilityTab>
                <VisibilityTab
                  type="button"
                  $active={visibilityType === 'USERS'}
                  onClick={() => setVisibilityType('USERS')}
                >
                  <Users />
                  Osoby
                </VisibilityTab>
                <VisibilityTab
                  type="button"
                  $active={visibilityType === 'ROLE'}
                  onClick={() => setVisibilityType('ROLE')}
                >
                  <Shield />
                  Rola
                </VisibilityTab>
              </VisibilityTabs>

              {visibilityType === 'USERS' && (
                <PickerList>
                  {options.users.length === 0 ? (
                    <PickerEmpty>Brak pracowników</PickerEmpty>
                  ) : (
                    options.users.map(user => (
                      <PickerItem key={user.userId} $selected={selectedUserIds.includes(user.userId)}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.userId)}
                          onChange={() => toggleUser(user.userId)}
                        />
                        <span>{user.fullName}</span>
                      </PickerItem>
                    ))
                  )}
                </PickerList>
              )}

              {visibilityType === 'ROLE' && (
                <PickerList>
                  {options.roles.length === 0 ? (
                    <PickerEmpty>Brak ról</PickerEmpty>
                  ) : (
                    options.roles.map(role => (
                      <PickerItem key={role.roleId} $selected={selectedRoleId === role.roleId}>
                        <input
                          type="radio"
                          name="task-role"
                          checked={selectedRoleId === role.roleId}
                          onChange={() => setSelectedRoleId(role.roleId)}
                        />
                        <span>{role.name}</span>
                      </PickerItem>
                    ))
                  )}
                </PickerList>
              )}
            </FieldGroup>
          )}
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
    </ModalShell>
  );
};
