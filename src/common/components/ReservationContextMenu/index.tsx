import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Menu = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: fixed;
  top: ${p => p.$y}px;
  left: ${p => p.$x}px;
  z-index: 1200;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.08);
  min-width: 160px;
  padding: 4px 0;
  visibility: ${p => p.$visible ? 'visible' : 'hidden'};
`;

const MenuItem = styled.button`
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

const Divider = styled.div`
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservationContextMenuProps {
  appointmentId: string;
  x: number;
  y: number;
  onClose: () => void;
  onShowInCalendar?: () => void;
  /** When true, shows "Otwórz wizytę" instead of "Edytuj" and "Rozpocznij" */
  visitOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ReservationContextMenu = ({ appointmentId, x, y, onClose, onShowInCalendar, visitOnly }: ReservationContextMenuProps) => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, visible: false });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth, offsetHeight } = menuRef.current;
    const safeX = Math.min(x, window.innerWidth - offsetWidth - 4);
    const safeY = y + offsetHeight > window.innerHeight ? y - offsetHeight : y;
    setPos({ x: safeX, y: safeY, visible: true });
  }, [x, y]);

  const handleEdit = () => {
    onClose();
    navigate(`/appointments/${appointmentId}/edit`);
  };

  const handleStart = () => {
    onClose();
    navigate(`/reservations/${appointmentId}/checkin`);
  };

  const handleOpenVisit = () => {
    onClose();
    navigate(`/visits/${appointmentId}`);
  };

  const handleShowInCalendar = () => {
    onClose();
    onShowInCalendar?.();
  };

  return createPortal(
    <Menu ref={menuRef} $x={pos.x} $y={pos.y} $visible={pos.visible} onMouseDown={e => e.stopPropagation()}>
      {visitOnly ? (
        <MenuItem onClick={handleOpenVisit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Otwórz wizytę
        </MenuItem>
      ) : (
        <>
          <MenuItem onClick={handleEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edytuj
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleStart}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Rozpocznij
          </MenuItem>
        </>
      )}
      {onShowInCalendar && (
        <>
          {!visitOnly && <Divider />}
          <MenuItem onClick={handleShowInCalendar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Pokaż w kalendarzu
          </MenuItem>
        </>
      )}
    </Menu>,
    document.body,
  );
};
