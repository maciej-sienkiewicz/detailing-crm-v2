// src/modules/vehicles/components/BrandModelSelectors.tsx
import { useMemo, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { useVehicleMetadata } from '../hooks/useVehicleMetadata';

// Reuse ColorDropdown-like styling
const DropdownContainer = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $disabled?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.theme.colors.surface};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all ${props => props.theme.transitions.fast};
  font-weight: ${props => props.theme.fontWeights.medium};

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
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
  padding: ${props => props.theme.spacing.xs} 0;
  z-index: 2001; // above modal overlay (1000)
  max-height: 320px;
  overflow: auto;
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

const Placeholder = styled.span`
  color: ${props => props.theme.colors.textMuted};
`;

const SearchContainer = styled.div`
  position: sticky;
  top: 0;
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

interface BrandSelectProps {
  value?: string;
  onChange: (brand: string) => void;
  placeholder?: string;
  onBlur?: () => void;
  autoOpen?: boolean;
}

export const BrandSelect = ({ value, onChange, placeholder = 'Wybierz markę', onBlur, autoOpen = false }: BrandSelectProps) => {
  const { data, isLoading } = useVehicleMetadata();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [query, setQuery] = useState('');
  const didFocusRef = useRef(false);

  const brands = useMemo(() => (data || []).map(b => b.marka).sort((a, b) => a.localeCompare(b)), [data]);
  const filteredBrands = useMemo(() => {
    if (!query.trim()) return brands;
    const q = query.toLowerCase();
    return brands.filter(b => b.toLowerCase().includes(q));
  }, [brands, query]);
  const selectedLabel = value || '';

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); onBlur?.(); } };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onBlur]);

  // Focus search input after portal is rendered (menuStyle is set means portal is visible)
  useEffect(() => {
    if (!open) {
      didFocusRef.current = false;
      return;
    }
    if (!menuStyle || didFocusRef.current) return;
    didFocusRef.current = true;
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open, menuStyle]);

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
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        setOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, isLoading, brands.length]);

  return (
    <DropdownContainer ref={containerRef}>
      <Trigger ref={triggerRef} onClick={() => !isLoading && setOpen(!open)} $disabled={isLoading} aria-haspopup="listbox" aria-expanded={open}>
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <Placeholder>{placeholder}</Placeholder>
        )}
        <Caret />
      </Trigger>
      {open && menuStyle && createPortal(
        <PortalMenu ref={portalMenuRef} role="listbox" style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}>
          <SearchContainer>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder="Szukaj marki..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </SearchContainer>
          {filteredBrands.length === 0 && (
            <EmptyState>Brak wyników</EmptyState>
          )}
          {filteredBrands.map(b => (
            <MenuItem key={b} onClick={() => { onChange(b); setOpen(false); onBlur?.(); }} $selected={b === value}>
              {b}
            </MenuItem>
          ))}
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
}

export const ModelSelect = ({ brand, value, onChange, placeholder = 'Wybierz model', onBlur, autoOpen = false }: ModelSelectProps) => {
  const { data, isLoading } = useVehicleMetadata();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [query, setQuery] = useState('');
  const didFocusRef = useRef(false);

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

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); onBlur?.(); } };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onBlur]);

  // Focus search input after portal is rendered (menuStyle is set means portal is visible)
  useEffect(() => {
    if (!open) {
      didFocusRef.current = false;
      return;
    }
    if (!menuStyle || didFocusRef.current) return;
    didFocusRef.current = true;
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open, menuStyle]);

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
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        setOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, brand, disabled, models.length]);

  return (
    <DropdownContainer ref={containerRef}>
      <Trigger ref={triggerRef} onClick={() => !disabled && setOpen(!open)} $disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <Placeholder>{disabled ? 'Wybierz markę najpierw' : placeholder}</Placeholder>
        )}
        <Caret />
      </Trigger>
      {open && menuStyle && createPortal(
        <PortalMenu ref={portalMenuRef} role="listbox" style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}>
          <SearchContainer>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder={brand ? 'Szukaj modelu...' : 'Wybierz markę najpierw'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={!brand}
            />
          </SearchContainer>
          {filteredModels.length === 0 && (
            <EmptyState>Brak wyników</EmptyState>
          )}
          {filteredModels.map(m => (
            <MenuItem key={m} onClick={() => { onChange(m); setOpen(false); onBlur?.(); }} $selected={m === value}>
              {m}
            </MenuItem>
          ))}
        </PortalMenu>,
        document.body
      )}
    </DropdownContainer>
  );
};
