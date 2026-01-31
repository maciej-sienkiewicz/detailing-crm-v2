// src/modules/appointments/components/VehicleModal.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { FormGrid, FieldGroup, Label, ErrorMessage } from '@/common/components/Form';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Divider } from '@/common/components/Divider';
import { t } from '@/common/i18n';
import type { Vehicle, SelectedVehicle } from '../types';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

const VehicleGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    max-height: 400px;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.xs};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: ${props => props.theme.spacing.lg};
    }
`;

const VehicleCard = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    background: linear-gradient(to bottom right, ${props => props.theme.colors.surface} 0%, ${props => props.theme.colors.surfaceAlt} 100%);

    &:hover {
        border-color: ${props => props.theme.colors.primary};
        background: linear-gradient(135deg, ${props => props.theme.colors.primary}10 0%, ${props => props.theme.colors.primary}05 100%);
        transform: translateY(-4px) scale(1.02);
        box-shadow: ${props => props.theme.shadows.lg};
    }

    &:active {
        transform: translateY(-2px) scale(1.01);
    }
`;

const VehicleName = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.md};
    letter-spacing: -0.02em;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const VehicleDetails = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
    align-items: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.md};
    }
`;

const VehicleDetail = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    font-weight: ${props => props.theme.fontWeights.medium};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
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

    const modalTitle = showNewForm
        ? t.appointments.vehicleModal.titleNew
        : t.appointments.vehicleModal.titleSelect;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="700px">
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
                            <BrandSelect
                                value={formData.brand}
                                onChange={(val) =>
                                    setFormData({ ...formData, brand: val, model: '' })
                                }
                            />
                            {errors.brand && <ErrorMessage>{errors.brand}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.appointments.vehicleModal.model}</Label>
                            <ModelSelect
                                brand={formData.brand}
                                value={formData.model}
                                onChange={(val) =>
                                    setFormData({ ...formData, model: val })
                                }
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
        </Modal>
    );
};