// src/modules/vehicles/components/BrandModelSelectors.tsx
import { useMemo, useRef, useState, useEffect, type RefObject } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { useBreakpoint, useVisualViewportSheet } from '@/common/hooks';
import { useVehicleMetadata } from '../hooks/useVehicleMetadata';

// Reuse ColorDropdown-like styling
const DropdownContainer = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $disabled?: boolean; $compact?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all ${props => props.theme.transitions.fast};
  font-weight: ${props => props.theme.fontWeights.normal};

  ${props => props.$compact ? `
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: #0f172a;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.4;
    &:focus { outline: none; }
  ` : `
    padding: 9px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #F8FAFC;
    color: #0f172a;
    font-size: 14px;
    &:hover:not(:disabled) {
      border-color: #cbd5e1;
      background: #ffffff;
    }
    &:focus {
      outline: none;
      background: #ffffff;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
  `}
`;

const Caret = styled.span`
  margin-left: auto;
  border: solid ${props => props.theme.colors.textMuted};
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
  transform: rotate(45deg);
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  padding: ${props => props.theme.spacing.xs} 0;
  z-index: 20;
  max-height: 320px;
  overflow: auto;
`;

// Portal-based menu to escape clipping by modal scroll containers
const PortalMenu = styled.div`
  position: fixed;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: 2001;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const PortalMenuList = styled.div`
  overflow-y: auto;
  flex: 1;
  padding: 0 0 4px;
`;

const PortalMenuDoneBar = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 8px 10px;
  flex-shrink: 0;
`;

const PortalMenuDoneBtn = styled.button`
  width: 100%;
  padding: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    border-color: #0ea5e9;
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.06);
  }
`;

const MenuItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  padding: 10px 14px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: ${props => props.theme.fontSizes.md};

  ${props => props.$selected ? `
    background: ${props.theme.colors.surfaceAlt};
    font-weight: ${props.theme.fontWeights.semibold};
  ` : ''}

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const Placeholder = styled.span<{ $compact?: boolean }>`
  color: ${props => props.$compact ? '#c8d4e0' : props.theme.colors.textMuted};
`;

const SearchContainer = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  background: ${props => props.theme.colors.surface};
  padding: 8px 10px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  font-size: ${props => props.theme.fontSizes.sm};
  outline: none;
  transition: all ${props => props.theme.transitions.fast};

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
`;

const EmptyState = styled.div`
  padding: 12px 14px;
  color: ${props => props.theme.colors.textMuted};
  font-size: ${props => props.theme.fontSizes.sm};
`;

/* ─── Mobile full-screen sheet ─────────────────────────────────────────────── */
/*
 * An anchored popover cannot work on a phone: the field sits mid-form, so once
 * the keyboard opens iOS scrolls the visual viewport and the `position: fixed`
 * menu (anchored to layout-viewport coordinates) drifts off screen, taking
 * the search field with it. A sheet locked to the visible region avoids the
 * whole class of problem, and matches the customer/service pickers.
 */

const SheetBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.45);
`;

const Sheet = styled.div`
  position: fixed;
  /* Fallback for browsers without visualViewport; useVisualViewportSheet
     overrides top/height at runtime so the sheet tracks the visible region
     between the top of the screen and the keyboard. */
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #ffffff;
  box-shadow: 0 -6px 30px -4px rgba(0, 0, 0, 0.18);
  /* 0 in Safari; only bites as an installed PWA, where the sheet reaches the
     status bar. */
  padding-top: env(safe-area-inset-top);
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 4px 8px 4px 20px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`;

const SheetClose = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 140ms, color 140ms;

  svg { width: 20px; height: 20px; }

  &:active {
    background: #f1f5f9;
    color: #0f172a;
  }
`;

const SheetSearchWrap = styled.div`
  flex-shrink: 0;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
`;

const SheetSearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  height: 44px;
  padding: 0 16px;
  /* Doubled selector so this wins over any global rule. 16px is the threshold
     below which iOS Safari zooms the page on focus: that zoom was the "weird
     shift" that pushed the field out of sight while typing. */
  && { font-size: 16px; }
  font-family: inherit;
  color: #0f172a;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  outline: none;

  &::placeholder { color: #94a3b8; }

  &:focus {
    border-color: #0ea5e9;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }

  &:disabled { opacity: 0.6; }
`;

const SheetList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  /* On the scroll area, not the sheet: with the keyboard up this would
     otherwise be a dead gap above it. */
  padding-bottom: env(safe-area-inset-bottom);
`;

const SheetItem = styled.button<{ $selected?: boolean }>`
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: ${p => p.$selected ? '#f0f9ff' : 'transparent'};
  color: ${p => p.$selected ? '#0284c7' : '#0f172a'};
  font-family: inherit;
  font-size: 15px;
  font-weight: ${p => p.$selected ? 600 : 400};
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:last-child { border-bottom: none; }
  &:active { background: #f0f9ff; }
`;

const SheetEmpty = styled.div`
  padding: 24px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
`;

const SheetDoneBar = styled.div`
  flex-shrink: 0;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #f1f5f9;
`;

const SheetDoneBtn = styled.button`
  width: 100%;
  min-height: 46px;
  border: none;
  border-radius: 12px;
  background: #0ea5e9;
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active { background: #0284c7; }
`;

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface SelectSheetProps {
  title: string;
  placeholder: string;
  searchDisabled?: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  items: string[];
  selected?: string;
  onPick: (value: string) => void;
  onClose: () => void;
  onDone?: () => void;
  sheetRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
}

const SelectSheet = ({
  title, placeholder, searchDisabled, query, onQueryChange,
  items, selected, onPick, onClose, onDone, sheetRef, searchRef,
}: SelectSheetProps) => createPortal(
  <>
    <SheetBackdrop />
    <Sheet ref={sheetRef} role="listbox" aria-label={title}>
      <SheetHeader>
        <span>{title}</span>
        <SheetClose
          type="button"
          aria-label="Zamknij"
          // Hold focus on the search field until the click lands; the sheet
          // then unmounts and the keyboard drops with it.
          onMouseDown={e => e.preventDefault()}
          onClick={onClose}
        >
          <CloseIcon />
        </SheetClose>
      </SheetHeader>
      <SheetSearchWrap>
        <SheetSearchInput
          ref={searchRef}
          type="text"
          placeholder={placeholder}
          value={query}
          disabled={searchDisabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={e => onQueryChange(e.target.value)}
        />
      </SheetSearchWrap>
      <SheetList>
        {items.length === 0 && <SheetEmpty>Brak wyników</SheetEmpty>}
        {items.map(item => (
          <SheetItem
            key={item}
            type="button"
            $selected={item === selected}
            onClick={() => onPick(item)}
          >
            {item}
          </SheetItem>
        ))}
      </SheetList>
      {onDone && (
        <SheetDoneBar>
          <SheetDoneBtn type="button" onMouseDown={e => e.preventDefault()} onClick={onDone}>
            Gotowe
          </SheetDoneBtn>
        </SheetDoneBar>
      )}
    </Sheet>
  </>,
  document.body,
);

type MenuStyle = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

interface BrandSelectProps {
  value?: string;
  onChange: (brand: string) => void;
  placeholder?: string;
  onBlur?: () => void;
  autoOpen?: boolean;
  compact?: boolean;
  onDone?: () => void;
}

export const BrandSelect = ({ value, onChange, placeholder = 'Wybierz markę', onBlur, autoOpen = false, compact = false, onDone }: BrandSelectProps) => {
  const { data, isLoading } = useVehicleMetadata();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);
  const [query, setQuery] = useState('');
  const didFocusRef = useRef(false);
  const isMobile = !useBreakpoint('sm');

  // Sheet spans the visible region, so the search field stays put while typing.
  useVisualViewportSheet(isMobile && open, portalMenuRef);

  const brands = useMemo(() => (data || []).map(b => b.marka).sort((a, b) => a.localeCompare(b)), [data]);
  const filteredBrands = useMemo(() => {
    if (!query.trim()) return brands;
    const q = query.toLowerCase();
    return brands.filter(b => b.toLowerCase().includes(q));
  }, [brands, query]);
  const selectedLabel = value || '';

  const MENU_MIN_HEIGHT = 200;
  const MENU_MAX_HEIGHT = 320;
  const GAP = 8;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vvHeight = window.visualViewport?.height ?? window.innerHeight;
    const spaceBelow = vvHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    if (spaceBelow >= MENU_MIN_HEIGHT || spaceBelow >= spaceAbove) {
      setMenuStyle({ top: rect.bottom + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceBelow, MENU_MAX_HEIGHT) });
    } else {
      setMenuStyle({ bottom: vvHeight - rect.top + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceAbove, MENU_MAX_HEIGHT) });
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); onBlur?.(); } };
    window.addEventListener('keydown', onKey);
    // The sheet is viewport-locked, so none of the anchoring work applies.
    if (isMobile) return () => window.removeEventListener('keydown', onKey);

    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', onScroll);
    };
  }, [open, onBlur, isMobile]);

  // Focus the search field once the menu is actually on screen (on desktop
  // that means menuStyle has been measured; the sheet needs no measuring).
  useEffect(() => {
    if (!open) {
      didFocusRef.current = false;
      return;
    }
    if (!isMobile && !menuStyle) return;
    if (didFocusRef.current) return;
    didFocusRef.current = true;
    const timer = setTimeout(() => searchRef.current?.focus(), isMobile ? 60 : 0);
    return () => clearTimeout(timer);
  }, [open, menuStyle, isMobile]);

  // Reset query each time menu opens
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Close on outside click (both trigger and portal menu)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = portalMenuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  // Auto-open when autoOpen is true and brands are available
  useEffect(() => {
    if (autoOpen && !isLoading && !open && brands.length > 0) {
      const timer = setTimeout(() => { setOpen(true); }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, isLoading, brands.length]);

  return (
    <DropdownContainer ref={containerRef}>
      <Trigger type="button" ref={triggerRef} onClick={() => !isLoading && setOpen(!open)} $disabled={isLoading} $compact={compact} aria-haspopup="listbox" aria-expanded={open}>
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <Placeholder $compact={compact}>{placeholder}</Placeholder>
        )}
        <Caret />
      </Trigger>
      {open && isMobile && (
        <SelectSheet
          title="Wybierz markę"
          placeholder="Szukaj marki..."
          query={query}
          onQueryChange={setQuery}
          items={filteredBrands}
          selected={value}
          onPick={b => { onChange(b); setOpen(false); onBlur?.(); }}
          onClose={() => { setOpen(false); onBlur?.(); }}
          onDone={onDone && (() => { setOpen(false); onDone(); })}
          sheetRef={portalMenuRef}
          searchRef={searchRef}
        />
      )}
      {open && !isMobile && menuStyle && createPortal(
        <PortalMenu ref={portalMenuRef} role="listbox" style={{ top: menuStyle.top, bottom: menuStyle.bottom, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight }}>
          <SearchContainer>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder="Szukaj marki..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </SearchContainer>
          <PortalMenuList>
            {filteredBrands.length === 0 && (
              <EmptyState>Brak wyników</EmptyState>
            )}
            {filteredBrands.map(b => (
              <MenuItem key={b} onClick={() => { onChange(b); setOpen(false); onBlur?.(); }} $selected={b === value}>
                {b}
              </MenuItem>
            ))}
          </PortalMenuList>
          {onDone && (
            <PortalMenuDoneBar>
              <PortalMenuDoneBtn type="button" onClick={() => { setOpen(false); onDone(); }}>
                Gotowe
              </PortalMenuDoneBtn>
            </PortalMenuDoneBar>
          )}
        </PortalMenu>,
        document.body
      )}
    </DropdownContainer>
  );
};

interface ModelSelectProps {
  brand?: string;
  value?: string;
  onChange: (model: string) => void;
  placeholder?: string;
  onBlur?: () => void;
  autoOpen?: boolean;
  compact?: boolean;
  onDone?: () => void;
}

export const ModelSelect = ({ brand, value, onChange, placeholder = 'Wybierz model', onBlur, autoOpen = false, compact = false, onDone }: ModelSelectProps) => {
  const { data, isLoading } = useVehicleMetadata();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);
  const [query, setQuery] = useState('');
  const didFocusRef = useRef(false);
  const isMobile = !useBreakpoint('sm');

  // Sheet spans the visible region, so the search field stays put while typing.
  useVisualViewportSheet(isMobile && open, portalMenuRef);

  const models = useMemo(() => {
    if (!brand || !data) return [] as string[];
    const found = data.find(b => b.marka === brand);
    return (found?.modele || []).slice().sort((a, b) => a.localeCompare(b));
  }, [brand, data]);

  const filteredModels = useMemo(() => {
    if (!query.trim()) return models;
    const q = query.toLowerCase();
    return models.filter(m => m.toLowerCase().includes(q));
  }, [models, query]);

  const disabled = isLoading || !brand;
  const selectedLabel = value || '';

  const MENU_MIN_HEIGHT = 200;
  const MENU_MAX_HEIGHT = 320;
  const GAP = 8;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vvHeight = window.visualViewport?.height ?? window.innerHeight;
    const spaceBelow = vvHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    if (spaceBelow >= MENU_MIN_HEIGHT || spaceBelow >= spaceAbove) {
      setMenuStyle({ top: rect.bottom + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceBelow, MENU_MAX_HEIGHT) });
    } else {
      setMenuStyle({ bottom: vvHeight - rect.top + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceAbove, MENU_MAX_HEIGHT) });
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); onBlur?.(); } };
    window.addEventListener('keydown', onKey);
    // The sheet is viewport-locked, so none of the anchoring work applies.
    if (isMobile) return () => window.removeEventListener('keydown', onKey);

    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', onScroll);
    };
  }, [open, onBlur, isMobile]);

  // Focus the search field once the menu is actually on screen (on desktop
  // that means menuStyle has been measured; the sheet needs no measuring).
  useEffect(() => {
    if (!open) {
      didFocusRef.current = false;
      return;
    }
    if (!isMobile && !menuStyle) return;
    if (didFocusRef.current) return;
    didFocusRef.current = true;
    const timer = setTimeout(() => searchRef.current?.focus(), isMobile ? 60 : 0);
    return () => clearTimeout(timer);
  }, [open, menuStyle, isMobile]);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Close on outside click (both trigger and portal menu)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = portalMenuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  // Auto-open when autoOpen is true and brand is available
  useEffect(() => {
    if (autoOpen && brand && !disabled && !open && models.length > 0) {
      const timer = setTimeout(() => { setOpen(true); }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, brand, disabled, models.length]);

  return (
    <DropdownContainer ref={containerRef}>
      <Trigger type="button" ref={triggerRef} onClick={() => !disabled && setOpen(!open)} $disabled={disabled} $compact={compact} aria-haspopup="listbox" aria-expanded={open}>
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <Placeholder $compact={compact}>{disabled ? 'Wybierz markę' : placeholder}</Placeholder>
        )}
        <Caret />
      </Trigger>
      {open && isMobile && (
        <SelectSheet
          title="Wybierz model"
          placeholder={brand ? 'Szukaj modelu...' : 'Wybierz markę'}
          searchDisabled={!brand}
          query={query}
          onQueryChange={setQuery}
          items={filteredModels}
          selected={value}
          onPick={m => { onChange(m); setOpen(false); onBlur?.(); }}
          onClose={() => { setOpen(false); onBlur?.(); }}
          onDone={onDone && (() => { setOpen(false); onDone(); })}
          sheetRef={portalMenuRef}
          searchRef={searchRef}
        />
      )}
      {open && !isMobile && menuStyle && createPortal(
        <PortalMenu ref={portalMenuRef} role="listbox" style={{ top: menuStyle.top, bottom: menuStyle.bottom, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight }}>
          <SearchContainer>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder={brand ? 'Szukaj modelu...' : 'Wybierz markę'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={!brand}
            />
          </SearchContainer>
          <PortalMenuList>
            {filteredModels.length === 0 && (
              <EmptyState>Brak wyników</EmptyState>
            )}
            {filteredModels.map(m => (
              <MenuItem key={m} onClick={() => { onChange(m); setOpen(false); onBlur?.(); }} $selected={m === value}>
                {m}
              </MenuItem>
            ))}
          </PortalMenuList>
          {onDone && (
            <PortalMenuDoneBar>
              <PortalMenuDoneBtn type="button" onClick={() => { setOpen(false); onDone(); }}>
                Gotowe
              </PortalMenuDoneBtn>
            </PortalMenuDoneBar>
          )}
        </PortalMenu>,
        document.body
      )}
    </DropdownContainer>
  );
};
