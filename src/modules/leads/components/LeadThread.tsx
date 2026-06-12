// src/modules/leads/components/LeadThread.tsx
import React, { useState, useRef, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  MessageSquare,
  History,
  Send,
  Edit3,
  Trash2,
  X,
  Check,
  ArrowRight,
  Clock,
  UserCheck,
  User,
  AlertCircle,
  FileText,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/core';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useLeadComments,
  useAddComment,
  useEditComment,
  useDeleteComment,
  useLeadStatusHistory,
} from '../hooks';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';
import type { LeadId, LeadHistoryAction, LeadStatus, FieldChange } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${st.border};
  gap: 0;
  margin-bottom: 16px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${p => p.$active ? 700 : 500};
  color: ${p => p.$active ? '#0ea5e9' : st.textSecondary};
  border-bottom: 2px solid ${p => p.$active ? '#0ea5e9' : 'transparent'};
  margin-bottom: -1px;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;

  &:hover { color: #0ea5e9; }
  svg { width: 13px; height: 13px; }
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 10px;
  font-weight: 700;
`;

// ─── Comment thread ────────────────────────────────────────────────────────────

const Thread = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 2px;
  margin-bottom: 12px;
`;

const CommentBubble = styled.div<{ $own: boolean }>`
  display: flex;
  gap: 10px;
  animation: ${fadeIn} 180ms ease both;
  ${p => p.$own && css`flex-direction: row-reverse;`}
`;

const CommentAvatar = styled.div<{ $own: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${p => p.$own ? '#dbeafe' : '#f1f5f9'};
  color: ${p => p.$own ? '#1d4ed8' : '#64748b'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  margin-top: 2px;
`;

const CommentBody = styled.div<{ $own: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: ${p => p.$own ? 'flex-end' : 'flex-start'};
`;

const CommentMeta = styled.div<{ $own: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-direction: ${p => p.$own ? 'row-reverse' : 'row'};
`;

const CommentAuthor = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${st.text};
`;

const CommentTime = styled.span`
  font-size: 10px;
  color: ${st.textMuted};
`;

const CommentEdited = styled.span`
  font-size: 10px;
  color: ${st.textMuted};
  font-style: italic;
`;

const Bubble = styled.div<{ $own: boolean }>`
  padding: 8px 12px;
  border-radius: ${p => p.$own ? '12px 4px 12px 12px' : '4px 12px 12px 12px'};
  background: ${p => p.$own ? '#eff6ff' : '#f8fafc'};
  border: 1px solid ${p => p.$own ? '#bfdbfe' : st.border};
  font-size: 13px;
  color: ${st.text};
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 85%;
`;

const BubbleActions = styled.div<{ $own: boolean }>`
  display: flex;
  gap: 2px;
  flex-direction: ${p => p.$own ? 'row-reverse' : 'row'};
  opacity: 0;
  transition: opacity 150ms;

  ${CommentBubble}:hover & { opacity: 1; }
`;

const MicroBtn = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  padding: 3px 5px;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  gap: 3px;
  transition: all 150ms;
  color: ${p => p.$danger ? '#dc2626' : st.textMuted};

  &:hover {
    background: ${p => p.$danger ? '#fee2e2' : '#f1f5f9'};
    color: ${p => p.$danger ? '#dc2626' : st.text};
  }

  svg { width: 11px; height: 11px; }
`;

const EditBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 85%;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid #0ea5e9;
  border-radius: 10px;
  background: #fff;
  color: ${st.text};
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  line-height: 1.55;
`;

const EditActions = styled.div`
  display: flex;
  gap: 4px;
`;

const MicroSaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 150ms;
  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  svg { width: 11px; height: 11px; }
`;

const MicroCancelBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid ${st.border};
  color: ${st.textMuted};
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms;
  &:hover { background: #f1f5f9; color: ${st.text}; }
  svg { width: 11px; height: 11px; }
`;

const EmptyThread = styled.div`
  padding: 28px 16px;
  text-align: center;
  color: ${st.textMuted};
  font-size: 13px;
  font-style: italic;
`;

// ─── New comment composer ─────────────────────────────────────────────────────

const Composer = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 8px;
  border-top: 1px solid ${st.border};
`;

const ComposerTextarea = styled.textarea`
  flex: 1;
  min-height: 38px;
  max-height: 140px;
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 12px;
  background: #f8fafc;
  color: ${st.text};
  resize: none;
  outline: none;
  line-height: 1.5;
  transition: border-color 150ms, background 150ms;
  overflow-y: auto;

  &:focus {
    border-color: #0ea5e9;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
  &::placeholder { color: ${st.textMuted}; }
`;

const SendBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: #0ea5e9;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms, opacity 150ms;

  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  svg { width: 15px; height: 15px; }
`;

const SkeletonPulse = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '13px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Comment single item ──────────────────────────────────────────────────────

interface CommentItemProps {
  comment: import('../types').LeadCommentDto;
  currentUserId: string;
  leadId: LeadId;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUserId, leadId }) => {
  const isOwn = comment.createdBy === currentUserId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const editMutation = useEditComment(leadId);
  const deleteMutation = useDeleteComment(leadId);

  const initials = comment.createdByName
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveEdit = () => {
    if (!draft.trim()) return;
    editMutation.mutate(
      { commentId: comment.id, req: { content: draft.trim() } },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit();
    if (e.key === 'Escape') { setDraft(comment.content); setEditing(false); }
  };

  return (
    <CommentBubble $own={isOwn}>
      <CommentAvatar $own={isOwn}>{initials}</CommentAvatar>
      <CommentBody $own={isOwn}>
        <CommentMeta $own={isOwn}>
          <CommentAuthor>{comment.createdByName}</CommentAuthor>
          <CommentTime title={formatDateTime(comment.createdAt)}>
            {formatRelativeTime(comment.createdAt)}
          </CommentTime>
          {comment.updatedAt && (
            <CommentEdited>(edytowano)</CommentEdited>
          )}
        </CommentMeta>

        {editing ? (
          <EditBox>
            <EditTextarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={5000}
            />
            <EditActions>
              <MicroSaveBtn
                onClick={handleSaveEdit}
                disabled={editMutation.isPending || !draft.trim()}
              >
                <Check /> Zapisz
              </MicroSaveBtn>
              <MicroCancelBtn onClick={() => { setDraft(comment.content); setEditing(false); }}>
                <X /> Anuluj
              </MicroCancelBtn>
            </EditActions>
          </EditBox>
        ) : (
          <>
            <Bubble $own={isOwn}>{comment.content}</Bubble>
            <BubbleActions $own={isOwn}>
              <MicroBtn onClick={() => setEditing(true)}>
                <Edit3 /> Edytuj
              </MicroBtn>
              <MicroBtn
                $danger
                onClick={() => deleteMutation.mutate(comment.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 /> Usuń
              </MicroBtn>
            </BubbleActions>
          </>
        )}
      </CommentBody>
    </CommentBubble>
  );
};

// ─── Comments tab ─────────────────────────────────────────────────────────────

interface CommentsTabProps {
  leadId: LeadId;
  currentUserId: string;
}

const CommentsTab: React.FC<CommentsTabProps> = ({ leadId, currentUserId }) => {
  const { comments, isLoading } = useLeadComments(leadId);
  const addComment = useAddComment(leadId);
  const [draft, setDraft] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addComment.mutate(
      { content: trimmed },
      { onSuccess: () => setDraft('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  };

  return (
    <>
      <Thread ref={threadRef}>
        {isLoading ? (
          <>
            <SkeletonPulse $h="60px" />
            <SkeletonPulse $h="44px" $w="70%" style={{ alignSelf: 'flex-end' }} />
            <SkeletonPulse $h="52px" $w="80%" />
          </>
        ) : comments.length === 0 ? (
          <EmptyThread>Brak komentarzy — zacznij wewnętrzną rozmowę o tym leadzie</EmptyThread>
        ) : (
          comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              leadId={leadId}
            />
          ))
        )}
      </Thread>

      <Composer>
        <ComposerTextarea
          placeholder="Napisz notatkę lub komentarz… (Ctrl+Enter aby wysłać)"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={5000}
          rows={1}
        />
        <SendBtn
          onClick={handleSend}
          disabled={!draft.trim() || addComment.isPending}
          title="Wyślij (Ctrl+Enter)"
        >
          <Send />
        </SendBtn>
      </Composer>
    </>
  );
};

// ─── Status history tab ───────────────────────────────────────────────────────

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 2px;
`;

const TimelineEntry = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
  padding-bottom: 16px;
  animation: ${fadeIn} 180ms ease both;

  &:last-child { padding-bottom: 0; }
  &:last-child .tl-line { display: none; }
`;

const TlDot = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${p => p.$color}18;
  border: 2px solid ${p => p.$color}44;
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  svg { width: 12px; height: 12px; }
`;

const TlLine = styled.div.attrs({ className: 'tl-line' })`
  position: absolute;
  left: 13px;
  top: 30px;
  bottom: 0;
  width: 2px;
  background: ${st.border};
`;

const TlContent = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 4px;
`;

const TlAction = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const TlMeta = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatusPill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 9999px;
  background: ${p => p.$color}18;
  color: ${p => p.$color};
  font-size: 10px;
  font-weight: 700;
`;

const StatusChange = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const ChangeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 5px;
`;

const ChangeRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11px;
  color: ${st.textSecondary};
  line-height: 1.4;
`;

const ChangeField = styled.span`
  font-weight: 700;
  color: ${st.textMuted};
  flex-shrink: 0;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.04em;
  padding-top: 1px;
`;

const ChangeValue = styled.span<{ $dim?: boolean }>`
  color: ${p => p.$dim ? st.textMuted : st.text};
  font-style: ${p => p.$dim ? 'italic' : 'normal'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
`;

const ChangeArrow = styled.span`
  color: ${st.textMuted};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  svg { width: 10px; height: 10px; }
`;

const ACTION_LABELS: Record<LeadHistoryAction, string> = {
  CREATE:                      'Lead utworzony',
  STATUS_CHANGE:               'Zmiana statusu',
  LEAD_CONFIRMED:              'Rezerwacja potwierdzona',
  LEAD_COMPLETED:              'Wizyta zrealizowana',
  LEAD_LOST:                   'Lead utracony',
  LEAD_NO_SHOW:                'Klient się nie pojawił',
  LEAD_APPOINTMENT_CREATED:    'Wizyta umówiona',
  LEAD_CONVERTED:              'Lead skonwertowany',
  LEAD_ABANDONED:              'Lead porzucony',
  LEAD_USER_ASSIGNED:          'Przypisanie pracownika',
  LEAD_CUSTOMER_ASSIGNED:      'Przypisanie klienta',
  LEAD_LOST_REASON_UPDATED:    'Zmiana powodu utraty',
  LEAD_QUOTE_UPDATED:          'Aktualizacja kosztorysu',
  LEAD_COMMENT_UPDATED:        'Edycja komentarza',
};

const STATUS_COLORS: Partial<Record<LeadStatus, string>> = {
  NEW:         '#dc2626',
  IN_PROGRESS: '#1e40af',
  CONFIRMED:   '#166534',
  COMPLETED:   '#065f46',
  LOST:        '#4b5563',
  NO_SHOW:     '#92400e',
};

const STATUS_LABELS: Partial<Record<LeadStatus, string>> = {
  NEW:         'Nowy',
  IN_PROGRESS: 'W kontakcie',
  CONFIRMED:   'Zarezerwowany',
  COMPLETED:   'Zakończony',
  LOST:        'Utracony',
  NO_SHOW:     'Porzucony',
};

const ACTION_COLOR: Record<LeadHistoryAction, string> = {
  CREATE:                      '#6366f1',
  STATUS_CHANGE:               '#0ea5e9',
  LEAD_CONFIRMED:              '#16a34a',
  LEAD_COMPLETED:              '#059669',
  LEAD_LOST:                   '#64748b',
  LEAD_NO_SHOW:                '#92400e',
  LEAD_APPOINTMENT_CREATED:    '#0284c7',
  LEAD_CONVERTED:              '#10b981',
  LEAD_ABANDONED:              '#dc2626',
  LEAD_USER_ASSIGNED:          '#7c3aed',
  LEAD_CUSTOMER_ASSIGNED:      '#0891b2',
  LEAD_LOST_REASON_UPDATED:    '#b45309',
  LEAD_QUOTE_UPDATED:          '#0ea5e9',
  LEAD_COMMENT_UPDATED:        '#64748b',
};

// Maps each action to a lucide icon component
const ACTION_ICON: Record<LeadHistoryAction, React.FC<{ size?: number }>> = {
  CREATE:                      Clock,
  STATUS_CHANGE:               ArrowRight,
  LEAD_CONFIRMED:              Check,
  LEAD_COMPLETED:              Check,
  LEAD_LOST:                   X,
  LEAD_NO_SHOW:                AlertCircle,
  LEAD_APPOINTMENT_CREATED:    Clock,
  LEAD_CONVERTED:              Check,
  LEAD_ABANDONED:              X,
  LEAD_USER_ASSIGNED:          UserCheck,
  LEAD_CUSTOMER_ASSIGNED:      User,
  LEAD_LOST_REASON_UPDATED:    AlertCircle,
  LEAD_QUOTE_UPDATED:          FileText,
  LEAD_COMMENT_UPDATED:        MessageCircle,
};

const FIELD_LABELS: Record<string, string> = {
  assignedUserName:  'Pracownik',
  assignedUserId:    'Pracownik',
  customerName:      'Klient',
  customerId:        'Klient',
  lostReason:        'Powód utraty',
  content:           'Treść',
  quote:             'Kosztorys',
  totalGross:        'Wartość brutto',
};

const truncate = (s: string | null, max = 60): string => {
  if (!s) return '(brak)';
  return s.length > max ? s.slice(0, max) + '…' : s;
};

interface HistoryTabProps {
  leadId: LeadId;
}

const renderChanges = (changes: FieldChange[] | undefined, action: LeadHistoryAction) => {
  if (!changes?.length) return null;

  return (
    <ChangeList>
      {changes.map((c, i) => {
        const label = FIELD_LABELS[c.field] ?? c.field;

        // LEAD_QUOTE_UPDATED — changes likely has a single entry with serialized items
        if (action === 'LEAD_QUOTE_UPDATED') {
          return (
            <ChangeRow key={i}>
              <ChangeField>Kosztorys</ChangeField>
              <ChangeValue title={c.newValue ?? undefined}>
                {truncate(c.newValue, 80)}
              </ChangeValue>
            </ChangeRow>
          );
        }

        return (
          <ChangeRow key={i}>
            <ChangeField>{label}</ChangeField>
            {c.oldValue !== null && (
              <>
                <ChangeValue $dim title={c.oldValue}>{truncate(c.oldValue)}</ChangeValue>
                <ChangeArrow><ChevronRight /></ChangeArrow>
              </>
            )}
            <ChangeValue title={c.newValue ?? undefined}>
              {c.newValue !== null ? truncate(c.newValue) : '(usunięto)'}
            </ChangeValue>
          </ChangeRow>
        );
      })}
    </ChangeList>
  );
};

const HistoryTab: React.FC<HistoryTabProps> = ({ leadId }) => {
  const { history, isLoading } = useLeadStatusHistory(leadId);

  const renderStatusPill = (status: LeadStatus | null) => {
    if (!status) return null;
    const color = STATUS_COLORS[status] ?? '#64748b';
    const label = STATUS_LABELS[status] ?? status;
    return <StatusPill $color={color}>{label}</StatusPill>;
  };

  return (
    <Timeline>
      {isLoading ? (
        <>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
              <SkeletonPulse $w="28px" $h="28px" style={{ borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                <SkeletonPulse $w="55%" />
                <SkeletonPulse $w="40%" $h="11px" />
              </div>
            </div>
          ))}
        </>
      ) : history.length === 0 ? (
        <EmptyThread>Brak historii zmian dla tego leada</EmptyThread>
      ) : (
        history.map((entry, i) => {
          const color = ACTION_COLOR[entry.action] ?? '#0ea5e9';
          const Icon = ACTION_ICON[entry.action] ?? Clock;
          return (
            <TimelineEntry key={i}>
              <TlLine />
              <TlDot $color={color}>
                <Icon size={12} />
              </TlDot>
              <TlContent>
                <TlAction>{ACTION_LABELS[entry.action] ?? entry.action}</TlAction>

                {/* Status change pills */}
                {entry.fromStatus !== null && entry.toStatus !== null && (
                  <StatusChange>
                    {renderStatusPill(entry.fromStatus)}
                    <ArrowRight size={11} style={{ color: st.textMuted, flexShrink: 0 }} />
                    {renderStatusPill(entry.toStatus)}
                  </StatusChange>
                )}

                {/* Field-level changes */}
                {renderChanges(entry.changes, entry.action)}

                <TlMeta>
                  <span title={formatDateTime(entry.changedAt)}>
                    {formatRelativeTime(entry.changedAt)}
                  </span>
                  {entry.changedByName && (
                    <>
                      <span>·</span>
                      <span>{entry.changedByName}</span>
                    </>
                  )}
                </TlMeta>
              </TlContent>
            </TimelineEntry>
          );
        })
      )}
    </Timeline>
  );
};

// ─── Exported LeadThread component ───────────────────────────────────────────

interface LeadThreadProps {
  leadId: LeadId;
}

type ThreadTab = 'comments' | 'history';

export const LeadThread: React.FC<LeadThreadProps> = ({ leadId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ThreadTab>('comments');
  const { comments } = useLeadComments(leadId);
  const { history } = useLeadStatusHistory(leadId);

  return (
    <Root>
      <TabBar>
        <Tab $active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
          <MessageSquare />
          Komentarze
          {comments.length > 0 && <CountBadge>{comments.length}</CountBadge>}
        </Tab>
        <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          <History />
          Historia
          {history.length > 0 && <CountBadge>{history.length}</CountBadge>}
        </Tab>
      </TabBar>

      {activeTab === 'comments' && (
        <CommentsTab leadId={leadId} currentUserId={user?.userId ?? ''} />
      )}
      {activeTab === 'history' && (
        <HistoryTab leadId={leadId} />
      )}
    </Root>
  );
};
