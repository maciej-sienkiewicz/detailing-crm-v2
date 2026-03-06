import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// ─── Styled components — mirrors BrandModelSelectors visual language ───────────

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

const PortalMenu = styled.div`
  position: fixed;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  box-shadow: ${(p) => p.theme.shadows.lg};
  padding: ${(p) => p.theme.spacing.xs} 0;
  z-index: 2001;
  max-height: 300px;
  overflow-y: auto;
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
  placeholder = 'Wybierz…',
  disabled = false,
  nullable = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = !!value;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 200);
    // Prevent overflow on the right edge
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    setMenuStyle({ top: rect.bottom + 4, left, width: menuWidth });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
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

      {open && menuStyle &&
        createPortal(
          <PortalMenu
            ref={menuRef}
            role="listbox"
            style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
          >
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
          </PortalMenu>,
          document.body
        )}
    </DropdownContainer>
  );
};
