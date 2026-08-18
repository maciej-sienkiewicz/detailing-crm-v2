import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { EmptyState } from '@/common/components/EmptyState';
import { formatDateTime } from '@/common/utils';
import { useMarkMyTasksRead, useMyTasks, useSetMyTaskDone } from '../hooks/useMyTasks';
import type { MyTask } from '../api/myTasksApi';

const Container = styled.div`
    max-width: 720px;
    margin: 0 auto;
    padding: ${p => p.theme.spacing.lg} ${p => p.theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.md};
`;

const Title = styled.h1`
    font-size: ${p => p.theme.fontSizes.xl};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    margin: 0;
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.sm};
`;

const Row = styled.li<{ $unread: boolean; $done: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: ${p => p.theme.spacing.md};
    padding: ${p => p.theme.spacing.md};
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => (p.$unread ? p.theme.colors.primary : p.theme.colors.border)};
    border-radius: ${p => p.theme.radii.md};
    opacity: ${p => (p.$done ? 0.55 : 1)};
`;

const Checkbox = styled.input`
    margin-top: 3px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: ${p => p.theme.colors.primary};
`;

const Body = styled.div`
    flex: 1;
    min-width: 0;
`;

const TaskTitle = styled.div<{ $done: boolean }>`
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};
    text-decoration: ${p => (p.$done ? 'line-through' : 'none')};
    overflow-wrap: anywhere;
`;

const TaskMeta = styled.div`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;
    overflow-wrap: anywhere;
`;

const TaskFooter = styled.div`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    margin-top: ${p => p.theme.spacing.xs};
`;

const UnreadDot = styled.span`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-top: 8px;
    border-radius: 50%;
    background: ${p => p.theme.colors.primary};
`;

/**
 * "Powiadomienia": the task inbox for roles without dashboard access. Shows
 * every task visible to the user (assigned to them, their role, or everyone),
 * lets them tick tasks off, and marks everything as read on entry (clearing
 * the sidebar badge).
 */
export function NotificationsView() {
    const { data: tasks, isLoading } = useMyTasks();
    const markRead = useMarkMyTasksRead();
    const setDone = useSetMyTaskDone();

    // Opening the view acknowledges everything currently visible.
    useEffect(() => {
        if (tasks) markRead.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks !== undefined]);

    const sorted = useMemo(
        () => (tasks ? [...tasks].sort((a, b) => Number(a.done) - Number(b.done)) : []),
        [tasks],
    );

    return (
        <Container>
            <Title>Powiadomienia</Title>
            {!isLoading && sorted.length === 0 && (
                <EmptyState
                    icon="🔔"
                    title="Brak powiadomień"
                    description="Zadania przypisane do Ciebie pojawią się w tym miejscu."
                />
            )}
            <List>
                {sorted.map((task: MyTask) => (
                    <Row key={task.id} $unread={task.unread && !task.done} $done={task.done}>
                        <Checkbox
                            type="checkbox"
                            checked={task.done}
                            onChange={() => setDone.mutate({ taskId: task.id, done: !task.done })}
                            aria-label={task.done ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}
                        />
                        <Body>
                            <TaskTitle $done={task.done}>{task.title}</TaskTitle>
                            {task.meta && <TaskMeta>{task.meta}</TaskMeta>}
                            <TaskFooter>
                                {task.createdByUserName ? `${task.createdByUserName} · ` : ''}
                                {formatDateTime(task.createdAt)}
                            </TaskFooter>
                        </Body>
                        {task.unread && !task.done && <UnreadDot aria-label="Nieprzeczytane" />}
                    </Row>
                ))}
            </List>
        </Container>
    );
}
