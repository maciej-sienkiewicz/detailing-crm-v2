import { useState } from 'react';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import styled, { css } from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem, ServiceStatus } from '../types';

interface EditServicesModalProps {
  isOpen: boolean;
  services: ServiceLineItem[];
  onClose: () => void;
  onAddService: (
    service: { id?: string; name: string; basePriceNet: number; vatRate: number },
    notifyCustomer: boolean
  ) => void;
  onUpdateService: (serviceId: string, price: number, notifyCustomer: boolean) => void;
  onDeleteService: (serviceId: string, notifyCustomer: boolean) => void;
  onUpdateServiceStatus: (serviceId: string, status: ServiceStatus) => void;
}

// Styled Components
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
  padding: 16px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);

  /* On desktop, align overlay to content area (exclude sidebar width) */
  @media (min-width: ${props => props.theme.breakpoints.md}) {
    left: ${props => props.$contentLeft}px;
  }
`;

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.2);
  width: 100%;
  max-width: 64rem; /* ~ max-w-4xl */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  position: relative;
  padding: 24px 32px 16px 32px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DragHandle = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`;

const DragBar = styled.div`
  width: 48px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 9999px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 8px;
  color: #9ca3af;
  border-radius: 9999px;
  transition: all 0.15s ease;

  &:hover {
    color: #4b5563;
    background: #f3f4f6;
  }

  svg { width: 24px; height: 24px; }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
`;

const Subtitle = styled.p`
  margin-top: 4px;
  font-size: 0.875rem;
  color: #6b7280;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ServiceCard = styled.div<{ $pending: boolean }>`
  padding: 16px;
  border-radius: 16px;
  border: 2px solid;
  border-color: ${p => (p.$pending ? '#fcd34d' : '#e5e7eb')};
  background: ${p => (p.$pending ? '#fffbeb' : '#fff')};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${p => (p.$pending ? '#fcd34d' : '#d1d5db')};
  }
`;

const ServiceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ServiceInfo = styled.div`
  flex: 1;
`;

const ServiceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const ServiceName = styled.h3`
  font-weight: 600;
  color: #111827;
`;

const StatusChip = styled.span<{ $pending: boolean }>`
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  ${p =>
    p.$pending
      ? css`
          background: #fef3c7;
          color: #92400e;
        `
      : css`
          background: #d1fae5;
          color: #065f46;
        `}
`;

const PriceText = styled.p`
  font-size: 0.875rem;
  color: #4b5563;

  .strong { font-weight: 600; color: #111827; }
`;

const PriceInput = styled.input`
  width: 8rem;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  font-size: 0.875rem;
  outline: none;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconButton = styled.button<{ $variant?: 'blue' | 'red' | 'green' }>`
  padding: 8px;
  border-radius: 10px;
  transition: background 0.15s ease, color 0.15s ease;
  color: ${p =>
    p.$variant === 'red' ? '#dc2626' : p.$variant === 'green' ? '#059669' : '#2563eb'};
  background: ${p =>
    p.$variant === 'red' ? '#fee2e2' : p.$variant === 'green' ? '#ecfdf5' : '#eff6ff'};

  &:hover {
    background: ${p =>
      p.$variant === 'red' ? '#fecaca' : p.$variant === 'green' ? '#d1fae5' : '#dbeafe'};
  }

  svg { width: 20px; height: 20px; }
`;

const AddServiceButton = styled.button`
  width: 100%;
  padding: 16px;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  color: #4b5563;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.15s ease;

  &:hover {
    border-color: #60a5fa;
    color: #2563eb;
    background: #eff6ff;
  }

  svg { width: 20px; height: 20px; }
`;

const NotifyBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 16px;
`;

const NotifyLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
`;

const NotifyText = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
`;

const NotifyHint = styled.p`
  margin-top: 4px;
  font-size: 0.75rem;
  color: #4b5563;
`;

const Footer = styled.div`
  padding: 24px 32px;
  border-top: 1px solid ${props => props.theme.colors.border};
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 12px;
`;

const CloseSecondary = styled.button`
  padding: 10px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  border-radius: 9999px;
  transition: background 0.15s ease;

  &:hover { background: #f3f4f6; }
`;

export const EditServicesModal = ({
  isOpen,
  services,
  onClose,
  onAddService,
  onUpdateService,
  onDeleteService,
  onUpdateServiceStatus,
}: EditServicesModalProps) => {
  const { isCollapsed } = useSidebar();
  const contentLeft = typeof window !== 'undefined' ? (isCollapsed ? 64 : 240) : 0;
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);

  if (!isOpen) return null;

  const handlePriceChange = (serviceId: string, value: string) => {
    const numValue = parseFloat(value) * 100; // Convert to cents
    if (!isNaN(numValue)) {
      setEditingPrices((prev) => ({ ...prev, [serviceId]: numValue }));
    }
  };

  const handleSavePrice = (serviceId: string) => {
    const newPrice = editingPrices[serviceId];
    if (newPrice !== undefined) {
      onUpdateService(serviceId, newPrice, notifyCustomer);
      setEditingPrices((prev) => {
        const { [serviceId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleDelete = (serviceId: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę usługę?')) {
      onDeleteService(serviceId, notifyCustomer);
    }
  };

  const hasPendingChanges = services.some((s) => s.status === 'PENDING');

  const handleServiceCreate = (service: {
    id?: string;
    name: string;
    basePriceNet: number;
    vatRate: number;
  }) => {
    onAddService(service, notifyCustomer);
    setIsQuickServiceModalOpen(false);
  };

  return (
    <>
      <Overlay $contentLeft={contentLeft} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <ModalContainer>
          <Header>
            <DragHandle>
              <DragBar />
            </DragHandle>

            <CloseButton type="button" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </CloseButton>

            <Title>Zarządzanie usługami</Title>
            <Subtitle>
              {services.length} {services.length === 1 ? 'usługa' : services.length < 5 ? 'usługi' : 'usług'}
              {hasPendingChanges && ' • Zawiera usługi oczekujące na potwierdzenie'}
            </Subtitle>
          </Header>

          <Content>
            {services.map((service) => {
              const isEditing = editingPrices[service.id] !== undefined;
              const displayPrice = isEditing
                ? editingPrices[service.id] / 100
                : service.finalPriceNet / 100;

              return (
                <ServiceCard key={service.id} $pending={service.status === 'PENDING'}>
                  <ServiceRow>
                    <ServiceInfo>
                      <ServiceHeader>
                        <ServiceName>{service.serviceName}</ServiceName>
                        <StatusChip $pending={service.status === 'PENDING'}>
                          {service.status === 'PENDING' ? 'Oczekuje' : 'Potwierdzona'}
                        </StatusChip>
                      </ServiceHeader>

                      {isEditing ? (
                        <PriceInput
                          type="number"
                          step="0.01"
                          value={displayPrice}
                          onChange={(e) => handlePriceChange(service.id, e.target.value)}
                          onBlur={() => handleSavePrice(service.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSavePrice(service.id);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <PriceText>
                          Netto: <span className="strong">{formatCurrency(service.finalPriceNet / 100)}</span> • Brutto:{' '}
                          <span className="strong">{formatCurrency(service.finalPriceGross / 100)}</span>
                        </PriceText>
                      )}
                    </ServiceInfo>

                    <Actions>
                      {service.status === 'PENDING' && (
                        <IconButton
                          $variant="green"
                          onClick={() => onUpdateServiceStatus(service.id, 'CONFIRMED')}
                          title="Zatwierdź ręcznie"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </IconButton>
                      )}

                      <IconButton
                        $variant="blue"
                        onClick={() =>
                          setEditingPrices((prev) => ({ ...prev, [service.id]: service.finalPriceNet }))
                        }
                        title="Edytuj cenę"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </IconButton>

                      <IconButton $variant="red" onClick={() => handleDelete(service.id)} title="Usuń usługę">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </IconButton>
                    </Actions>
                  </ServiceRow>
                </ServiceCard>
              );
            })}

            <AddServiceButton onClick={() => setIsQuickServiceModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Dodaj usługę
            </AddServiceButton>

            <NotifyBox>
              <NotifyLabel>
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16 }}
                />
                <div style={{ flex: 1 }}>
                  <NotifyText>Poinformuj klienta SMS-em o zmianach w usługach</NotifyText>
                  {hasPendingChanges && (
                    <NotifyHint>⚠️ Zmiany wymagają akceptacji klienta</NotifyHint>
                  )}
                </div>
              </NotifyLabel>
            </NotifyBox>
          </Content>

          <Footer>
            <CloseSecondary type="button" onClick={onClose}>
              Zamknij
            </CloseSecondary>
          </Footer>
        </ModalContainer>
      </Overlay>

      {/* QuickServiceModal with higher z-index */}
      <div style={{ zIndex: 1100 }}>
        <QuickServiceModal
          isOpen={isQuickServiceModalOpen}
          onClose={() => setIsQuickServiceModalOpen(false)}
          onServiceCreate={handleServiceCreate}
        />
      </div>
    </>
  );
};
