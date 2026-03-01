import { useEffect, useState } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import styled, { css } from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { ServiceAutocomplete } from '@/modules/checkin/components/ServiceAutocomplete';
import type { ServiceLineItem, ServiceStatus } from '../types';
import type { ServicesChangesPayload } from '../types';

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

/* ─── Overlay & shell ─────────────────────────────────────────────────────── */

const Overlay = styled.div<{ $contentLeft: number }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    left: ${props => props.$contentLeft}px;
  }
`;

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(2, 6, 23, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 680px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/* ─── Header ──────────────────────────────────────────────────────────────── */

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;

  svg {
    width: 18px;
    height: 18px;
    color: var(--brand-primary);
  }
`;

const HeaderText = styled.div``;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  letter-spacing: -0.02em;
  margin: 0 0 3px;
`;

const Subtitle = styled.p`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  margin: 0;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;

  svg { width: 16px; height: 16px; }

  &:hover {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
  }
`;

/* ─── Content ─────────────────────────────────────────────────────────────── */

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const AddSection = styled.div`
  padding: 16px 28px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: #fafbfc;
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${props => props.theme.colors.textMuted};
  margin-bottom: 8px;
`;

const ServicesList = styled.div`
  flex: 1;
`;

/* ─── Service row ─────────────────────────────────────────────────────────── */

type RowState = 'added' | 'pending' | 'deleted' | 'confirmed';

const accentColor = (state: RowState) => {
  switch (state) {
    case 'added':    return '#16a34a';
    case 'pending':  return '#d97706';
    case 'deleted':  return '#dc2626';
    default:         return '#e2e8f0';
  }
};

const rowBg = (state: RowState) => {
  switch (state) {
    case 'added':    return '#f0fdf4';
    case 'pending':  return '#fffbeb';
    case 'deleted':  return '#fafafa';
    default:         return '#fff';
  }
};

const ServiceRow = styled.div<{ $state: RowState }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 28px 12px 25px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${p => rowBg(p.$state)};
  opacity: ${p => p.$state === 'deleted' ? 0.7 : 1};
  position: relative;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${p => accentColor(p.$state)};
    border-radius: 0 2px 2px 0;
  }
`;

const ServiceInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ServiceTop = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  flex-wrap: wrap;
`;

const ServiceName = styled.span<{ $deleted?: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$deleted ? p.theme.colors.textMuted : p.theme.colors.text};
  text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
`;

const StateBadge = styled.span<{ $state: RowState }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  ${p => {
    switch (p.$state) {
      case 'added':    return css`background: #dcfce7; color: #166534;`;
      case 'pending':  return css`background: #fef3c7; color: #92400e;`;
      case 'deleted':  return css`background: #fee2e2; color: #991b1b;`;
      default:         return css`background: #f1f5f9; color: #475569;`;
    }
  }}
`;

const PriceRow = styled.div<{ $deleted?: boolean }>`
  font-size: 12px;
  color: ${p => p.$deleted ? p.theme.colors.textMuted : p.theme.colors.textSecondary};
  text-decoration: ${p => p.$deleted ? 'line-through' : 'none'};
`;

const PriceStrong = styled.span`
  font-weight: 600;
  color: inherit;
`;

const PriceSep = styled.span`
  margin: 0 5px;
  opacity: 0.4;
`;

const PriceInput = styled.input`
  width: 100px;
  padding: 5px 10px;
  background: #fff;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 7px;
  font-size: 12px;
  color: ${props => props.theme.colors.text};
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid ${p =>
    p.$variant === 'delete' ? '#fca5a5'
    : p.$variant === 'confirm' ? '#86efac'
    : p.theme.colors.border};
  background: ${p =>
    p.$variant === 'delete' ? '#fff1f2'
    : p.$variant === 'confirm' ? '#f0fdf4'
    : p.theme.colors.surface};
  color: ${p =>
    p.$variant === 'delete' ? '#dc2626'
    : p.$variant === 'confirm' ? '#16a34a'
    : p.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;

  svg { width: 14px; height: 14px; }

  &:hover {
    border-color: ${p =>
      p.$variant === 'delete' ? '#f87171'
      : p.$variant === 'confirm' ? '#4ade80'
      : 'var(--brand-primary)'};
    color: ${p =>
      p.$variant === 'delete' ? '#b91c1c'
      : p.$variant === 'confirm' ? '#15803d'
      : 'var(--brand-primary)'};
    background: ${p =>
      p.$variant === 'delete' ? '#fee2e2'
      : p.$variant === 'confirm' ? '#dcfce7'
      : '#eff6ff'};
  }
`;

/* ─── Notify section ──────────────────────────────────────────────────────── */

const NotifyRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 28px;
  border-top: 1px solid ${props => props.theme.colors.border};
  background: #fafbfc;
`;

const NotifyCheckbox = styled.input`
  width: 15px;
  height: 15px;
  margin-top: 2px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--brand-primary);
`;

const NotifyTextBlock = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
`;

const NotifyTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const NotifyHint = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
`;

/* ─── Footer ──────────────────────────────────────────────────────────────── */

const Footer = styled.div`
  padding: 16px 28px;
  border-top: 1px solid ${props => props.theme.colors.border};
  background: #fafbfc;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.colors.textSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
  }
`;

const SaveBtn = styled.button`
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: var(--brand-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover:not(:disabled) { opacity: 0.87; }
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
    setEditingPrices(prev => {
      const { [serviceId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleDelete = (serviceId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę usługę?')) return;
    const isTemp = serviceId.startsWith('temp-') || tempAdded.some(s => s.id === serviceId);
    if (isTemp) {
      setTempAdded(prev => prev.filter(s => s.id !== serviceId));
      return;
    }
    const current = services.find(s => s.id === serviceId);
    if (current) {
      setDeletedSnapshots(prev => ({ ...prev, [serviceId]: current }));
    }
  };

  const hasPendingChanges = services.some(s => s.hasPendingChange ?? s.status === 'PENDING');

  const handleServiceCreate = (service: {
    id?: string;
    name: string;
    basePriceNet: number;
    vatRate: number;
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

  /* Build merged list */
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
        <ModalContainer>

          {/* ── Header ── */}
          <Header>
            <HeaderLeft>
              <HeaderIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
              </HeaderIcon>
              <HeaderText>
                <Title>Zarządzanie usługami</Title>
                <Subtitle>
                  {totalCount}{' '}
                  {totalCount === 1 ? 'usługa' : totalCount < 5 ? 'usługi' : 'usług'}
                  {hasPendingChanges && ' · oczekuje na potwierdzenie'}
                </Subtitle>
              </HeaderText>
            </HeaderLeft>
            <CloseButton type="button" onClick={onClose} title="Zamknij">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </CloseButton>
          </Header>

          {/* ── Content ── */}
          <Content>

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

            {/* Services list */}
            <ServicesList>
              {allItems.map(service => {
                const isDeleted = !!deletedSnapshots[service.id];
                const isAdded   = tempAdded.some(t => t.id === service.id);
                const isPriceChanged = changedPriceIds.has(service.id);
                const isEditing = !isDeleted && editingPrices[service.id] !== undefined;

                const effectiveNet   = isEditing
                  ? Number(editingPrices[service.id]) * 100
                  : (localPriceOverrides[service.id] ?? service.finalPriceNet);
                const effectiveGross = Math.round(effectiveNet * (1 + (service.vatRate || 0) / 100));

                const rowState: RowState =
                  isDeleted ? 'deleted'
                  : isAdded  ? 'added'
                  : isPriceChanged || service.status === 'PENDING' ? 'pending'
                  : 'confirmed';

                const badgeLabel =
                  isDeleted   ? 'Usunięto'
                  : isAdded    ? 'Dodano'
                  : isPriceChanged ? 'Zmieniono cenę'
                  : service.status === 'PENDING' ? 'Oczekuje'
                  : 'Potwierdzona';

                return (
                  <ServiceRow key={service.id} $state={rowState}>
                    <ServiceInfo>
                      <ServiceTop>
                        <ServiceName $deleted={isDeleted}>
                          {service.serviceName}
                        </ServiceName>
                        <StateBadge $state={rowState}>
                          {badgeLabel}
                        </StateBadge>
                      </ServiceTop>

                      {isEditing ? (
                        <PriceInput
                          type="text"
                          inputMode="decimal"
                          value={editingPrices[service.id] ?? ''}
                          onChange={e => handlePriceChange(service.id, e.target.value)}
                          onBlur={() => handleSavePrice(service.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSavePrice(service.id);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <PriceRow $deleted={isDeleted}>
                          Netto <PriceStrong>{formatCurrency(effectiveNet / 100)}</PriceStrong>
                          <PriceSep>·</PriceSep>
                          Brutto <PriceStrong>{formatCurrency(effectiveGross / 100)}</PriceStrong>
                        </PriceRow>
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
                        </ActionBtn>
                      )}

                      {!isDeleted && (
                        <ActionBtn
                          $variant="delete"
                          onClick={() => handleDelete(service.id)}
                          title="Usuń usługę"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </ActionBtn>
                      )}
                    </ActionGroup>
                  </ServiceRow>
                );
              })}
            </ServicesList>

            {/* Notify customer */}
            <NotifyRow>
              <NotifyCheckbox
                id="notify-sms"
                type="checkbox"
                checked={notifyCustomer}
                onChange={e => setNotifyCustomer(e.target.checked)}
              />
              <NotifyTextBlock htmlFor="notify-sms">
                <NotifyTitle>Poinformuj klienta SMS-em o zmianach</NotifyTitle>
                {hasPendingChanges && (
                  <NotifyHint>Zmiany wymagają akceptacji klienta</NotifyHint>
                )}
              </NotifyTextBlock>
            </NotifyRow>
          </Content>

          {/* ── Footer ── */}
          <Footer>
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
          </Footer>

        </ModalContainer>
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
