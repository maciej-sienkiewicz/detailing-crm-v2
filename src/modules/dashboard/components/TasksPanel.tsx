import { useState } from 'react';
import styled from 'styled-components';
import { Check, Pencil, Trash2, Plus, ClipboardList, Archive, Users, ShieldCheck } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { TaskModal } from './TaskModal';
import { TaskArchiveModal } from './TaskArchiveModal';
import type { DashboardTask, CreateTaskPayload } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const Panel = styled.div`
  background: #fff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  overflow: hidden;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f1f5f9;
`;

const PanelTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.1px;
  color: ${p => p.theme.colors.text};
`;

const HeadActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ArchiveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: #e2e8f0;
    color: #374151;
  }

  svg { width: 13px; height: 13px; stroke-width: 2; }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;

  &:hover {
    background: #0284c7;
    transform: translateY(-1px);
  }

  svg { width: 13px; height: 13px; stroke-width: 2.5; }
`;

const TaskList = styled.div`
  padding: 8px 0;
`;

const TaskItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 10px 22px;
  align-items: flex-start;
  transition: background 140ms ease;
  position: relative;

  &:hover { background: #f8fafc; }
  &:hover .task-actions { opacity: 1; }
`;

const Checkbox = styled.button<{ $done: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid ${p => p.$done ? '#10b981' : '#cbd5e1'};
  background: ${p => p.$done ? '#10b981' : 'transparent'};
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 150ms ease;

  &:hover:not([data-done="true"]) {
    border-color: #10b981;
    background: rgba(16,185,129,0.08);
  }

  svg { width: 11px; height: 11px; stroke-width: 3; }
`;

const TaskContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.div<{ $done: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.$done ? p.theme.colors.textMuted : p.theme.colors.text};
  text-decoration: ${p => p.$done ? 'line-through' : 'none'};
  margin: 0 0 2px;
  line-height: 1.4;
`;

const TaskMeta = styled.div`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
`;

const TaskCreator = styled.div`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
`;

const VisibilityBadge = styled.div<{ $type: 'USERS' | 'ROLE' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 7px 2px 5px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  width: fit-content;

  ${p => p.$type === 'USERS' ? `
    background: #eff6ff;
    border: 1px solid #bae6fd;
    color: #0284c7;
  ` : `
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    color: #7c3aed;
  `}

  svg { width: 10px; height: 10px; flex-shrink: 0; stroke-width: 2; }
`;

const TaskActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 140ms ease;
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $danger?: boolean }>`
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${p => p.$danger ? '#ef4444' : '#64748b'};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${p => p.$danger ? '#fee2e2' : '#f1f5f9'};
    color: ${p => p.$danger ? '#dc2626' : '#0f172a'};
  }

  svg { width: 13px; height: 13px; stroke-width: 2; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 24px;
  color: ${p => p.theme.colors.textMuted};
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  svg { width: 20px; height: 20px; }
`;

const EmptyText = styled.p`
  font-size: 13px;
  margin: 0;
  color: #94a3b8;
`;

const SkeletonItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 10px 22px;
  align-items: center;
`;

const Skeleton = styled.div<{ $w: string; $h?: string }>`
  width: ${p => p.$w};
  height: ${p => p.$h ?? '12px'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatVisibilityLabel = (task: DashboardTask): string => {
  if (task.visibilityType === 'USERS') {
    const names = task.visibleToUserNames ?? [];
    if (names.length === 0) return 'Wybrane osoby';
    if (names.length <= 2) return names.join(', ');
    return `${names[0]} i ${names.length - 1} inne`;
  }
  if (task.visibilityType === 'ROLE') {
    return task.visibleToRoleName ? `Rola: ${task.visibleToRoleName}` : 'Wybrana rola';
  }
  return '';
};

const formatTaskDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return `dziś, ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `wczoraj, ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TasksPanel = () => {
  const { tasks, isLoading, createTask, updateTask, deleteTask, isDeleting } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DashboardTask | null>(null);

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: DashboardTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSave = async (payload: CreateTaskPayload) => {
    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await createTask(payload);
    }
  };

  const handleToggle = (task: DashboardTask) => {
    updateTask(task.id, { done: !task.done });
  };

  return (
    <>
      <Panel>
        <PanelHead>
          <PanelTitle>Do zrobienia</PanelTitle>
          <HeadActions>
            <ArchiveButton onClick={() => setArchiveOpen(true)}>
              <Archive />
              Archiwum
            </ArchiveButton>
            <AddButton onClick={openCreate}>
              <Plus />
              Dodaj
            </AddButton>
          </HeadActions>
        </PanelHead>

        {isLoading ? (
          <TaskList>
            {[80, 60, 70].map(w => (
              <SkeletonItem key={w}>
                <Skeleton $w="18px" $h="18px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton $w={`${w}%`} />
                  <Skeleton $w="40%" />
                </div>
              </SkeletonItem>
            ))}
          </TaskList>
        ) : tasks.length === 0 ? (
          <EmptyState>
            <EmptyIcon><ClipboardList /></EmptyIcon>
            <EmptyText>Brak zadań. Dodaj pierwsze!</EmptyText>
          </EmptyState>
        ) : (
          <TaskList>
            {tasks.map(task => (
              <TaskItem key={task.id}>
                <Checkbox
                  $done={task.done}
                  onClick={() => handleToggle(task)}
                  data-done={task.done}
                  title={task.done ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}
                >
                  {task.done && <Check />}
                </Checkbox>
                <TaskContent>
                  <TaskTitle $done={task.done}>{task.title}</TaskTitle>
                  {task.meta && <TaskMeta>{task.meta}</TaskMeta>}
                  {(task.createdByUserName || task.createdAt) && (
                    <TaskCreator>
                      {task.createdByUserName ? `Dodał: ${task.createdByUserName}` : 'Dodano'}
                      {task.createdAt && ` · ${formatTaskDate(task.createdAt)}`}
                    </TaskCreator>
                  )}
                  {task.visibilityType === 'USERS' && (
                    <VisibilityBadge $type="USERS">
                      <Users />
                      {formatVisibilityLabel(task)}
                    </VisibilityBadge>
                  )}
                  {task.visibilityType === 'ROLE' && (
                    <VisibilityBadge $type="ROLE">
                      <ShieldCheck />
                      {formatVisibilityLabel(task)}
                    </VisibilityBadge>
                  )}
                </TaskContent>
                <TaskActions className="task-actions">
                  <ActionBtn onClick={() => openEdit(task)} title="Edytuj">
                    <Pencil />
                  </ActionBtn>
                  <ActionBtn
                    $danger
                    onClick={() => deleteTask(task.id)}
                    disabled={isDeleting}
                    title="Usuń"
                  >
                    <Trash2 />
                  </ActionBtn>
                </TaskActions>
              </TaskItem>
            ))}
          </TaskList>
        )}
      </Panel>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingTask={editingTask}
      />

      <TaskArchiveModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </>
  );
};
