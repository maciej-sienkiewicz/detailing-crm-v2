// src/modules/appointments/components/VehicleModal.tsx
import styled from 'styled-components';
import { useState } from 'react';
import { t } from '@/common/i18n';
import type { Vehicle, SelectedVehicle } from '../types';

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

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }
`;

const ModalContainer = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const ModalTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    padding: ${props => props.theme.spacing.sm};
    line-height: 1;
    transition: color ${props => props.theme.transitions.fast};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.lg};
    overflow-y: auto;
    flex: 1;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const VehicleGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const VehicleCard = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        border-color: ${props => props.theme.colors.primary};
        background-color: ${props => props.theme.colors.surfaceHover};
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const VehicleName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const VehicleDetails = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.md};
    }
`;

const VehicleDetail = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    margin-top: ${props => props.theme.spacing.lg};
    flex-direction: column;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    flex: 1;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    }

    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover {
            transform: translateY(-2px);
            box-shadow: ${props.theme.shadows.lg};
        }
    ` : `
        background-color: ${props.theme.colors.surface};
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            background-color: ${props.theme.colors.surfaceHover};
        }
    `}
`;

const FormGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const ErrorMessage = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.error};
`;

const Divider = styled.div`
    height: 1px;
    background-color: ${props => props.theme.colors.border};
    margin: ${props => props.theme.spacing.lg} 0;
`;

interface VehicleModalProps {
    isOpen: boolean;
    vehicles: Vehicle[];
    onClose: () => void;
    onSelect: (vehicle: SelectedVehicle) => void;
    allowSkip?: boolean;
}

export const VehicleModal = ({ isOpen, vehicles, onClose, onSelect, allowSkip = false }: VehicleModalProps) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleVehicleClick = (vehicle: Vehicle) => {
        onSelect({
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            isNew: false,
        });
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.brand || formData.brand.length < 2) {
            newErrors.brand = t.appointments.validation.brandMinLength;
        }
        if (!formData.model || formData.model.length < 1) {
            newErrors.model = t.appointments.validation.modelRequired;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;

        onSelect({
            ...formData,
            isNew: true,
        });
        onClose();
    };

    const handleSkip = () => {
        onSelect({
            brand: '',
            model: '',
            isNew: false,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>
                        {showNewForm ? t.appointments.vehicleModal.titleNew : t.appointments.vehicleModal.titleSelect}
                    </ModalTitle>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </ModalHeader>

                <ModalBody>
                    {!showNewForm ? (
                        <>
                            {vehicles.length > 0 && (
                                <>
                                    <VehicleGrid>
                                        {vehicles.map((vehicle) => (
                                            <VehicleCard
                                                key={vehicle.id}
                                                onClick={() => handleVehicleClick(vehicle)}
                                            >
                                                <VehicleName>
                                                    {vehicle.brand} {vehicle.model}
                                                </VehicleName>
                                                <VehicleDetails>
                                                    <VehicleDetail>{t.appointments.vehicleModal.year}: {vehicle.year}</VehicleDetail>
                                                    <VehicleDetail>•</VehicleDetail>
                                                    <VehicleDetail>{vehicle.licensePlate}</VehicleDetail>
                                                </VehicleDetails>
                                            </VehicleCard>
                                        ))}
                                    </VehicleGrid>
                                    <Divider />
                                </>
                            )}

                            <ButtonGroup>
                                <Button $variant="primary" onClick={() => setShowNewForm(true)}>
                                    {t.appointments.vehicleModal.addNewButton}
                                </Button>
                                {allowSkip && (
                                    <Button $variant="secondary" onClick={handleSkip}>
                                        {t.appointments.vehicleModal.skip}
                                    </Button>
                                )}
                            </ButtonGroup>
                        </>
                    ) : (
                        <>
                            <FormGrid>
                                <FieldGroup>
                                    <Label>{t.appointments.vehicleModal.brand}</Label>
                                    <Input
                                        value={formData.brand}
                                        onChange={(e) =>
                                            setFormData({ ...formData, brand: e.target.value })
                                        }
                                        placeholder={t.appointments.vehicleModal.brandPlaceholder}
                                    />
                                    {errors.brand && <ErrorMessage>{errors.brand}</ErrorMessage>}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.appointments.vehicleModal.model}</Label>
                                    <Input
                                        value={formData.model}
                                        onChange={(e) =>
                                            setFormData({ ...formData, model: e.target.value })
                                        }
                                        placeholder={t.appointments.vehicleModal.modelPlaceholder}
                                    />
                                    {errors.model && <ErrorMessage>{errors.model}</ErrorMessage>}
                                </FieldGroup>
                            </FormGrid>

                            <ButtonGroup>
                                <Button $variant="secondary" onClick={() => setShowNewForm(false)}>
                                    {t.appointments.vehicleModal.cancelButton}
                                </Button>
                                <Button $variant="primary" onClick={handleSubmitNew}>
                                    {t.appointments.vehicleModal.confirmButton}
                                </Button>
                            </ButtonGroup>
                        </>
                    )}
                </ModalBody>
            </ModalContainer>
        </Overlay>
    );
};