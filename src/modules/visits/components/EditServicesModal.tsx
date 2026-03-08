import { useEffect, useState } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import styled, { css, keyframes } from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { ServiceAutocomplete } from '@/modules/checkin/components/ServiceAutocomplete';
import type { ServiceLineItem, ServiceStatus } from '../types';
import type { ServicesChangesPayload } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

interface EditServicesModalProps {
  isOpen: boolean;
  services: ServiceLineItem[];
  onClose: () => void;
  onAddService?: (
    service: { id?: string; name: string; basePriceNet: number; vatRate: number },
    notifyCustomer: boolean
  ) => void;
  onUpdateService?: (serviceId: string, price: number, notifyCustomer: boolean) => void;
  onDeleteService?: (serviceId: string, notifyCustomer: boolean) => void;
  onUpdateServiceStatus: (serviceId: string, status: ServiceStatus) => void;
  onSaveChanges: (payload: ServicesChangesPayload) => void;
  isSavingChanges?: boolean;
}

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

/* ─── Overlay ─────────────────────────────────────────────────────────────── */

const Overlay = styled.div<{ $contentLeft: number }>`
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);

  @media (min-width: 768px) {
    left: ${p => p.$contentLeft}px;
  }
`;

const ModalCard = styled.div`
  background: #ffffff;
  border: 1px solid ${st.border};
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.16), 0 8px 24px rgba(15, 23, 42, 0.08);
  width: 100%;
  max-width: 620px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 200ms cubic-bezier(0.16, 1, 0.3, 1);
`;

/* ─── Header ──────────────────────────────────────────────────────────────── */

const ModalHeader = styled.div`
  padding: 18px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${st.border};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.2px;
`;

const CountPill = styled.span`
  padding: 2px 9px;
  border-radius: 9999px;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  font-size: 12px;
  font-weight: 600;
  color: ${st.textSecondary};
`;

const PendingPill = styled.span`
  padding: 2px 9px;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: #B45309;
`;

const CloseBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${st.border};
  background: transparent;
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 160ms ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: ${st.bgCardAlt};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

/* ─── Search ──────────────────────────────────────────────────────────────── */

const SearchBar = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${st.border};
  background: ${st.bg};
`;

/* ─── Content ─────────────────────────────────────────────────────────────── */

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 4px; }
`;

const EmptyServices = styled.div`
  padding: 32px 20px;
  text-align: center;
  color: ${st.textMuted};
  font-size: 13px;
`;

/* ─── Service row ─────────────────────────────────────────────────────────── */

type RowState = 'added' | 'pending' | 'deleted' | 'confirmed';

const accentFor = (state: RowState): string => {
  switch (state) {
    case 'added':   return st.accentGreen;
    case 'pending': return st.accentAmber;
    case 'deleted': return st.accentRed;
    default:        return 'transparent';
  }
};

const ServiceRow = styled.div<{ $state: RowState }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 12px;
  padding: 11px 16px 11px 19px;
  border-bottom: 1px solid ${st.border};
  position: relative;
  transition: background 140ms ease;

  &:last-child { border-bottom: none; }

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: ${p => accentFor(p.$state)};
    border-radius: 0 2px 2px 0;
  }

  &:hover {
    background: ${st.bg};
    .row-actions { opacity: 1; pointer-events: auto; }
  }
`;

const ServiceInfo = styled.div`
  min-width: 0;
`;

const ServiceTopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  flex-wrap: wrap;
`;

const ServiceName = styled.span<{ $deleted?: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$deleted ? st.textMuted : st.text};
  text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
  letter-spacing: -0.1px;
`;

const StateBadge = styled.span<{ $state: RowState }>`
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  ${p => {
    switch (p.$state) {
      case 'added':   return css`background: rgba(16,185,129,.12); color: #059669;`;
      case 'pending': return css`background: rgba(245,158,11,.12); color: #B45309;`;
      case 'deleted': return css`background: rgba(239,68,68,.10); color: #DC2626;`;
      default:        return css`background: rgba(16,185,129,.08); color: #059669;`;
    }
  }}
`;

const PriceSubLine = styled.div`
  font-size: 12px;
  color: ${st.textMuted};

  span { color: ${st.textSecondary}; font-weight: 500; }
`;

/* ─── Inline price editor ─────────────────────────────────────────────────── */

const PriceEditPanel = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const PriceEditGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  background: #ffffff;
  border: 1.5px solid ${st.accentBlue};
  border-radius: 9px;
  box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  overflow: hidden;
`;

const PriceEditLabel = styled.span`
  padding: 0 9px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  background: ${st.bg};
  border-right: 1px solid ${st.border};
  height: 32px;
  display: flex;
  align-items: center;
  white-space: nowrap;
`;

const PriceEditInput = styled.input`
  width: 80px;
  height: 32px;
  padding: 0 10px;
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  background: #ffffff;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
`;

const PriceEditSuffix = styled.span`
  padding: 0 9px;
  font-size: 11px;
  color: ${st.textMuted};
  background: ${st.bg};
  border-left: 1px solid ${st.border};
  height: 32px;
  display: flex;
  align-items: center;
`;

const GrossPreview = styled.span`
  font-size: 12px;
  color: ${st.textSecondary};
  white-space: nowrap;

  strong { color: ${st.text}; font-weight: 600; }
`;

const PriceEditActions = styled.div`
  display: flex;
  gap: 4px;
`;

const PriceEditBtn = styled.button<{ $confirm?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${p => p.$confirm ? 'rgba(16,185,129,.3)' : st.border};
  background: ${p => p.$confirm ? 'rgba(16,185,129,.10)' : 'transparent'};
  color: ${p => p.$confirm ? st.accentGreen : st.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 140ms ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: ${p => p.$confirm ? 'rgba(16,185,129,.18)' : st.bgCardAlt};
    color: ${p => p.$confirm ? st.accentGreen : st.text};
  }
`;

/* ─── Right side of row ───────────────────────────────────────────────────── */

const RowRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  min-width: 80px;
`;

const PriceDisplay = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${st.text};
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  letter-spacing: -0.5px;
`;

const RowActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
`;

const IconBtn = styled.button<{ $variant?: 'confirm' | 'delete' | 'edit' }>`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 140ms ease;
  flex-shrink: 0;

  svg { width: 13px; height: 13px; }

  ${p => {
    switch (p.$variant) {
      case 'confirm': return css`
        border: 1px solid rgba(16,185,129,.25);
        background: rgba(16,185,129,.08);
        color: ${st.accentGreen};
        &:hover { background: rgba(16,185,129,.18); }
      `;
      case 'delete': return css`
        border: 1px solid rgba(239,68,68,.20);
        background: rgba(239,68,68,.06);
        color: ${st.accentRed};
        &:hover { background: rgba(239,68,68,.14); }
      `;
      default: return css`
        border: 1px solid ${st.border};
        background: transparent;
        color: ${st.textMuted};
        &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
      `;
    }
  }}
`;

/* ─── Footer ──────────────────────────────────────────────────────────────── */

const ModalFooter = styled.div`
  padding: 12px 16px;
  background: ${st.bg};
  border-top: 1px solid ${st.border};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 9999px;
  background: ${p => p.$on ? st.accentBlue : st.border};
  flex-shrink: 0;
  transition: background 180ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${p => p.$on ? '16px' : '2px'};
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
    transition: left 180ms cubic-bezier(.4,0,.2,1);
  }
`;

const HiddenCheckbox = styled.input`
  display: none;
`;

const ToggleText = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${st.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FooterBtns = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const CancelBtn = styled.button`
  padding: 7px 14px;
  border-radius: 9999px;
  border: 1px solid ${st.border};
  background: transparent;
  color: ${st.textSecondary};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 160ms ease;

  &:hover { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; }
`;

const SaveBtn = styled.button`
  padding: 7px 18px;
  border-radius: 9999px;
  border: none;
  background: ${st.accentBlue};
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 160ms ease;
  box-shadow: 0 1px 3px rgba(59,130,246,.3);

  &:hover:not(:disabled) {
    background: #2563EB;
    box-shadow: 0 3px 8px rgba(59,130,246,.35);
    transform: translateY(-1px);
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

export const EditServicesModal = ({
  isOpen,
  services,
  onClose,
  onUpdateServiceStatus,
  onSaveChanges,
  isSavingChanges,
}: EditServicesModalProps) => {
  const { isCollapsed } = useSidebar();
  const contentLeft = typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0;

  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [newServiceNamePrefill, setNewServiceNamePrefill] = useState<string>('');

  const [tempAdded, setTempAdded] = useState<ServiceLineItem[]>([]);
  const [deletedSnapshots, setDeletedSnapshots] = useState<Record<string, ServiceLineItem>>({});
  const [changedPriceIds, setChangedPriceIds] = useState<Set<string>>(new Set());
  const [localPriceOverrides, setLocalPriceOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!services) return;
    setTempAdded(prev =>
      prev.filter(t => !services.some(s => s.serviceId === t.serviceId && s.serviceName === t.serviceName))
    );
    setDeletedSnapshots(prev => {
      const next = { ...prev };
      services.forEach(s => { if (next[s.id]) delete next[s.id]; });
      return next;
    });
  }, [services]);

  if (!isOpen) return null;

  const handlePriceChange = (serviceId: string, value: string) => {
    if (value !== '' && !/^\d*(\.\d{0,2})?$/.test(value)) return;
    setEditingPrices(prev => ({ ...prev, [serviceId]: value }));
  };

  const handleSavePrice = (serviceId: string) => {
    const rawValue = editingPrices[serviceId];
    if (rawValue === undefined) return;
    const numValue = Math.round(parseFloat(rawValue) * 100);
    if (!isNaN(numValue) && numValue >= 0) {
      setChangedPriceIds(prev => new Set(prev).add(serviceId));
      setLocalPriceOverrides(prev => ({ ...prev, [serviceId]: numValue }));
    }
    setEditingPrices(prev => { const { [serviceId]: _, ...rest } = prev; return rest; });
  };

  const handleCancelEdit = (serviceId: string) => {
    setEditingPrices(prev => { const { [serviceId]: _, ...rest } = prev; return rest; });
  };

  const handleDelete = (serviceId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę usługę?')) return;
    const isTemp = serviceId.startsWith('temp-') || tempAdded.some(s => s.id === serviceId);
    if (isTemp) {
      setTempAdded(prev => prev.filter(s => s.id !== serviceId));
      return;
    }
    const current = services.find(s => s.id === serviceId);
    if (current) setDeletedSnapshots(prev => ({ ...prev, [serviceId]: current }));
  };

  const hasPendingChanges = services.some(s => s.hasPendingChange ?? s.status === 'PENDING');

  const handleServiceCreate = (service: {
    id?: string; name: string; basePriceNet: number; vatRate: number;
  }) => {
    const tempId = `temp-${Date.now()}`;
    const tempItem: ServiceLineItem = {
      id: tempId,
      serviceId: service.id || 'custom',
      serviceName: service.name,
      basePriceNet: service.basePriceNet,
      vatRate: service.vatRate as number,
      requireManualPrice: false,
      adjustment: { type: 'FIXED_NET', value: 0 },
      note: '',
      finalPriceNet: service.basePriceNet,
      finalPriceGross: Math.round(service.basePriceNet * (1 + service.vatRate / 100)),
      status: 'PENDING',
    };
    setTempAdded(prev => [tempItem, ...prev]);
    setIsQuickServiceModalOpen(false);
  };

  /* Merged service list */
  const byId: Record<string, ServiceLineItem> = {};
  services.forEach(s => { byId[s.id] = s; });
  tempAdded.forEach(t => { byId[t.id] = t; });
  Object.values(deletedSnapshots).forEach(d => { byId[d.id] = d; });
  const allItems = Object.values(byId);

  const hasUnsaved =
    tempAdded.length > 0 ||
    Object.keys(deletedSnapshots).length > 0 ||
    changedPriceIds.size > 0;

  const totalCount = services.length + tempAdded.length;

  return (
    <>
      <Overlay
        $contentLeft={contentLeft}
        onMouseDown={e => e.target === e.currentTarget && onClose()}
      >
        <ModalCard>

          {/* ── Header ── */}
          <ModalHeader>
            <HeaderLeft>
              <ModalTitle>Usługi wizyty</ModalTitle>
              <CountPill>
                {totalCount}{' '}
                {totalCount === 1 ? 'usługa' : totalCount < 5 ? 'usługi' : 'usług'}
              </CountPill>
              {hasPendingChanges && <PendingPill>Oczekuje potwierdzenia</PendingPill>}
            </HeaderLeft>
            <CloseBtn type="button" onClick={onClose} title="Zamknij">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </CloseBtn>
          </ModalHeader>

          {/* ── Search ── */}
          <SearchBar>
            <ServiceAutocomplete
              onSelect={service => {
                const tempId = `temp-${Date.now()}`;
                const tempItem: ServiceLineItem = {
                  id: tempId,
                  serviceId: service.id,
                  serviceName: service.name,
                  basePriceNet: service.basePriceNet,
                  vatRate: service.vatRate as number,
                  requireManualPrice: service.requireManualPrice,
                  adjustment: { type: 'FIXED_NET', value: 0 },
                  note: '',
                  finalPriceNet: service.basePriceNet,
                  finalPriceGross: Math.round(service.basePriceNet * (1 + service.vatRate / 100)),
                  status: 'PENDING',
                };
                setTempAdded(prev => [tempItem, ...prev]);
              }}
              onAddNew={q => {
                setNewServiceNamePrefill(q);
                setIsQuickServiceModalOpen(true);
              }}
            />
          </SearchBar>

          {/* ── Service list ── */}
          <ModalContent>
            {allItems.length === 0 && (
              <EmptyServices>Brak usług — wyszukaj i dodaj pierwszą usługę</EmptyServices>
            )}

            {allItems.map(service => {
              const isDeleted      = !!deletedSnapshots[service.id];
              const isAdded        = tempAdded.some(t => t.id === service.id);
              const isPriceChanged = changedPriceIds.has(service.id);
              const isEditing      = !isDeleted && editingPrices[service.id] !== undefined;

              const effectiveNet   = localPriceOverrides[service.id] ?? service.finalPriceNet;
              const effectiveGross = Math.round(effectiveNet * (1 + (service.vatRate || 0) / 100));

              const editingNetValue = editingPrices[service.id] ?? '';
              const previewGross = editingNetValue !== ''
                ? Math.round(parseFloat(editingNetValue) * 100 * (1 + (service.vatRate || 0) / 100))
                : effectiveGross;

              const rowState: RowState =
                isDeleted          ? 'deleted'
                : isAdded          ? 'added'
                : (isPriceChanged || service.status === 'PENDING') ? 'pending'
                : 'confirmed';

              const badgeLabel =
                isDeleted          ? 'Usunięto'
                : isAdded          ? 'Dodano'
                : isPriceChanged   ? 'Zmieniono'
                : service.status === 'PENDING' ? 'Oczekuje'
                : 'Potwierdzona';

              return (
                <ServiceRow key={service.id} $state={rowState}>
                  <ServiceInfo>
                    <ServiceTopLine>
                      <ServiceName $deleted={isDeleted}>{service.serviceName}</ServiceName>
                      <StateBadge $state={rowState}>{badgeLabel}</StateBadge>
                    </ServiceTopLine>

                    {!isEditing && (
                      <PriceSubLine>
                        Netto <span>{formatCurrency(effectiveNet / 100)}</span>
                        {' · '}
                        VAT {service.vatRate}%
                      </PriceSubLine>
                    )}

                    {isEditing && (
                      <PriceEditPanel>
                        <PriceEditGroup>
                          <PriceEditLabel>Netto</PriceEditLabel>
                          <PriceEditInput
                            type="text"
                            inputMode="decimal"
                            value={editingNetValue}
                            onChange={e => handlePriceChange(service.id, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleSavePrice(service.id); }
                              if (e.key === 'Escape') handleCancelEdit(service.id);
                            }}
                            autoFocus
                          />
                          <PriceEditSuffix>PLN</PriceEditSuffix>
                        </PriceEditGroup>

                        {editingNetValue !== '' && !isNaN(parseFloat(editingNetValue)) && (
                          <GrossPreview>
                            → brutto <strong>{formatCurrency(previewGross / 100)}</strong>
                          </GrossPreview>
                        )}

                        <PriceEditActions>
                          <PriceEditBtn
                            $confirm
                            title="Zapisz cenę"
                            onClick={() => handleSavePrice(service.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </PriceEditBtn>
                          <PriceEditBtn
                            title="Anuluj"
                            onClick={() => handleCancelEdit(service.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </PriceEditBtn>
                        </PriceEditActions>
                      </PriceEditPanel>
                    )}
                  </ServiceInfo>

                  <RowRight>
                    {!isEditing && (
                      <PriceDisplay>{formatCurrency(effectiveGross / 100)}</PriceDisplay>
                    )}
                    <RowActions className="row-actions">
                      {!isDeleted && !isAdded && service.status === 'PENDING' && (
                        <IconBtn
                          $variant="confirm"
                          title="Zatwierdź"
                          onClick={() => onUpdateServiceStatus(service.id, 'CONFIRMED')}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </IconBtn>
                      )}
                      {!isDeleted && !isEditing && (
                        <IconBtn
                          title="Edytuj cenę"
                          onClick={() =>
                            setEditingPrices(prev => ({
                              ...prev,
                              [service.id]: String(effectiveNet / 100),
                            }))
                          }
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </IconBtn>
                      )}
                      {!isDeleted && (
                        <IconBtn
                          $variant="delete"
                          title="Usuń"
                          onClick={() => handleDelete(service.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </IconBtn>
                      )}
                    </RowActions>
                  </RowRight>
                </ServiceRow>
              );
            })}
          </ModalContent>

          {/* ── Footer ── */}
          <ModalFooter>
            <ToggleLabel htmlFor="notify-sms">
              <HiddenCheckbox
                id="notify-sms"
                type="checkbox"
                checked={notifyCustomer}
                onChange={e => setNotifyCustomer(e.target.checked)}
              />
              <ToggleTrack $on={notifyCustomer} />
              <ToggleText>SMS do klienta</ToggleText>
            </ToggleLabel>

            <FooterBtns>
              <CancelBtn type="button" onClick={onClose}>
                Zamknij
              </CancelBtn>
              <SaveBtn
                type="button"
                disabled={!hasUnsaved || !!isSavingChanges}
                onClick={() => {
                  const payload: ServicesChangesPayload = {
                    notifyCustomer,
                    added: tempAdded.map(t => ({
                      serviceId: t.serviceId === 'custom' ? null : t.serviceId,
                      serviceName: t.serviceName,
                      basePriceNet: localPriceOverrides[t.id] ?? t.finalPriceNet,
                      vatRate: t.vatRate,
                      adjustment: t.adjustment,
                      note: t.note,
                    })),
                    updated: Array.from(changedPriceIds)
                      .filter(id => !tempAdded.some(t => t.id === id) && !deletedSnapshots[id])
                      .map(id => ({
                        serviceLineItemId: id,
                        basePriceNet: localPriceOverrides[id]!,
                      })),
                    deleted: Object.keys(deletedSnapshots).map(id => ({ serviceLineItemId: id })),
                  };
                  onSaveChanges(payload);
                }}
              >
                {isSavingChanges ? 'Zapisywanie…' : 'Zapisz zmiany'}
              </SaveBtn>
            </FooterBtns>
          </ModalFooter>

        </ModalCard>
      </Overlay>

      <div style={{ zIndex: 1100 }}>
        <QuickServiceModal
          isOpen={isQuickServiceModalOpen}
          onClose={() => setIsQuickServiceModalOpen(false)}
          onServiceCreate={handleServiceCreate}
          initialServiceName={newServiceNamePrefill}
        />
      </div>
    </>
  );
};
