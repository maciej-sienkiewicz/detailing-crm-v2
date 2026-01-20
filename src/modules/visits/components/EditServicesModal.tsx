import { useState } from 'react';
import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem, ServiceStatus } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: ${props => props.theme.spacing.md};
`;

const ModalContainer = styled.div`
    background: white;
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    padding: ${props => props.theme.spacing.xs};
    line-height: 1;
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.xl};
    overflow-y: auto;
    flex: 1;
`;

const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const ServiceItem = styled.div<{ $status: ServiceStatus }>`
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.$status === 'PENDING' ? '#f59e0b' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$status === 'PENDING' ? '#fffbeb' : 'white'};
    display: flex;
    gap: ${props => props.theme.spacing.md};
    align-items: center;
`;

const ServiceInfo = styled.div`
    flex: 1;
`;

const ServiceName = styled.div`
    font-weight: 600;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    margin-bottom: 4px;
`;

const ServicePrice = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const ServiceActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
`;

const IconButton = styled.button<{ $variant?: 'danger' | 'success' | 'warning' }>`
    padding: ${props => props.theme.spacing.xs};
    border: none;
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => {
        if (props.$variant === 'danger') return '#fee2e2';
        if (props.$variant === 'success') return '#dcfce7';
        if (props.$variant === 'warning') return '#fef3c7';
        return props.theme.colors.surfaceAlt;
    }};
    color: ${props => {
        if (props.$variant === 'danger') return '#dc2626';
        if (props.$variant === 'success') return '#16a34a';
        if (props.$variant === 'warning') return '#ca8a04';
        return props.theme.colors.text;
    }};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: ${props => props.theme.fontSizes.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;

    &:hover {
        opacity: 0.8;
        transform: scale(1.05);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const StatusBadge = styled.div<{ $status: ServiceStatus }>`
    padding: 4px 12px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    background: ${props => props.$status === 'PENDING' ? '#fef3c7' : '#dcfce7'};
    color: ${props => props.$status === 'PENDING' ? '#92400e' : '#166534'};
`;

const AddServiceSection = styled.div`
    padding: ${props => props.theme.spacing.md};
    border: 2px dashed ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.theme.colors.surfaceAlt};
`;

const AddButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: var(--brand-primary);
    color: white;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const NotificationSection = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid #3b82f6;
    border-radius: ${props => props.theme.radii.md};
    margin-top: ${props => props.theme.spacing.lg};
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    cursor: pointer;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const Checkbox = styled.input`
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--brand-primary);
`;

const ModalFooter = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-top: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    display: flex;
    gap: ${props => props.theme.spacing.md};
    justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => props.$variant === 'secondary' ? `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 2px solid ${props.theme.colors.border};

        &:hover {
            background: ${props.theme.colors.surfaceHover};
        }
    ` : `
        background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover {
            box-shadow: ${props.theme.shadows.lg};
            transform: translateY(-1px);
        }
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const EditInput = styled.input`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    width: 120px;
`;

interface EditServicesModalProps {
    isOpen: boolean;
    services: ServiceLineItem[];
    onClose: () => void;
    onAddService: (service: { id?: string; name: string; basePriceNet: number; vatRate: number }, notifyCustomer: boolean) => void;
    onUpdateService: (serviceId: string, price: number, notifyCustomer: boolean) => void;
    onDeleteService: (serviceId: string, notifyCustomer: boolean) => void;
    onUpdateServiceStatus: (serviceId: string, status: ServiceStatus) => void;
}

export const EditServicesModal = ({
    isOpen,
    services,
    onClose,
    onAddService,
    onUpdateService,
    onDeleteService,
    onUpdateServiceStatus,
}: EditServicesModalProps) => {
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);

    if (!isOpen) return null;

    const handlePriceChange = (serviceId: string, value: string) => {
        const numValue = parseFloat(value) * 100; // Convert to cents
        if (!isNaN(numValue)) {
            setEditingPrices(prev => ({ ...prev, [serviceId]: numValue }));
        }
    };

    const handleSavePrice = (serviceId: string) => {
        const newPrice = editingPrices[serviceId];
        if (newPrice !== undefined) {
            onUpdateService(serviceId, newPrice, notifyCustomer);
            setEditingPrices(prev => {
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

    const hasPendingChanges = services.some(s => s.status === 'PENDING');

    const handleServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: number }) => {
        onAddService(service, notifyCustomer);
        setIsQuickServiceModalOpen(false);
    };

    return (
        <>
            <Overlay onClick={onClose}>
                <ModalContainer onClick={(e) => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle>Zarządzanie usługami</ModalTitle>
                        <CloseButton onClick={onClose}>×</CloseButton>
                    </ModalHeader>

                <ModalBody>
                    <ServicesList>
                        {services.map(service => {
                            const isEditing = editingPrices[service.id] !== undefined;
                            const displayPrice = isEditing
                                ? editingPrices[service.id] / 100
                                : service.finalPriceNet / 100;

                            return (
                                <ServiceItem key={service.id} $status={service.status}>
                                    <ServiceInfo>
                                        <ServiceName>{service.serviceName}</ServiceName>
                                        {isEditing ? (
                                            <EditInput
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
                                            <ServicePrice>
                                                Netto: {formatCurrency(service.finalPriceNet / 100)} •
                                                Brutto: {formatCurrency(service.finalPriceGross / 100)}
                                            </ServicePrice>
                                        )}
                                    </ServiceInfo>
                                    <StatusBadge $status={service.status}>
                                        {service.status === 'PENDING' ? 'Oczekuje' : 'Potwierdzona'}
                                    </StatusBadge>
                                    <ServiceActions>
                                        {service.status === 'PENDING' && (
                                            <IconButton
                                                $variant="success"
                                                onClick={() => onUpdateServiceStatus(service.id, 'CONFIRMED')}
                                                title="Zatwierdź ręcznie"
                                            >
                                                ✓
                                            </IconButton>
                                        )}
                                        <IconButton
                                            onClick={() => setEditingPrices(prev => ({ ...prev, [service.id]: service.finalPriceNet }))}
                                            title="Edytuj cenę"
                                        >
                                            ✏️
                                        </IconButton>
                                        <IconButton
                                            $variant="danger"
                                            onClick={() => handleDelete(service.id)}
                                            title="Usuń usługę"
                                        >
                                            🗑️
                                        </IconButton>
                                    </ServiceActions>
                                </ServiceItem>
                            );
                        })}
                    </ServicesList>

                    <AddServiceSection>
                        <AddButton onClick={() => setIsQuickServiceModalOpen(true)}>
                            + Dodaj usługę
                        </AddButton>
                    </AddServiceSection>

                    <NotificationSection>
                        <CheckboxLabel>
                            <Checkbox
                                type="checkbox"
                                checked={notifyCustomer}
                                onChange={(e) => setNotifyCustomer(e.target.checked)}
                            />
                            <span>
                                Poinformuj klienta SMS-em o zmianach w usługach
                                {hasPendingChanges && ' (wymagana akceptacja klienta)'}
                            </span>
                        </CheckboxLabel>
                    </NotificationSection>
                </ModalBody>

                <ModalFooter>
                    <Button $variant="secondary" onClick={onClose}>
                        Zamknij
                    </Button>
                </ModalFooter>
            </ModalContainer>
        </Overlay>

        <QuickServiceModal
            isOpen={isQuickServiceModalOpen}
            onClose={() => setIsQuickServiceModalOpen(false)}
            onServiceCreate={handleServiceCreate}
        />
        </>
    );
};
