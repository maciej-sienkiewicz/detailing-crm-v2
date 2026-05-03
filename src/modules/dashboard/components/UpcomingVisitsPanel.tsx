import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/common/utils/formatters';
import { useUpcomingVisits } from '../hooks/useUpcomingVisits';
import { useUpdateOperationTitle } from '@/modules/operations/hooks/useReservationActions';
import type { UpcomingVisit, VisitStatusKind } from '../types';

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<VisitStatusKind, { bg: string; color: string }> = {
  info:    { bg: 'rgba(59,130,246,0.12)',  color: '#1d4ed8' },
  warn:    { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  neutral: { bg: '#f1f5f9',               color: '#475569' },
  success: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  err:     { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
};

// ─── Styled ───────────────────────────────────────────────────────────────────

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

const VisitRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr auto auto;
  gap: 14px;
  padding: 13px 22px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 180ms ease;
  position: relative;
  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
  &:hover [data-pencil] { opacity: 1; }
`;

const VisitTime = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  line-height: 1.2;
`;

const VisitDateLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.colors.textMuted};
  display: block;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const VisitTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  margin: 0 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TitleEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
`;

const TitleInput = styled.input`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc;
  border: 1.5px solid rgba(59,130,246,0.45);
  border-radius: 5px;
  padding: 2px 6px;
  outline: none;
  min-width: 0;
  width: 160px;
  max-width: 100%;
  &:focus { border-color: rgba(59,130,246,0.8); }
`;

const TitleIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 140ms ease;
  svg { width: 11px; height: 11px; }
`;

const TitleSaveBtn = styled(TitleIconBtn)`
  color: #059669;
  border-color: rgba(16,185,129,0.3);
  background: rgba(16,185,129,0.08);
  &:hover { background: rgba(16,185,129,0.18); }
`;

const TitleCancelBtn = styled(TitleIconBtn)`
  color: #64748b;
  border-color: #e2e8f0;
  background: #f1f5f9;
  &:hover { color: #0f172a; }
`;

const PencilBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
  border-radius: 3px;
  padding: 0;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 140ms ease, color 140ms ease;
  svg { width: 11px; height: 11px; }
  &:hover { color: #475569; }
`;

const VisitMeta = styled.div`
  font-size: 11px;
  color: #64748b;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  svg { width: 12px; height: 12px; stroke-width: 2; flex-shrink: 0; }
`;

const StatusBadge = styled.span<{ $kind: VisitStatusKind }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 9999px;
  background: ${p => BADGE_CONFIG[p.$kind].bg};
  color: ${p => BADGE_CONFIG[p.$kind].color};
  white-space: nowrap;
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
`;

const VisitPrice = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  white-space: nowrap;
`;

// ─── Context menu ─────────────────────────────────────────────────────────────

const ContextMenu = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${p => p.$y}px;
  left: ${p => p.$x}px;
  z-index: 1000;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.08);
  min-width: 160px;
  padding: 4px 0;
  outline: none;
`;

const ContextMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  font-family: inherit;
  text-align: left;
  transition: background 120ms ease;
  &:hover { background: #f1f5f9; }
  svg { width: 14px; height: 14px; flex-shrink: 0; color: #64748b; }
`;

const ContextMenuDivider = styled.div`
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const Bone = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '13px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const SkeletonRow = () => (
  <VisitRow as="div" style={{ cursor: 'default' }}>
    <div><Bone $h="14px" $w="40px" /><Bone $h="10px" $w="28px" style={{ marginTop: 6 }} /></div>
    <div><Bone $h="13px" $w="70%" style={{ marginBottom: 6 }} /><Bone $h="11px" $w="50%" /></div>
    <Bone $h="22px" $w="72px" style={{ borderRadius: 99 }} />
    <Bone $h="14px" $w="64px" />
  </VisitRow>
);

// ─── Empty / Error ────────────────────────────────────────────────────────────

const Placeholder = styled.div`
  padding: 40px 22px;
  text-align: center;
  font-size: 14px;
  color: ${p => p.theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  svg { width: 20px; height: 20px; color: ${p => p.theme.colors.error}; }
`;

// ─── Row ──────────────────────────────────────────────────────────────────────

interface VisitRowItemProps {
  visit: UpcomingVisit;
  onRowClick: (visit: UpcomingVisit, e: React.MouseEvent) => void;
  onStartEdit: (visit: UpcomingVisit, e: React.MouseEvent) => void;
  isEditing: boolean;
  draftTitle: string;
  onDraftChange: (val: string) => void;
  onSave: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const VisitRowItem = ({
  visit,
  onRowClick,
  onStartEdit,
  isEditing,
  draftTitle,
  onDraftChange,
  onSave,
  onCancel,
  isSaving,
  inputRef,
}: VisitRowItemProps) => (
  <VisitRow onClick={e => !isEditing && onRowClick(visit, e)}>
    <VisitTime>
      {visit.time}
      <VisitDateLabel>{visit.dateLabel}</VisitDateLabel>
    </VisitTime>
    <div style={{ minWidth: 0 }}>
      {isEditing ? (
        <TitleEditRow>
          <TitleInput
            ref={inputRef}
            value={draftTitle}
            onChange={e => onDraftChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave(e as any);
              if (e.key === 'Escape') onCancel(e as any);
              e.stopPropagation();
            }}
            onClick={e => e.stopPropagation()}
            disabled={isSaving}
          />
          <TitleSaveBtn onClick={onSave} title="Zapisz tytuł" disabled={isSaving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </TitleSaveBtn>
          <TitleCancelBtn onClick={onCancel} title="Anuluj">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </TitleCancelBtn>
        </TitleEditRow>
      ) : (
        <TitleEditRow>
          <VisitTitle>{visit.serviceName}</VisitTitle>
          <PencilBtn
            data-pencil
            onClick={e => onStartEdit(visit, e)}
            title="Edytuj tytuł"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </PencilBtn>
        </TitleEditRow>
      )}
      <VisitMeta>
        <User />
        {visit.customerName} · {visit.vehicleName}
      </VisitMeta>
    </div>
    <StatusBadge $kind={visit.statusKind}>{visit.statusLabel}</StatusBadge>
    <VisitPrice>{formatCurrency(visit.price)}</VisitPrice>
  </VisitRow>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface ContextMenuState {
  visitId: string;
  x: number;
  y: number;
}

const VISIBLE_LIMIT = 10;

export const UpcomingVisitsPanel = () => {
  const navigate = useNavigate();
  const { data: visits = [], isLoading, isError } = useUpcomingVisits();
  const { updateOperationTitle, isUpdatingTitle, updatingId } = useUpdateOperationTitle();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) titleInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const visible = visits.slice(0, VISIBLE_LIMIT);
  const hasMore = visits.length > VISIBLE_LIMIT;

  const handleRowClick = (visit: UpcomingVisit, e: React.MouseEvent) => {
    if (visit.type === 'VISIT') {
      navigate(`/visits/${visit.id}`);
      return;
    }
    // RESERVATION — show context menu
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = e.clientY;
    setContextMenu({ visitId: visit.id, x, y });
  };

  const closeMenu = () => setContextMenu(null);

  const handleMenuEdit = () => {
    if (!contextMenu) return;
    closeMenu();
    navigate(`/appointments/${contextMenu.visitId}/edit`);
  };

  const handleMenuStart = () => {
    if (!contextMenu) return;
    closeMenu();
    navigate(`/reservations/${contextMenu.visitId}/checkin`);
  };

  const handleStartEdit = (visit: UpcomingVisit, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraftTitle(visit.serviceName);
    setEditingId(visit.id);
  };

  const handleSave = async (visit: UpcomingVisit, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await updateOperationTitle({ id: visit.id, type: visit.type, title: draftTitle.trim() });
    setEditingId(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Najbliższe wizyty</PanelTitle>
        <PanelLink onClick={() => navigate('/calendar')}>
          Pokaż w kalendarzu <ArrowRight />
        </PanelLink>
      </PanelHead>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <Placeholder>
          <AlertCircle />
          Nie udało się załadować wizyt
        </Placeholder>
      )}

      {!isLoading && !isError && visits.length === 0 && (
        <Placeholder>Brak zaplanowanych wizyt w najbliższym czasie</Placeholder>
      )}

      {!isLoading && !isError && visible.map(v => (
        <VisitRowItem
          key={v.id}
          visit={v}
          onRowClick={handleRowClick}
          onStartEdit={handleStartEdit}
          isEditing={editingId === v.id}
          draftTitle={draftTitle}
          onDraftChange={setDraftTitle}
          onSave={e => handleSave(v, e)}
          onCancel={handleCancel}
          isSaving={isUpdatingTitle && updatingId === v.id}
          inputRef={titleInputRef}
        />
      ))}

      {!isLoading && !isError && hasMore && (
        <PanelLink
          onClick={() => navigate('/calendar')}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 22px' }}
        >
          Pokaż wszystkie ({visits.length}) <ArrowRight />
        </PanelLink>
      )}

      {contextMenu && createPortal(
        <ContextMenu
          ref={menuRef}
          $x={contextMenu.x}
          $y={contextMenu.y}
          onMouseDown={e => e.stopPropagation()}
        >
          <ContextMenuItem onClick={handleMenuEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edytuj
          </ContextMenuItem>
          <ContextMenuDivider />
          <ContextMenuItem onClick={handleMenuStart}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Rozpocznij
          </ContextMenuItem>
        </ContextMenu>,
        document.body,
      )}
    </Panel>
  );
};
