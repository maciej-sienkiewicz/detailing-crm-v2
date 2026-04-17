import { useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, Check } from 'lucide-react';
import type { DashboardTask } from '../types';

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

const PanelLink = styled.button`
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-family: inherit;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.75; }
  svg { width: 14px; height: 14px; stroke-width: 2; }
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

  &:hover { background: #f8fafc; }
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

const TaskContent = styled.div``;

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

// ─── Component ────────────────────────────────────────────────────────────────

interface TasksPanelProps {
  tasks: DashboardTask[];
}

export const TasksPanel = ({ tasks }: TasksPanelProps) => {
  const [doneIds, setDoneIds] = useState<Set<string>>(
    () => new Set(tasks.filter(t => t.done).map(t => t.id))
  );

  const toggle = (id: string) =>
    setDoneIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Do zrobienia</PanelTitle>
        <PanelLink>
          Wszystkie <ArrowRight />
        </PanelLink>
      </PanelHead>

      <TaskList>
        {tasks.map(task => {
          const done = doneIds.has(task.id);
          return (
            <TaskItem key={task.id}>
              <Checkbox $done={done} onClick={() => toggle(task.id)} data-done={done}>
                {done && <Check />}
              </Checkbox>
              <TaskContent>
                <TaskTitle $done={done}>{task.title}</TaskTitle>
                <TaskMeta>{task.meta}</TaskMeta>
              </TaskContent>
            </TaskItem>
          );
        })}
      </TaskList>
    </Panel>
  );
};
