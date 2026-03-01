import { useEffect, useState } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import styled, { css } from 'styled-components';
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

/* ─── Overlay ─────────────────────────────────────────────────────────────── */

const Overlay = styled.div<{ $contentLeft: number }>`
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: ${st.bgOverlay};
  backdrop-filter: blur(2px);

  @media (min-width: 768px) {
    left: ${p => p.$contentLeft}px;
  }
`;

const ModalCard = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowLg};
  width: 100%;
  max-width: 660px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/* ─── Header ──────────────────────────────────────────────────────────────── */

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${st.border};
  background: ${st.bgCard};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const HeaderText = styled.div``;

const ModalTitle = styled.h2`
  margin: 0 0 2px;
  font-size: ${st.fontMd};
  font-weight: 700;
  color: ${st.text};
`;

const ModalSubtitle = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${st.radiusSm};
  border: 1px solid ${st.border};
  background: ${st.bgCard};
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all ${st.transition};

  svg { width: 16px; height: 16px; }

  &:hover {
    background: ${st.bg};
    border-color: ${st.borderHover};
    color: ${st.text};
  }
`;

/* ─── Content ─────────────────────────────────────────────────────────────── */

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const AddSection = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${st.border};
  background: ${st.bg};
`;

const SectionLabel = styled.div`
  font-size: ${st.fontXs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${st.textMuted};
  margin-bottom: 10px;
`;

const ServicesList = styled.div`
  flex: 1;
`;

/* ─── Service row ─────────────────────────────────────────────────────────── */

type RowState = 'added' | 'pending' | 'deleted' | 'confirmed';

const rowBg = (state: RowState): string => {
  switch (state) {
    case 'added':   return st.bgAccentGreen;
    case 'pending': return st.bgAccentAmber;
    case 'deleted': return st.bgAccentRed;
    default:        return 'transparent';
  }
};

const accentFor = (state: RowState): string => {
  switch (state) {
    case 'added':   return st.accentGreen;
    case 'pending': return st.accentAmber;
    case 'deleted': return st.accentRed;
    default:        return st.border;
  }
};

const ServiceRow = styled.div<{ $state: RowState }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px 12px 21px;
  border-bottom: 1px solid ${st.border};
  background: ${p => rowBg(p.$state)};
  position: relative;
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }

  &:hover {
    background: ${p => p.$state === 'confirmed' ? st.bg : rowBg(p.$state)};
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${p => accentFor(p.$state)};
  }
`;

const ServiceInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ServiceNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
  flex-wrap: wrap;
`;

const ServiceName = styled.span<{ $deleted?: boolean }>`
  font-size: ${st.fontSm};
  font-weight: 600;
  color: ${p => p.$deleted ? st.textMuted : st.text};
  text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
`;

const StateBadge = styled.span<{ $state: RowState }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 700;
  ${p => {
    switch (p.$state) {
      case 'added':   return css`background: ${st.accentGreenDim}; color: ${st.accentGreen};`;
      case 'pending': return css`background: ${st.accentAmberDim}; color: ${st.accentAmber};`;
      case 'deleted': return css`background: ${st.accentRedDim}; color: ${st.accentRed};`;
      default:        return css`background: ${st.accentGreenDim}; color: ${st.accentGreen};`;
    }
  }}
`;

const PriceInfo = styled.div`
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
`;

const PriceStrong = styled.span`
  font-weight: 600;
  color: ${st.text};
`;

const PriceSep = styled.span`
  margin: 0 6px;
  opacity: 0.35;
`;

const PriceInput = styled.input`
  width: 90px;
  padding: 5px 10px;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  font-size: ${st.fontSm};
  color: ${st.text};
  background: ${st.bgCard};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.borderFocus};
    box-shadow: ${st.shadowBlue};
  }
`;

/* ─── Action buttons ──────────────────────────────────────────────────────── */

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $variant?: 'confirm' | 'edit' | 'delete' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 600;
  cursor: pointer;
  transition: all ${st.transition};

  svg { width: 13px; height: 13px; }

  ${p => {
    switch (p.$variant) {
      case 'confirm': return css`
        border: 1px solid ${st.accentGreen}44;
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
        &:hover { background: #d1fae5; }
      `;
      case 'delete': return css`
        border: 1px solid ${st.accentRed}44;
        background: ${st.accentRedDim};
        color: ${st.accentRed};
        &:hover { background: #fee2e2; }
      `;
      default: return css`
        border: 1px solid ${st.border};
        background: ${st.bgCard};
        color: ${st.textSecondary};
        box-shadow: ${st.shadowXs};
        &:hover {
          border-color: ${st.accentBlue};
          color: ${st.accentBlue};
          background: ${st.accentBlueDim};
        }
      `;
    }
  }}
`;

/* ─── Notify row ──────────────────────────────────────────────────────────── */

const NotifyRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid ${st.border};
  background: ${st.bg};
  cursor: pointer;
`;

const NotifyCheckbox = styled.input`
  width: 15px;
  height: 15px;
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: ${st.accentBlue};
  cursor: pointer;
`;

const NotifyText = styled.div``;

const NotifyTitle = styled.span`
  font-size: ${st.fontSm};
  font-weight: 600;
  color: ${st.text};
  display: block;
`;

const NotifyHint = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  display: block;
  margin-top: 2px;
`;

/* ─── Footer ──────────────────────────────────────────────────────────────── */

const ModalFooter = styled.div`
  padding: 14px 20px;
  background: ${st.bg};
  border-top: 1px solid ${st.border};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelBtn = styled.button`
  padding: 7px 14px;
  border-radius: ${st.radiusFull};
  border: 1px solid ${st.border};
  background: ${st.bgCard};
  color: ${st.textSecondary};
  font-size: ${st.fontSm};
  font-weight: 500;
  cursor: pointer;
  transition: all ${st.transition};

  &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
`;

const SaveBtn = styled.button`
  padding: 7px 14px;
  border-radius: ${st.radiusFull};
  border: none;
  background: ${st.accentBlue};
  color: white;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: all ${st.transition};
  box-shadow: ${st.shadowXs};

  &:hover:not(:disabled) {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }

  &:disabled { opacity: 0.45; cursor: not-allowed; }
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
            <HeaderText>
              <ModalTitle>Zarządzanie usługami</ModalTitle>
              <ModalSubtitle>
                {totalCount}{' '}
                {totalCount === 1 ? 'usługa' : totalCount < 5 ? 'usługi' : 'usług'}
                {hasPendingChanges && ' · oczekuje na potwierdzenie'}
              </ModalSubtitle>
            </HeaderText>
            <CloseBtn type="button" onClick={onClose} title="Zamknij">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </CloseBtn>
          </ModalHeader>

          {/* ── Content ── */}
          <ModalContent>

            {/* Add service */}
            <AddSection>
              <SectionLabel>Dodaj usługę</SectionLabel>
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
            </AddSection>

            {/* Service rows */}
            <ServicesList>
              {allItems.map(service => {
                const isDeleted     = !!deletedSnapshots[service.id];
                const isAdded       = tempAdded.some(t => t.id === service.id);
                const isPriceChanged = changedPriceIds.has(service.id);
                const isEditing     = !isDeleted && editingPrices[service.id] !== undefined;

                const effectiveNet   = isEditing
                  ? Number(editingPrices[service.id]) * 100
                  : (localPriceOverrides[service.id] ?? service.finalPriceNet);
                const effectiveGross = Math.round(effectiveNet * (1 + (service.vatRate || 0) / 100));

                const rowState: RowState =
                  isDeleted          ? 'deleted'
                  : isAdded          ? 'added'
                  : (isPriceChanged || service.status === 'PENDING') ? 'pending'
                  : 'confirmed';

                const badgeLabel =
                  isDeleted          ? 'Usunięto'
                  : isAdded          ? 'Dodano'
                  : isPriceChanged   ? 'Zmieniono cenę'
                  : service.status === 'PENDING' ? 'Oczekuje'
                  : 'Potwierdzona';

                return (
                  <ServiceRow key={service.id} $state={rowState}>
                    <ServiceInfo>
                      <ServiceNameRow>
                        <ServiceName $deleted={isDeleted}>
                          {service.serviceName}
                        </ServiceName>
                        <StateBadge $state={rowState}>
                          {badgeLabel}
                        </StateBadge>
                      </ServiceNameRow>

                      {isEditing ? (
                        <PriceInput
                          type="text"
                          inputMode="decimal"
                          value={editingPrices[service.id] ?? ''}
                          onChange={e => handlePriceChange(service.id, e.target.value)}
                          onBlur={() => handleSavePrice(service.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSavePrice(service.id); }
                          }}
                          autoFocus
                        />
                      ) : (
                        <PriceInfo>
                          Netto <PriceStrong>{formatCurrency(effectiveNet / 100)}</PriceStrong>
                          <PriceSep>·</PriceSep>
                          Brutto <PriceStrong>{formatCurrency(effectiveGross / 100)}</PriceStrong>
                        </PriceInfo>
                      )}
                    </ServiceInfo>

                    <ActionGroup>
                      {!isDeleted && !isAdded && service.status === 'PENDING' && (
                        <ActionBtn
                          $variant="confirm"
                          onClick={() => onUpdateServiceStatus(service.id, 'CONFIRMED')}
                          title="Zatwierdź"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Zatwierdź
                        </ActionBtn>
                      )}

                      {!isDeleted && (
                        <ActionBtn
                          $variant="edit"
                          onClick={() =>
                            setEditingPrices(prev => ({
                              ...prev,
                              [service.id]: String(effectiveNet / 100),
                            }))
                          }
                          title="Edytuj cenę"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edytuj
                        </ActionBtn>
                      )}

                      {!isDeleted && (
                        <ActionBtn
                          $variant="delete"
                          onClick={() => handleDelete(service.id)}
                          title="Usuń"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Usuń
                        </ActionBtn>
                      )}
                    </ActionGroup>
                  </ServiceRow>
                );
              })}
            </ServicesList>

            {/* SMS notify */}
            <NotifyRow htmlFor="notify-sms">
              <NotifyCheckbox
                id="notify-sms"
                type="checkbox"
                checked={notifyCustomer}
                onChange={e => setNotifyCustomer(e.target.checked)}
              />
              <NotifyText>
                <NotifyTitle>Poinformuj klienta SMS-em o zmianach</NotifyTitle>
                {hasPendingChanges && (
                  <NotifyHint>Zmiany wymagają akceptacji klienta</NotifyHint>
                )}
              </NotifyText>
            </NotifyRow>

          </ModalContent>

          {/* ── Footer ── */}
          <ModalFooter>
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
