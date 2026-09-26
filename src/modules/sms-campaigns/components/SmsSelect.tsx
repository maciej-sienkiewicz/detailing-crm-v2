import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';

// ─── Styled components (mirrors BrandModelSelectors visual language) ───────────

const DropdownContainer = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $disabled?: boolean; $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.sm};
  padding: 9px 12px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: #F8FAFC;
  color: ${(p) => p.theme.colors.text};
  font-size: ${(p) => p.theme.fontSizes.sm};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.6 : 1)};
  transition: all ${(p) => p.theme.transitions.fast};
  font-weight: ${(p) => p.theme.fontWeights.normal};
  text-align: left;

  &:hover:not([disabled]) {
    background: #FFFFFF;
    border-color: ${(p) => p.theme.colors.primary};
  }

  &:focus {
    outline: none;
    background: #FFFFFF;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
`;

const TriggerLabel = styled.span<{ $placeholder?: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => p.$placeholder ? p.theme.colors.textMuted : p.theme.colors.text};
`;

const Caret = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  border: solid ${(p) => p.theme.colors.textMuted};
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
  transform: rotate(45deg);
  position: relative;
  top: -2px;
`;

// Pozycję i wysokość ustawia useFloatingPanel: lista przechodzi nad pole, gdy pod nim
// brakuje miejsca, i trzyma się ekranu z obu stron (wcześniej zawsze stała pod polem
// i pilnowała tylko prawej krawędzi). Limit 300 px siedzi na wewnętrznej liście - na
// panelu nadpisałby go limit z pomiaru i lista otwarta nad polem rosłaby w dół, na pole.
const PortalMenu = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  visibility: hidden;
  min-width: 200px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  box-shadow: ${(p) => p.theme.shadows.lg};
  z-index: 2001;
  overflow-x: hidden;
  overscroll-behavior: contain;
`;

const MenuList = styled.div`
  padding: ${(p) => p.theme.spacing.xs} 0;
  max-height: 300px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const MenuItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.md};
  padding: 10px 14px;
  background: ${(p) => (p.$selected ? p.theme.colors.surfaceAlt ?? '#F1F5F9' : 'transparent')};
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => (p.$selected ? p.theme.fontWeights.semibold : p.theme.fontWeights.normal)};
  color: ${(p) => p.theme.colors.text};
  transition: background 120ms ease;

  &:hover {
    background: ${(p) => p.theme.colors.surfaceHover ?? '#F8FAFC'};
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SmsSelectOption {
  value: string;
  label: string;
  prefix?: React.ReactNode; // optional icon/color dot before label
}

interface SmsSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SmsSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** If true, the first option acts as "no selection" / clear (shown when value is '') */
  nullable?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SmsSelect: React.FC<SmsSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Wybierz...',
  disabled = false,
  nullable = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = !!value;

  // Lista ma szerokość pola (co najmniej 200 px z CSS). Efekt stoi PRZED
  // useFloatingPanel: pozycję liczy się z szerokości panelu, więc najpierw szerokość,
  // potem pomiar (także przy resize - nasłuch zarejestrowany wcześniej odpala się wcześniej).
  useLayoutEffect(() => {
    if (!open) return;
    const syncWidth = () => {
      if (menuRef.current && triggerRef.current) menuRef.current.style.width = `${triggerRef.current.offsetWidth}px`;
    };
    syncWidth();
    window.addEventListener('resize', syncWidth);
    return () => window.removeEventListener('resize', syncWidth);
  }, [open]);
  useFloatingPanel(open, triggerRef, menuRef, { align: 'left', offset: 4 }, options.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <DropdownContainer ref={containerRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        $disabled={disabled}
        $hasValue={hasValue}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedOption?.prefix}
        <TriggerLabel $placeholder={!hasValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </TriggerLabel>
        <Caret />
      </Trigger>

      {open &&
        createPortal(
          <PortalMenu ref={menuRef}>
            <MenuList role="listbox">
              {nullable && (
                <MenuItem
                  type="button"
                  $selected={!value}
                  onClick={() => handleSelect('')}
                >
                  {placeholder}
                </MenuItem>
              )}
              {options.map((opt) => (
                <MenuItem
                  key={opt.value}
                  type="button"
                  $selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.prefix}
                  {opt.label}
                </MenuItem>
              ))}
            </MenuList>
          </PortalMenu>,
          document.body
        )}
    </DropdownContainer>
  );
};
